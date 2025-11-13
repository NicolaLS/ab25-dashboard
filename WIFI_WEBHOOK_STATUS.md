# WiFi Webhook Integration - Implementation Status

## ✅ Completed

### 1. Database Schema (DONE)
- ✅ Added `source` column to transactions table (TEXT, default 'pwf')
- ✅ Added index on source column
- ✅ Created `TransactionSource` type with constants (SourcePayWithFlash, SourceWifi)
- ✅ Updated `TransactionInput` struct to include Source field
- ✅ Added automatic migration for existing databases
- ✅ Updated `RecordTransactions` to insert source column
- ✅ Updated poller to set Source = SourcePayWithFlash

###  2. Configuration (DONE)
- ✅ Added `WebhookSecret` field to Config struct
- ✅ Added `WEBHOOK_SECRET` environment variable support (optional)

### 3. Documentation (DONE)
- ✅ Created comprehensive implementation plan (`MULTI_SOURCE_IMPLEMENTATION.md`)
- ✅ Documented LNBITS webhook payload format
- ✅ Documented setup instructions
- ✅ Documented API changes

## 🚧 In Progress / TODO

### 4. Backend - Store Layer
**File**: `backend/internal/store/store.go`

**TODO**: Update `Summary()` method to support source filtering

```go
// Add this new method after the existing Summary method (around line 460)
func (s *Store) SummaryBySource(ctx context.Context, rateWindow time.Duration, source string) (Summary, error) {
	var out Summary
	var windowCount, windowVolume int64

	// Build WHERE clause for source filtering
	sourceFilter := ""
	args := []any{}
	if source != "" && source != "all" {
		sourceFilter = "WHERE source = ?"
		args = append(args, source)
	}

	// Combine all metrics into a single query with source filtering
	start := time.Now().UTC().Add(-rateWindow)
	query := fmt.Sprintf(`
		SELECT
			(SELECT COUNT(*) FROM transactions %s) AS total_tx,
			(SELECT COALESCE(SUM(amount_sats), 0) FROM transactions %s) AS total_vol,
			(SELECT COUNT(*) FROM merchants WHERE enabled=1) AS active_merchants,
			(SELECT COUNT(*) FROM merchants) AS total_merchants,
			(SELECT COUNT(*) FROM products WHERE active=1) AS unique_products,
			(SELECT COUNT(*) FROM transactions %s AND sale_date >= ?) AS window_tx,
			(SELECT COALESCE(SUM(amount_sats), 0) FROM transactions %s AND sale_date >= ?) AS window_vol
	`, sourceFilter, sourceFilter, sourceFilter, sourceFilter)

	// Build args array based on whether we're filtering
	queryArgs := []any{}
	if len(args) > 0 {
		// We have source filter, need to repeat it for each subquery
		queryArgs = append(queryArgs, args[0], args[0], args[0], start, args[0], start)
	} else {
		queryArgs = append(queryArgs, start, start)
	}

	err := s.db.QueryRowContext(ctx, query, queryArgs...).Scan(
		&out.TotalTransactions,
		&out.TotalVolumeSats,
		&out.ActiveMerchants,
		&out.TotalMerchants,
		&out.UniqueProducts,
		&windowCount,
		&windowVolume,
	)
	if err != nil {
		return out, err
	}

	if out.TotalTransactions > 0 {
		out.AverageTransactionSat = float64(out.TotalVolumeSats) / float64(out.TotalTransactions)
	}

	if rateWindow > 0 {
		minutes := rateWindow.Minutes()
		if minutes > 0 {
			out.TransactionsPerMinute = float64(windowCount) / minutes
			out.VolumePerMinute = float64(windowVolume) / minutes
		}
	}

	return out, nil
}
```

**TODO**: Update `LatestTransactions()` to support source filtering

```go
// Replace the existing LatestTransactions method (around line 463)
func (s *Store) LatestTransactions(ctx context.Context, limit int, source string) ([]TickerEntry, error) {
	sourceFilter := ""
	args := []any{limit}
	if source != "" && source != "all" {
		sourceFilter = "WHERE t.source = ?"
		args = []any{source, limit}
	}

	query := fmt.Sprintf(`
		SELECT t.sale_id, t.merchant_id, m.alias, t.amount_sats, t.sale_date
		FROM transactions t
		JOIN merchants m ON m.id = t.merchant_id
		%s
		ORDER BY t.sale_date DESC
		LIMIT ?
	`, sourceFilter)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]TickerEntry, 0)
	for rows.Next() {
		var entry TickerEntry
		if err := rows.Scan(&entry.SaleID, &entry.MerchantID, &entry.MerchantAlias, &entry.AmountSats, &entry.SaleDate); err != nil {
			return nil, err
		}
		out = append(out, entry)
	}
	return out, rows.Err()
}
```

