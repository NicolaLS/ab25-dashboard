package ingest

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"path"
	"strings"
	"time"

	"github.com/shopspring/decimal"

	"github.com/adopting-bitcoin/dashboard/internal/store"
)

// Config contains poller tunables.
type Config struct {
	Interval    time.Duration
	Concurrency int
	Timeout     time.Duration
	BaseURL     string
}

// Poller fetches merchant data on a schedule and stores it.
type Poller struct {
	store       *store.Store
	client      *http.Client
	interval    time.Duration
	concurrency int
	baseURL     string
	logger      *log.Logger
}

// NewPoller returns a configured poller.
func NewPoller(st *store.Store, cfg Config, logger *log.Logger) *Poller {
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = 10 * time.Second
	}
	interval := cfg.Interval
	if interval <= 0 {
		interval = time.Minute
	}
	concurrency := cfg.Concurrency
	if concurrency <= 0 {
		concurrency = 5
	}
	base := cfg.BaseURL
	if base == "" {
		base = "https://api.paywithflash.com"
	}
	return &Poller{
		store:       st,
		client:      &http.Client{Timeout: timeout},
		interval:    interval,
		concurrency: concurrency,
		baseURL:     strings.TrimRight(base, "/"),
		logger:      logger,
	}
}

// Start begins background polling until ctx is cancelled.
func (p *Poller) Start(ctx context.Context) {
	if p.interval <= 0 {
		p.logger.Println("poller disabled: interval <= 0")
		return
	}
	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()
	p.logger.Printf("poller started (interval=%s)\n", p.interval)
	for {
		select {
		case <-ctx.Done():
			p.logger.Println("poller stopped")
			return
		case <-ticker.C:
			if err := p.pollAll(ctx); err != nil {
				p.logger.Printf("poller cycle error: %v\n", err)
			}
		}
	}
}

// pollAll fetches enabled merchants concurrently using a worker pool.
func (p *Poller) pollAll(ctx context.Context) error {
	merchants, err := p.store.ListMerchants(ctx, true)
	if err != nil {
		return err
	}
	if len(merchants) == 0 {
		return nil
	}

	// Create buffered channel for merchant work
	work := make(chan store.Merchant, len(merchants))
	for _, m := range merchants {
		work <- m
	}
	close(work)

	// Start worker pool
	type result struct {
		merchantID string
		err        error
	}
	results := make(chan result, len(merchants))
	workers := p.concurrency
	if workers > len(merchants) {
		workers = len(merchants)
	}

	for i := 0; i < workers; i++ {
		go func() {
			for merchant := range work {
				err := p.pollMerchant(ctx, merchant)
				results <- result{merchantID: merchant.ID, err: err}
			}
		}()
	}

	// Collect results
	for i := 0; i < len(merchants); i++ {
		res := <-results
		if res.err != nil {
			p.logger.Printf("merchant %s poll failed: %v\n", res.merchantID, res.err)
		}
	}
	close(results)

	return nil
}

// RefreshMerchant forces a poll for a single merchant.
func (p *Poller) RefreshMerchant(ctx context.Context, merchantID string) error {
	m, err := p.store.GetMerchant(ctx, merchantID)
	if err != nil {
		return err
	}
	return p.pollMerchant(ctx, m)
}

func (p *Poller) pollMerchant(ctx context.Context, merchant store.Merchant) error {
	reqCtx, cancel := context.WithTimeout(ctx, p.client.Timeout)
	defer cancel()
	payload, err := p.fetch(reqCtx, merchant)
	if err != nil {
		return err
	}
	txs := make([]store.TransactionInput, 0, len(payload.Sales))
	for _, sale := range payload.Sales {
		saleDate, err := time.Parse(time.RFC3339Nano, sale.SaleDate)
		if err != nil {
			return fmt.Errorf("parse sale date: %w", err)
		}
		amount, err := parseSats(sale.TotalCostSats)
		if err != nil {
			return fmt.Errorf("parse sats: %w", err)
		}
		txs = append(txs, store.TransactionInput{
			SaleID:     sale.SaleId,
			SaleOrigin: sale.SaleOrigin,
			SaleDate:   saleDate,
			AmountSats: amount,
			Source:     store.SourcePayWithFlash,
		})
	}
	inserted, err := p.store.RecordTransactions(ctx, merchant.ID, txs)
	if err != nil {
		return err
	}

	snapshots := make([]store.ProductSnapshot, 0, len(payload.Products))
	for _, prod := range payload.Products {
		revenue, err := parseSats(prod.TotalRevenueSats)
		if err != nil {
			return fmt.Errorf("parse product revenue: %w", err)
		}
		snapshots = append(snapshots, store.ProductSnapshot{
			ProductID:         prod.ProductID,
			Name:              prod.Name,
			Currency:          prod.Currency,
			Price:             prod.Price,
			TotalTransactions: prod.TotalTransactions,
			TotalRevenueSats:  revenue,
			Active:            prod.ActiveStatus,
		})
	}
	if err := p.store.UpsertProducts(ctx, merchant.ID, snapshots); err != nil {
		return err
	}
	if err := p.store.UpdateMerchantPollTime(ctx, merchant.ID, time.Now().UTC()); err != nil {
		return err
	}
	if _, err := p.store.ProcessMilestones(ctx); err != nil {
		return err
	}
	p.logger.Printf("merchant %s poll complete (new_tx=%d)\n", merchant.ID, inserted)
	return nil
}

func (p *Poller) fetch(ctx context.Context, merchant store.Merchant) (sourceData, error) {
	var out sourceData
	base, err := url.Parse(p.baseURL)
	if err != nil {
		return out, err
	}
	base.Path = path.Join(base.Path, "user-pos", merchant.ID)
	q := base.Query()
	q.Set("user_public_key", merchant.PublicKey)
	base.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, base.String(), nil)
	if err != nil {
		return out, err
	}
	resp, err := p.client.Do(req)
	if err != nil {
		return out, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return out, fmt.Errorf("upstream responded %s", resp.Status)
	}
	var envelope sourceEnvelope
	if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
		return out, err
	}
	return envelope.Data, nil
}

type sourceEnvelope struct {
	Data sourceData `json:"data"`
}

type sourceData struct {
	ID       int64           `json:"id"`
	Name     string          `json:"name"`
	Products []sourceProduct `json:"products"`
	Sales    []sourceSale    `json:"sales"`
}

type sourceProduct struct {
	ProductID         int64  `json:"productid"`
	Name              string `json:"name"`
	Currency          string `json:"currency"`
	Price             string `json:"price"`
	TotalTransactions int64  `json:"total_transactions"`
	TotalRevenueSats  string `json:"total_revenue_sats"`
	ActiveStatus      bool   `json:"activestatus"`
}

type sourceSale struct {
	SaleId        int64  `json:"SaleId"`
	SaleOrigin    string `json:"SaleOrigin"`
	SaleDate      string `json:"SaleDate"`
	TotalCostSats string `json:"TotalCostSats"`
}

func parseSats(val string) (int64, error) {
	val = strings.TrimSpace(val)
	if val == "" {
		return 0, nil
	}
	dec, err := decimal.NewFromString(val)
	if err != nil {
		return 0, err
	}
	return dec.Round(0).IntPart(), nil
}
