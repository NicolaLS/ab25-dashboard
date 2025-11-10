package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

// Merchant represents a merchant configuration stored in SQLite.
type Merchant struct {
	ID           string     `json:"id"`
	PublicKey    string     `json:"public_key"`
	Alias        string     `json:"alias"`
	Enabled      bool       `json:"enabled"`
	LastPolledAt *time.Time `json:"last_polled_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// TransactionInput represents a sale from the upstream API.
type TransactionInput struct {
	SaleID     int64
	SaleOrigin string
	SaleDate   time.Time
	AmountSats int64
}

// ProductSnapshot captures the upstream per-product cumulative stats.
type ProductSnapshot struct {
	ProductID         int64
	Name              string
	Currency          string
	Price             string
	TotalTransactions int64
	TotalRevenueSats  int64
	Active            bool
}

// Summary aggregates dashboard headline metrics.
type Summary struct {
	TotalTransactions     int64   `json:"total_transactions"`
	TotalVolumeSats       int64   `json:"total_volume_sats"`
	AverageTransactionSat float64 `json:"average_transaction_size"`
	ActiveMerchants       int64   `json:"active_merchants"`
	TotalMerchants        int64   `json:"total_merchants"`
	UniqueProducts        int64   `json:"unique_products"`
	TransactionsPerMinute float64 `json:"transactions_per_minute"`
	VolumePerMinute       float64 `json:"volume_per_minute"`
}

// TickerEntry is a row in the public live ticker.
type TickerEntry struct {
	SaleID        int64     `json:"sale_id"`
	MerchantID    string    `json:"merchant_id"`
	MerchantAlias string    `json:"merchant_alias"`
	AmountSats    int64     `json:"amount_sats"`
	SaleDate      time.Time `json:"sale_date"`
}

// MerchantLeaderboardRow summarises merchant stats.
type MerchantLeaderboardRow struct {
	MerchantID string `json:"merchant_id"`
	Alias      string `json:"alias"`
	Count      int64  `json:"transactions"`
	VolumeSats int64  `json:"volume_sats"`
}

// ProductLeaderboardRow summarises product stats.
type ProductLeaderboardRow struct {
	MerchantID string `json:"merchant_id"`
	ProductID  int64  `json:"product_id"`
	Name       string `json:"name"`
	Count      int64  `json:"transactions"`
	VolumeSats int64  `json:"volume_sats"`
}

// MilestoneType enumerates supported milestone dimensions.
type MilestoneType string

const (
	MilestoneTransactions MilestoneType = "transactions"
	MilestoneVolume       MilestoneType = "volume"
)

// Milestone config row.
type Milestone struct {
	ID          int64         `json:"id"`
	Name        string        `json:"name"`
	Type        MilestoneType `json:"type"`
	Threshold   int64         `json:"threshold"`
	Enabled     bool          `json:"enabled"`
	Triggered   bool          `json:"triggered"`
	TriggeredAt *time.Time    `json:"triggered_at,omitempty"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

// MilestoneTrigger records an actual trigger event for the dashboard.
type MilestoneTrigger struct {
	ID                int64     `json:"id"`
	MilestoneID       int64     `json:"milestone_id"`
	Name              string    `json:"name"`
	Type              string    `json:"type"`
	Threshold         int64     `json:"threshold"`
	TriggeredAt       time.Time `json:"triggered_at"`
	TotalTransactions int64     `json:"total_transactions"`
	TotalVolumeSats   int64     `json:"total_volume_sats"`
}

// Store wraps the SQLite database and queries.
type Store struct {
	db *sql.DB
}

// New opens a SQLite database located at the supplied path. Call Init afterwards.
func New(path string) (*Store, error) {
	params := []string{"_busy_timeout=5000"}
	if !strings.Contains(path, "memory") {
		params = append(params, "_pragma=journal_mode(WAL)")
	}
	sep := "?"
	if strings.Contains(path, "?") {
		sep = "&"
	}
	dsn := fmt.Sprintf("file:%s%s%s", path, sep, strings.Join(params, "&"))
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	return &Store{db: db}, nil
}

// Close the underlying DB.
func (s *Store) Close() error {
	if s.db == nil {
		return nil
	}
	return s.db.Close()
}

// Init applies the database schema.
func (s *Store) Init(ctx context.Context) error {
	schema := []string{
		`CREATE TABLE IF NOT EXISTS merchants (
			id TEXT PRIMARY KEY,
			public_key TEXT NOT NULL,
			alias TEXT NOT NULL,
			enabled INTEGER NOT NULL DEFAULT 1,
			last_polled_at TIMESTAMP,
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS transactions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
			sale_id INTEGER NOT NULL,
			sale_origin TEXT,
			sale_date TIMESTAMP NOT NULL,
			amount_sats INTEGER NOT NULL,
			created_at TIMESTAMP NOT NULL,
			UNIQUE(merchant_id, sale_id)
		);`,
		`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(sale_date DESC);`,
		`CREATE TABLE IF NOT EXISTS products (
			merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
			product_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			currency TEXT,
			price TEXT,
			total_transactions INTEGER NOT NULL,
			total_revenue_sats INTEGER NOT NULL,
			active INTEGER NOT NULL,
			updated_at TIMESTAMP NOT NULL,
			PRIMARY KEY(merchant_id, product_id)
		);`,
		`CREATE TABLE IF NOT EXISTS milestones (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			type TEXT NOT NULL,
			threshold INTEGER NOT NULL,
			enabled INTEGER NOT NULL DEFAULT 1,
			triggered_at TIMESTAMP,
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS milestone_triggers (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			milestone_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			type TEXT NOT NULL,
			threshold INTEGER NOT NULL,
			triggered_at TIMESTAMP NOT NULL,
			total_transactions INTEGER NOT NULL,
			total_volume_sats INTEGER NOT NULL
		);`,
	}

	for _, stmt := range schema {
		if _, err := s.db.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}
	return nil
}

// UpsertMerchant inserts or updates a merchant record.
func (s *Store) UpsertMerchant(ctx context.Context, m Merchant) error {
	now := time.Now().UTC()
	m.CreatedAt = now
	m.UpdatedAt = now
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO merchants (id, public_key, alias, enabled, last_polled_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, NULL, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			public_key=excluded.public_key,
			alias=excluded.alias,
			enabled=excluded.enabled,
			updated_at=excluded.updated_at
	`, m.ID, m.PublicKey, m.Alias, boolToInt(m.Enabled), m.CreatedAt, m.UpdatedAt)
	return err
}

// UpdateMerchant updates fields for the merchant.
func (s *Store) UpdateMerchant(ctx context.Context, m Merchant) error {
	m.UpdatedAt = time.Now().UTC()
	res, err := s.db.ExecContext(ctx, `
		UPDATE merchants
		SET public_key=?, alias=?, enabled=?, updated_at=?
		WHERE id=?
	`, m.PublicKey, m.Alias, boolToInt(m.Enabled), m.UpdatedAt, m.ID)
	if err != nil {
		return err
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// UpdateMerchantPollTime stores the last poll timestamp.
func (s *Store) UpdateMerchantPollTime(ctx context.Context, merchantID string, ts time.Time) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE merchants SET last_polled_at=?, updated_at=? WHERE id=?
	`, ts, ts, merchantID)
	return err
}

// GetMerchant fetches a merchant by id.
func (s *Store) GetMerchant(ctx context.Context, id string) (Merchant, error) {
	var m Merchant
	var last sql.NullTime
	var enabled int
	err := s.db.QueryRowContext(ctx, `
		SELECT id, public_key, alias, enabled, last_polled_at, created_at, updated_at
		FROM merchants WHERE id=?
	`, id).Scan(&m.ID, &m.PublicKey, &m.Alias, &enabled, &last, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return m, err
	}
	m.Enabled = enabled != 0
	if last.Valid {
		t := last.Time
		m.LastPolledAt = &t
	}
	return m, nil
}

// ListMerchants returns merchants optionally filtered by enabled flag.
func (s *Store) ListMerchants(ctx context.Context, onlyEnabled bool) ([]Merchant, error) {
	query := `
		SELECT id, public_key, alias, enabled, last_polled_at, created_at, updated_at
		FROM merchants
	`
	if onlyEnabled {
		query += ` WHERE enabled=1`
	}
	query += ` ORDER BY alias`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []Merchant
	for rows.Next() {
		var m Merchant
		var last sql.NullTime
		var enabled int
		if err := rows.Scan(&m.ID, &m.PublicKey, &m.Alias, &enabled, &last, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		m.Enabled = enabled != 0
		if last.Valid {
			t := last.Time
			m.LastPolledAt = &t
		}
		result = append(result, m)
	}
	return result, rows.Err()
}

// RecordTransactions inserts new transactions in an idempotent fashion.
func (s *Store) RecordTransactions(ctx context.Context, merchantID string, txns []TransactionInput) (int64, error) {
	if len(txns) == 0 {
		return 0, nil
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO transactions (merchant_id, sale_id, sale_origin, sale_date, amount_sats, created_at)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(merchant_id, sale_id) DO NOTHING
	`)
	if err != nil {
		tx.Rollback()
		return 0, err
	}
	defer stmt.Close()

	var inserted int64
	now := time.Now().UTC()
	for _, t := range txns {
		res, err := stmt.ExecContext(ctx, merchantID, t.SaleID, t.SaleOrigin, t.SaleDate, t.AmountSats, now)
		if err != nil {
			tx.Rollback()
			return 0, err
		}
		if rows, _ := res.RowsAffected(); rows > 0 {
			inserted += rows
		}
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return inserted, nil
}

// UpsertProducts persists upstream product stats.
func (s *Store) UpsertProducts(ctx context.Context, merchantID string, products []ProductSnapshot) error {
	if len(products) == 0 {
		return nil
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO products (merchant_id, product_id, name, currency, price, total_transactions, total_revenue_sats, active, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(merchant_id, product_id) DO UPDATE SET
			name=excluded.name,
			currency=excluded.currency,
			price=excluded.price,
			total_transactions=excluded.total_transactions,
			total_revenue_sats=excluded.total_revenue_sats,
			active=excluded.active,
			updated_at=excluded.updated_at
	`)
	if err != nil {
		tx.Rollback()
		return err
	}
	defer stmt.Close()

	now := time.Now().UTC()
	for _, p := range products {
		if _, err := stmt.ExecContext(ctx,
			merchantID,
			p.ProductID,
			p.Name,
			p.Currency,
			p.Price,
			p.TotalTransactions,
			p.TotalRevenueSats,
			boolToInt(p.Active),
			now,
		); err != nil {
			tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}

// Summary returns aggregate dashboard metrics.
func (s *Store) Summary(ctx context.Context, rateWindow time.Duration) (Summary, error) {
	var out Summary
	row := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*), COALESCE(SUM(amount_sats),0) FROM transactions
	`)
	if err := row.Scan(&out.TotalTransactions, &out.TotalVolumeSats); err != nil {
		return out, err
	}
	if out.TotalTransactions > 0 {
		out.AverageTransactionSat = float64(out.TotalVolumeSats) / float64(out.TotalTransactions)
	}

	row = s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM merchants WHERE enabled=1`)
	if err := row.Scan(&out.ActiveMerchants); err != nil {
		return out, err
	}
	row = s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM merchants`)
	if err := row.Scan(&out.TotalMerchants); err != nil {
		return out, err
	}
	row = s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM products WHERE active=1`)
	if err := row.Scan(&out.UniqueProducts); err != nil {
		return out, err
	}
	if rateWindow > 0 {
		start := time.Now().UTC().Add(-rateWindow)
		var count int64
		var volume int64
		if err := s.db.QueryRowContext(ctx, `
			SELECT COUNT(*), COALESCE(SUM(amount_sats),0)
			FROM transactions
			WHERE sale_date >= ?
		`, start).Scan(&count, &volume); err != nil {
			return out, err
		}
		minutes := rateWindow.Minutes()
		if minutes > 0 {
			out.TransactionsPerMinute = float64(count) / minutes
			out.VolumePerMinute = float64(volume) / minutes
		}
	}
	return out, nil
}

// LatestTransactions returns the latest N ticker rows.
func (s *Store) LatestTransactions(ctx context.Context, limit int) ([]TickerEntry, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT t.sale_id, t.merchant_id, m.alias, t.amount_sats, t.sale_date
		FROM transactions t
		JOIN merchants m ON m.id = t.merchant_id
		ORDER BY t.sale_date DESC
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []TickerEntry
	for rows.Next() {
		var entry TickerEntry
		if err := rows.Scan(&entry.SaleID, &entry.MerchantID, &entry.MerchantAlias, &entry.AmountSats, &entry.SaleDate); err != nil {
			return nil, err
		}
		out = append(out, entry)
	}
	return out, rows.Err()
}

// MerchantLeaderboard returns aggregated stats for merchants in a time window.
func (s *Store) MerchantLeaderboard(ctx context.Context, window time.Duration, metric string, limit int) ([]MerchantLeaderboardRow, error) {
	if limit <= 0 {
		return nil, fmt.Errorf("limit must be > 0")
	}
	args := []any{}
	query := `
		SELECT t.merchant_id, m.alias, COUNT(t.id) AS tx_count, COALESCE(SUM(t.amount_sats),0) AS volume
		FROM transactions t
		JOIN merchants m ON m.id = t.merchant_id
	`
	if window > 0 {
		start := time.Now().UTC().Add(-window)
		query += ` WHERE t.sale_date >= ?`
		args = append(args, start)
	}
	if strings.ToLower(metric) == "volume" {
		query += ` GROUP BY t.merchant_id ORDER BY volume DESC, m.alias ASC LIMIT ?`
	} else {
		query += ` GROUP BY t.merchant_id ORDER BY tx_count DESC, m.alias ASC LIMIT ?`
	}
	args = append(args, limit)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []MerchantLeaderboardRow
	for rows.Next() {
		var row MerchantLeaderboardRow
		if err := rows.Scan(&row.MerchantID, &row.Alias, &row.Count, &row.VolumeSats); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

// ProductLeaderboard returns product level stats (all-time).
func (s *Store) ProductLeaderboard(ctx context.Context, metric string, limit int) ([]ProductLeaderboardRow, error) {
	if limit <= 0 {
		return nil, fmt.Errorf("limit must be > 0")
	}
	var query string
	if strings.ToLower(metric) == "volume" {
		query = `
			SELECT p.merchant_id, p.product_id, p.name, p.total_transactions, p.total_revenue_sats
			FROM products p
			WHERE p.active=1
			ORDER BY total_revenue_sats DESC, p.name ASC
			LIMIT ?
		`
	} else {
		query = `
			SELECT p.merchant_id, p.product_id, p.name, p.total_transactions, p.total_revenue_sats
			FROM products p
			WHERE p.active=1
			ORDER BY total_transactions DESC, p.name ASC
			LIMIT ?
		`
	}
	rows, err := s.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ProductLeaderboardRow
	for rows.Next() {
		var row ProductLeaderboardRow
		if err := rows.Scan(&row.MerchantID, &row.ProductID, &row.Name, &row.Count, &row.VolumeSats); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

// ListMilestones returns all milestone configs.
func (s *Store) ListMilestones(ctx context.Context) ([]Milestone, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, name, type, threshold, enabled, triggered_at, created_at, updated_at
		FROM milestones
		ORDER BY threshold ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Milestone
	for rows.Next() {
		var m Milestone
		var triggeredAt sql.NullTime
		if err := rows.Scan(&m.ID, &m.Name, &m.Type, &m.Threshold, &m.Enabled, &triggeredAt, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		m.Type = MilestoneType(strings.ToLower(string(m.Type)))
		m.Triggered = triggeredAt.Valid
		if triggeredAt.Valid {
			t := triggeredAt.Time
			m.TriggeredAt = &t
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// UpsertMilestone inserts a new milestone row.
func (s *Store) UpsertMilestone(ctx context.Context, m Milestone) (Milestone, error) {
	if err := validateMilestoneType(m.Type); err != nil {
		return m, err
	}
	m.Type = MilestoneType(strings.ToLower(string(m.Type)))
	now := time.Now().UTC()
	m.CreatedAt = now
	m.UpdatedAt = now
	res, err := s.db.ExecContext(ctx, `
		INSERT INTO milestones (name, type, threshold, enabled, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`, m.Name, string(m.Type), m.Threshold, boolToInt(m.Enabled), m.CreatedAt, m.UpdatedAt)
	if err != nil {
		return m, err
	}
	m.ID, _ = res.LastInsertId()
	return m, nil
}

// UpdateMilestone updates fields and optionally resets the trigger state.
func (s *Store) UpdateMilestone(ctx context.Context, id int64, update Milestone, reset bool) (Milestone, error) {
	if err := validateMilestoneType(update.Type); err != nil {
		return update, err
	}
	update.Type = MilestoneType(strings.ToLower(string(update.Type)))
	update.UpdatedAt = time.Now().UTC()
	resetClause := "triggered_at = triggered_at"
	if reset {
		resetClause = "triggered_at = NULL"
	}
	res, err := s.db.ExecContext(ctx, `
		UPDATE milestones
		SET name=?, type=?, threshold=?, enabled=?, updated_at=?, `+resetClause+`
		WHERE id=?
	`, update.Name, string(update.Type), update.Threshold, boolToInt(update.Enabled), update.UpdatedAt, id)
	if err != nil {
		return update, err
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		return update, sql.ErrNoRows
	}
	return s.GetMilestone(ctx, id)
}

// GetMilestone fetches a milestone.
func (s *Store) GetMilestone(ctx context.Context, id int64) (Milestone, error) {
	var m Milestone
	var triggeredAt sql.NullTime
	err := s.db.QueryRowContext(ctx, `
		SELECT id, name, type, threshold, enabled, triggered_at, created_at, updated_at
		FROM milestones
		WHERE id=?
	`, id).Scan(&m.ID, &m.Name, &m.Type, &m.Threshold, &m.Enabled, &triggeredAt, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return m, err
	}
	m.Triggered = triggeredAt.Valid
	m.Type = MilestoneType(strings.ToLower(string(m.Type)))
	if triggeredAt.Valid {
		t := triggeredAt.Time
		m.TriggeredAt = &t
	}
	return m, nil
}

// ProcessMilestones checks thresholds and records triggers once.
func (s *Store) ProcessMilestones(ctx context.Context) ([]MilestoneTrigger, error) {
	totalTx, totalVol, err := s.currentTotals(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, name, type, threshold
		FROM milestones
		WHERE enabled=1 AND triggered_at IS NULL
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type candidate struct {
		id        int64
		name      string
		typ       string
		threshold int64
	}
	var candidates []candidate
	for rows.Next() {
		var c candidate
		if err := rows.Scan(&c.id, &c.name, &c.typ, &c.threshold); err != nil {
			return nil, err
		}
		candidates = append(candidates, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if len(candidates) == 0 {
		return nil, nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var triggered []MilestoneTrigger
	now := time.Now().UTC()
	for _, c := range candidates {
		var condition bool
		switch MilestoneType(c.typ) {
		case MilestoneTransactions:
			condition = totalTx >= c.threshold
		case MilestoneVolume:
			condition = totalVol >= c.threshold
		default:
			continue
		}
		if !condition {
			continue
		}
		if _, err := tx.ExecContext(ctx, `
			UPDATE milestones SET triggered_at=? WHERE id=? AND triggered_at IS NULL
		`, now, c.id); err != nil {
			return nil, err
		}
		res, err := tx.ExecContext(ctx, `
			INSERT INTO milestone_triggers (milestone_id, name, type, threshold, triggered_at, total_transactions, total_volume_sats)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`, c.id, c.name, c.typ, c.threshold, now, totalTx, totalVol)
		if err != nil {
			return nil, err
		}
		triggerID, _ := res.LastInsertId()
		triggered = append(triggered, MilestoneTrigger{
			ID:                triggerID,
			MilestoneID:       c.id,
			Name:              c.name,
			Type:              c.typ,
			Threshold:         c.threshold,
			TriggeredAt:       now,
			TotalTransactions: totalTx,
			TotalVolumeSats:   totalVol,
		})
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return triggered, nil
}

// MilestoneTriggersSince returns triggers since a timestamp.
func (s *Store) MilestoneTriggersSince(ctx context.Context, since time.Time) ([]MilestoneTrigger, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, milestone_id, name, type, threshold, triggered_at, total_transactions, total_volume_sats
		FROM milestone_triggers
		WHERE triggered_at >= ?
		ORDER BY triggered_at DESC
	`, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []MilestoneTrigger
	for rows.Next() {
		var m MilestoneTrigger
		if err := rows.Scan(&m.ID, &m.MilestoneID, &m.Name, &m.Type, &m.Threshold, &m.TriggeredAt, &m.TotalTransactions, &m.TotalVolumeSats); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *Store) currentTotals(ctx context.Context) (int64, int64, error) {
	var totalTx, totalVol int64
	if err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*), COALESCE(SUM(amount_sats),0) FROM transactions
	`).Scan(&totalTx, &totalVol); err != nil {
		return 0, 0, err
	}
	return totalTx, totalVol, nil
}

func boolToInt(v bool) int {
	if v {
		return 1
	}
	return 0
}

func validateMilestoneType(mt MilestoneType) error {
	switch MilestoneType(strings.ToLower(string(mt))) {
	case MilestoneTransactions, MilestoneVolume:
		return nil
	default:
		return errors.New("invalid milestone type")
	}
}