### 5. Backend - API Layer
**File**: `backend/internal/api/server.go`

**TODO**: Add webhook endpoint and update existing endpoints

```go
// Add to the router setup (around line 82)
r.Post("/v1/webhooks/wifi", s.handleWifiWebhook)

// Update handleSummary to support source parameter (replace existing, around line 116)
func (s *Server) handleSummary(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	source := r.URL.Query().Get("source")
	if source == "" {
		source = "all"
	}
	summary, err := s.store.SummaryBySource(ctx, s.cfg.RateWindow, source)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, summary)
}

// Update handleTicker to support source parameter (replace existing, around line 126)
func (s *Server) handleTicker(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	limit := parseIntQuery(r, "limit", s.cfg.TickerLimit)
	source := r.URL.Query().Get("source")
	if source == "" {
		source = "all"
	}
	items, err := s.store.LatestTransactions(ctx, limit, source)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

// Add new webhook handler (add after handleAdminLogin, around line 215)
func (s *Server) handleWifiWebhook(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Validate webhook secret if configured
	if s.cfg.WebhookSecret != "" {
		providedSecret := r.Header.Get("X-Webhook-Secret")
		if subtle.ConstantTimeCompare([]byte(providedSecret), []byte(s.cfg.WebhookSecret)) != 1 {
			writeError(w, http.StatusUnauthorized, errors.New("invalid webhook secret"))
			return
		}
	}

	// Parse LNBITS webhook payload
	var payload struct {
		Amount      int64  `json:"amount"`       // millisats
		Memo        string `json:"memo"`
		PaymentHash string `json:"payment_hash"`
		Time        int64  `json:"time"`         // unix timestamp
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	// Convert millisats to sats
	amountSats := payload.Amount / 1000

	// Create transaction with source=wifi
	// Use payment_hash as sale_id (convert to int64 hash)
	saleID := int64(hashString(payload.PaymentHash))
	saleDate := time.Unix(payload.Time, 0).UTC()

	txn := store.TransactionInput{
		SaleID:     saleID,
		SaleOrigin: "lnbits",
		SaleDate:   saleDate,
		AmountSats: amountSats,
		Source:     store.SourceWifi,
	}

	// Record transaction
	inserted, err := s.store.RecordTransactions(ctx, "wifi", []store.TransactionInput{txn})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	// Check milestones
	if inserted > 0 {
		if err := s.store.CheckMilestones(ctx); err != nil {
			// Log error but don't fail the webhook
			fmt.Printf("milestone check failed: %v\n", err)
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":   "ok",
		"inserted": inserted,
	})
}

// Add helper function for hashing strings to int64
func hashString(s string) uint64 {
	h := uint64(0)
	for i := 0; i < len(s) && i < 8; i++ {
		h = h<<8 | uint64(s[i])
	}
	return h
}
```

### 6. Frontend - WiFi Scene
**File**: `frontend/src/components/scenes/WifiScene.tsx`

Create this new file with content similar to OverviewScene but filtered to WiFi data.

### 7. Frontend - Scene Rotation
**File**: `frontend/src/components/SceneCarousel.tsx`

Add WiFi scene to the rotation array.

### 8. Testing

```bash
# 1. Start backend
./_tools/dev.sh

# 2. Create wifi merchant
curl -X POST http://localhost:8080/v1/admin/merchants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "wifi",
    "public_key": "wifi_payments",
    "alias": "WiFi Upgrades",
    "enabled": true
  }'

# 3. Test webhook (no secret)
curl -X POST http://localhost:8080/v1/webhooks/wifi \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "memo": "WiFi test",
    "payment_hash": "test123abc",
    "time": 1234567890
  }'

# 4. Check WiFi stats
curl http://localhost:8080/v1/summary?source=wifi

# 5. Check combined stats
curl http://localhost:8080/v1/summary?source=all
```

## Next Steps

1. **Add the SummaryBySource method** to `backend/internal/store/store.go`
2. **Update LatestTransactions** to accept source parameter
3. **Add webhook handler** to `backend/internal/api/server.go`
4. **Update handleSummary and handleTicker** to use source query param
5. **Test backend** with curl commands above
6. **Create WiFi frontend scene** (optional, can be done later)
7. **Add to scene rotation** (optional)
8. **Update README.md** with WiFi webhook configuration

## Configuration

Add to your `.env` or export:

```bash
# Optional: Webhook secret for validation
export WEBHOOK_SECRET=$(openssl rand -hex 32)
```

## LNBITS Setup

1. Create lnurlp pay link in LNBITS
2. Set webhook URL: `https://your-domain.com/v1/webhooks/wifi`
3. If using WEBHOOK_SECRET, add header:
   - Name: `X-Webhook-Secret`
   - Value: Your WEBHOOK_SECRET value
