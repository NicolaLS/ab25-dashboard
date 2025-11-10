package api_test

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/adopting-bitcoin/dashboard/internal/api"
	"github.com/adopting-bitcoin/dashboard/internal/config"
	"github.com/adopting-bitcoin/dashboard/internal/ingest"
	"github.com/adopting-bitcoin/dashboard/internal/store"
)

func setupTestServer(t *testing.T) (*api.Server, *store.Store) {
	t.Helper()
	st, err := store.New(":memory:")
	if err != nil {
		t.Fatalf("create store: %v", err)
	}
	if err := st.Init(context.Background()); err != nil {
		t.Fatalf("init store: %v", err)
	}

	cfg := config.Config{
		AdminToken:              "test-token",
		RateWindow:              5 * time.Minute,
		TickerLimit:             20,
		DefaultLeaderboardLimit: 10,
		CORSOrigins:             []string{"*"},
	}

	logger := log.New(os.Stderr, "[test] ", log.LstdFlags)
	poller := ingest.NewPoller(st, ingest.Config{
		Interval:    time.Hour, // Long interval for testing
		Concurrency: 1,
		Timeout:     10 * time.Second,
		BaseURL:     "http://localhost",
	}, logger)

	server := api.NewServer(cfg, st, poller, logger)

	t.Cleanup(func() {
		st.Close()
	})

	return server, st
}

func TestHealthEndpoint(t *testing.T) {
	server, _ := setupTestServer(t)

	req := httptest.NewRequest(http.MethodGet, "/v1/health", nil)
	w := httptest.NewRecorder()

	server.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response map[string]string
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if response["status"] != "ok" {
		t.Errorf("expected status ok, got %s", response["status"])
	}
}

func TestSummaryEndpoint(t *testing.T) {
	server, st := setupTestServer(t)
	ctx := context.Background()

	// Add a test merchant
	merchant := store.Merchant{
		ID:        "test-merchant",
		PublicKey: "test-key",
		Alias:     "Test Merchant",
		Enabled:   true,
	}
	if err := st.UpsertMerchant(ctx, merchant); err != nil {
		t.Fatalf("upsert merchant: %v", err)
	}

	// Add some test transactions
	txs := []store.TransactionInput{
		{SaleID: 1, SaleOrigin: "pos", SaleDate: time.Now(), AmountSats: 1000},
		{SaleID: 2, SaleOrigin: "pos", SaleDate: time.Now(), AmountSats: 2000},
	}
	if _, err := st.RecordTransactions(ctx, "test-merchant", txs); err != nil {
		t.Fatalf("record transactions: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/v1/summary", nil)
	w := httptest.NewRecorder()

	server.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var summary struct {
		TotalTransactions int64 `json:"total_transactions"`
		TotalVolumeSats   int64 `json:"total_volume_sats"`
	}
	if err := json.NewDecoder(w.Body).Decode(&summary); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if summary.TotalTransactions != 2 {
		t.Errorf("expected 2 transactions, got %d", summary.TotalTransactions)
	}
	if summary.TotalVolumeSats != 3000 {
		t.Errorf("expected 3000 sats, got %d", summary.TotalVolumeSats)
	}
}

func TestTickerEndpoint(t *testing.T) {
	server, st := setupTestServer(t)
	ctx := context.Background()

	// Add a test merchant
	merchant := store.Merchant{
		ID:        "test-merchant",
		PublicKey: "test-key",
		Alias:     "Test Merchant",
		Enabled:   true,
	}
	if err := st.UpsertMerchant(ctx, merchant); err != nil {
		t.Fatalf("upsert merchant: %v", err)
	}

	// Add test transactions
	txs := []store.TransactionInput{
		{SaleID: 1, SaleOrigin: "pos", SaleDate: time.Now(), AmountSats: 1000},
		{SaleID: 2, SaleOrigin: "pos", SaleDate: time.Now(), AmountSats: 2000},
	}
	if _, err := st.RecordTransactions(ctx, "test-merchant", txs); err != nil {
		t.Fatalf("record transactions: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/v1/ticker?limit=5", nil)
	w := httptest.NewRecorder()

	server.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var ticker []map[string]any
	if err := json.NewDecoder(w.Body).Decode(&ticker); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if len(ticker) != 2 {
		t.Errorf("expected 2 ticker entries, got %d", len(ticker))
	}
}

func TestAdminAuthMiddleware(t *testing.T) {
	server, _ := setupTestServer(t)

	tests := []struct {
		name       string
		token      string
		wantStatus int
	}{
		{
			name:       "valid token",
			token:      "test-token",
			wantStatus: http.StatusOK,
		},
		{
			name:       "invalid token",
			token:      "wrong-token",
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "missing token",
			token:      "",
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/v1/admin/merchants", nil)
			if tt.token != "" {
				req.Header.Set("Authorization", "Bearer "+tt.token)
			}
			w := httptest.NewRecorder()

			server.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("expected status %d, got %d", tt.wantStatus, w.Code)
			}
		})
	}
}

func TestMerchantLeaderboardWindow(t *testing.T) {
	server, st := setupTestServer(t)
	ctx := context.Background()

	// Add test merchant
	merchant := store.Merchant{
		ID:        "test-merchant",
		PublicKey: "test-key",
		Alias:     "Test Merchant",
		Enabled:   true,
	}
	if err := st.UpsertMerchant(ctx, merchant); err != nil {
		t.Fatalf("upsert merchant: %v", err)
	}

	// Add test transactions
	txs := []store.TransactionInput{
		{SaleID: 1, SaleOrigin: "pos", SaleDate: time.Now(), AmountSats: 1000},
	}
	if _, err := st.RecordTransactions(ctx, "test-merchant", txs); err != nil {
		t.Fatalf("record transactions: %v", err)
	}

	tests := []struct {
		name       string
		window     string
		wantStatus int
	}{
		{
			name:       "all time window",
			window:     "all",
			wantStatus: http.StatusOK,
		},
		{
			name:       "5 minute window",
			window:     "5m",
			wantStatus: http.StatusOK,
		},
		{
			name:       "invalid window",
			window:     "invalid",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/v1/leaderboard/merchants?window="+tt.window, nil)
			w := httptest.NewRecorder()

			server.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("expected status %d, got %d", tt.wantStatus, w.Code)
			}
		})
	}
}

func TestRequestSizeLimit(t *testing.T) {
	server, _ := setupTestServer(t)

	// Create a payload larger than 1MB
	largePayload := strings.Repeat("a", 2*1024*1024)
	body := strings.NewReader(`{"token":"` + largePayload + `"}`)

	req := httptest.NewRequest(http.MethodPost, "/v1/admin/auth/login", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	server.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400 for oversized request, got %d", w.Code)
	}
}

func TestEmptySlicesReturnArray(t *testing.T) {
	server, _ := setupTestServer(t)

	req := httptest.NewRequest(http.MethodGet, "/v1/ticker", nil)
	w := httptest.NewRecorder()

	server.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	body := w.Body.String()
	// Should be [] not null
	if body != "[]\n" {
		t.Errorf("expected empty array [], got %s", body)
	}
}
