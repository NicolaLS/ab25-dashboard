# Mock Testing System

This document describes the mock PayWithFlash API server and testing infrastructure for validating the dashboard backend and visualizing the frontend with realistic data.

## Overview

The mock testing system provides:
1. **Mock PayWithFlash API Server** - Mimics the real PayWithFlash API with realistic merchant and transaction data
2. **20 Diverse Merchant Profiles** - Pre-configured merchants with different behavior patterns
3. **Automatic Transaction Generation** - Realistic transaction streams based on merchant profiles
4. **Integration Tests** - Comprehensive tests validating backend correctness
5. **Frontend Development Environment** - Easy way to see the dashboard with production-like data

## Quick Start

### Option 1: Run Integration Test

The integration test validates the entire system (mock server → backend → database):

```bash
cd backend
go test -v ./test -run TestFullIntegration
```

This test:
- Starts a mock PayWithFlash server with 20 merchants
- Starts the dashboard backend
- Generates transactions for 30 seconds
- Validates data ingestion, idempotency, milestones, and leaderboards

### Option 2: Manual Setup for Frontend Development

Start the mock environment with all services:

```bash
./_tools/setup-mock.sh --with-frontend
```

This script:
1. Starts mock PayWithFlash server on `:9999` (with 1 hour of historical data pre-generated)
2. Starts dashboard backend on `:8080` (pointed to mock, using separate database)
3. Adds all 20 merchants automatically
4. Creates test milestones
5. Optionally starts frontend on `:5173`

**What to expect:**
- **Gradual start**: System begins with minimal baseline data (~20-40 transactions)
- **Growing activity**: New transactions appear every 3 seconds across all merchants
- **Visible accumulation**: Watch transaction counts climb in real-time
- **High-volume merchants**: Coffee, Ice Cream, Convenience Store generate ~2-3 tx/min each
- **Milestone triggers**: First milestones should trigger within 2-3 minutes
- **Full activity**: After ~5 minutes, dashboard shows busy conference atmosphere

The frontend simulates a live event where activity builds up naturally, just like a real conference starting up.

### Option 3: Manual Step-by-Step

For more control, run each component separately:

**Terminal 1: Start Mock Server**
```bash
cd backend
go run ./cmd/mockserver
```

**Terminal 2: Start Backend (pointing to mock)**
```bash
cd backend
export SOURCE_BASE_URL="http://localhost:9999"
export POLL_INTERVAL="5s"
go run ./cmd/server
```

**Terminal 3: Add Merchants**
```bash
# Example: Add Bitcoin Coffee merchant
curl -X POST http://localhost:8080/v1/admin/merchants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id":"100","public_key":"mock_pubkey_0","alias":"Bitcoin Coffee","enabled":true}'

# Add more merchants as needed (IDs 100-119)
```

**Terminal 4: Start Frontend**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173` to see the dashboard.

## Merchant Profiles

The system includes 20 pre-configured merchant profiles, each with unique characteristics:

| ID  | Merchant Name           | Products | Price Range       | Frequency    | Characteristics                          |
|-----|-------------------------|----------|-------------------|--------------|------------------------------------------|
| 100 | Bitcoin Coffee          | 8        | $1-4             | 2.0 tx/min   | High volume, low cost, popular items     |
| 101 | Bitcoin Electronics     | 5        | $150-900         | 0.05 tx/min  | Low volume, high cost, diverse sales     |
| 102 | Lightning Bistro        | 15       | $5-15            | 0.8 tx/min   | Medium volume restaurant                 |
| 103 | Satoshi's Bar           | 12       | $2.50-6          | 1.2 tx/min   | Drinks, popular products                 |
| 104 | Bread & Bitcoin         | 10       | $1.50-8          | 0.6 tx/min   | Artisan bakery, seasonal items           |
| 105 | Bitcoin Books           | 20       | $10-25           | 0.3 tx/min   | Bookstore, diverse catalog               |
| 106 | Lightning Tacos         | 6        | $3-6             | 1.5 tx/min   | Food truck, focused menu                 |
| 107 | Bitcoin Threads         | 25       | $25-150          | 0.15 tx/min  | Clothing boutique                        |
| 108 | Bolt & Satoshi          | 30       | $3-60            | 0.4 tx/min   | Hardware store, wide range               |
| 109 | Frozen Sats             | 8        | $2.50-5          | 2.5 tx/min   | Ice cream, high volume                   |
| 110 | Fresh Squeeze ₿         | 10       | $4-7             | 0.9 tx/min   | Juice bar                                |
| 111 | PlayBTC                 | 35       | $6-45            | 0.25 tx/min  | Toy store, large diverse catalog         |
| 112 | HealthChain Pharmacy    | 40       | $5-30            | 0.5 tx/min   | Pharmacy, many products                  |
| 113 | Pizza Lightning         | 12       | $8-15            | 1.0 tx/min   | Pizza place                              |
| 114 | Bloom & Bitcoin         | 18       | $10-40           | 0.2 tx/min   | Flower shop, seasonal                    |
| 115 | Two Wheels One Chain    | 15       | $15-600          | 0.1 tx/min   | Bike shop, wide price range              |
| 116 | Proof of Workout        | 8        | $30-150          | 0.3 tx/min   | Gym memberships                          |
| 117 | Trim the Chain          | 6        | $15-30           | 0.4 tx/min   | Barber shop                              |
| 118 | Paws & Sats             | 28       | $5-55            | 0.35 tx/min  | Pet store                                |
| 119 | 24/7 Satoshi            | 50       | $0.60-10         | 3.0 tx/min   | Convenience store, very high volume      |

### Profile Characteristics

Each profile defines:
- **Number of Products**: Catalog size
- **Price Range**: Min/max product prices in sats
- **Transaction Frequency**: Average transactions per minute
- **Anonymous Transaction Ratio**: % of sales not tied to specific products
- **Active Product Ratio**: % of products currently available
- **Popular Product Ratio**: % of sales concentrated in top products

This diversity ensures realistic testing across different business types.

## Architecture

### Components

```
backend/
├── internal/mock/
│   ├── server.go       # HTTP server mimicking PayWithFlash API
│   ├── data.go         # Merchant data structures and generators
│   └── profiles.go     # 20 merchant behavior profiles
├── cmd/mockserver/
│   └── main.go         # Standalone mock server runner
└── test/
    └── integration_test.go  # Full system integration test
```

### Data Flow

```
Mock Server (port 9999)
    ↓ (generates transactions based on profiles)
    ↓ GET /user-pos/{id}?user_public_key={key}
    ↓
Dashboard Backend (port 8080)
    ↓ (polls every 5s, ingests data)
    ↓
SQLite Database
    ↓ (queries data)
    ↓
Frontend (port 5173)
    ↓ (displays in real-time)
Dashboard UI
```

## Mock Server API

The mock server implements the PayWithFlash API endpoints:

### `GET /user-pos/{merchantID}?user_public_key={key}`

Returns merchant data including products and sales.

**Response:**
```json
{
  "data": {
    "id": 100,
    "name": "Bitcoin Coffee",
    "products": [
      {
        "productid": 1,
        "name": "Espresso",
        "currency": "USD",
        "price": "3.00",
        "total_transactions": 45,
        "total_revenue_sats": "405000",
        "activestatus": true
      }
    ],
    "sales": [
      {
        "SaleId": 1001,
        "SaleOrigin": "POS",
        "SaleDate": "2024-01-15T10:30:00Z",
        "TotalCostSats": "9000"
      }
    ]
  }
}
```

### `GET /admin/merchants`

Lists all merchants in the mock system.

### `POST /admin/merchants/{id}/reset`

Resets a merchant's transaction data (keeps products).

### `GET /health`

Health check endpoint.

## Integration Test Details

The `TestFullIntegration` test (`backend/test/integration_test.go`) performs comprehensive validation:

1. **Setup Phase**
   - Start mock PayWithFlash server
   - Start dashboard backend
   - Add 20 merchants
   - Create test milestones

2. **Runtime Phase** (30 seconds)
   - Mock server generates transactions based on profiles
   - Backend polls and ingests data
   - System processes milestones
   - Logs progress every 5 seconds

3. **Validation Phase**
   - Verifies transactions were collected
   - Verifies volume calculations
   - Validates merchant and product tracking
   - Checks milestone triggers
   - Validates ticker has recent transactions
   - Validates leaderboards have entries
   - Tests idempotency (duplicate polling doesn't create duplicates)

**Expected Output:**
```
System running... generating and ingesting transactions
Mock server: 20 merchants with diverse profiles
Dashboard backend: polling every 3s, processing milestones
Progress: 120 transactions, 450000 sats total
Progress: 285 transactions, 1050000 sats total
...
Final summary: 420 transactions, 1850000 sats
Milestones triggered: 3
  - 100 Transactions (threshold: 100)
  - 100k Sats Volume (threshold: 100000)
  - 500 Transactions (threshold: 500)
✅ Integration test passed!
```

## Configuration

### Mock Server

```bash
go run ./cmd/mockserver \
  -addr :9999 \
  -interval 10s \
  -no-gen  # Disable auto-generation
```

**Flags:**
- `-addr`: Listen address (default `:9999`)
- `-interval`: Transaction generation interval (default `10s`)
- `-no-gen`: Disable automatic transaction generation

### Dashboard Backend

When using the mock server, set these environment variables:

```bash
export SOURCE_BASE_URL="http://localhost:9999"  # Point to mock server
export POLL_INTERVAL="5s"                       # Poll frequently for testing
export ADMIN_TOKEN="your-token"                 # For admin API access
```

## Common Scenarios

### Scenario 1: Test High Transaction Volume

```bash
# Start mock with fast generation
go run ./cmd/mockserver -interval 2s

# Backend will process ~100+ transactions per minute
```

### Scenario 2: Test Milestone Triggers

```bash
# Start the system
./_tools/setup-mock.sh

# Create low-threshold milestone
curl -X POST http://localhost:8080/v1/admin/milestones \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Milestone","type":"transactions","threshold":50,"enabled":true}'

# Watch for trigger (should fire within 1-2 minutes)
curl http://localhost:8080/v1/milestones/triggers
```

### Scenario 3: Test Specific Merchant Behavior

```bash
# Start mock server
go run ./cmd/mockserver

# Add only high-volume coffee shop
curl -X POST http://localhost:8080/v1/admin/merchants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id":"100","public_key":"mock_pubkey_0","alias":"Bitcoin Coffee","enabled":true}'

# Watch transactions accumulate rapidly
watch -n 1 'curl -s http://localhost:8080/v1/summary | jq .total_transactions'
```

### Scenario 4: Test Frontend Under Load

```bash
# Start with all 20 merchants and fast polling
./_tools/setup-mock.sh --with-frontend

# Frontend will show:
# - Rapidly updating ticker
# - Milestone celebrations
# - Leaderboard changes
# - Live transaction rate
```

## Troubleshooting

### No Transactions Appearing

1. Check mock server is running: `curl http://localhost:9999/health`
2. Check backend can reach mock: `curl http://localhost:9999/user-pos/100?user_public_key=mock_pubkey_0`
3. Verify merchants are enabled: `curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8080/v1/admin/merchants`
4. Check backend logs for polling errors

### Milestones Not Triggering

1. Verify milestones are created: `curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8080/v1/admin/milestones`
2. Check thresholds aren't too high for test data volume
3. Ensure backend is polling (check logs)

### Frontend Shows No Data

1. Verify backend is running: `curl http://localhost:8080/v1/health`
2. Check summary has data: `curl http://localhost:8080/v1/summary`
3. Check browser console for errors
4. Verify CORS is configured (default allows all origins)

## Extending the Mock System

### Adding Custom Merchant Profiles

Edit `backend/internal/mock/profiles.go`:

```go
{
    Name:                "my_custom_merchant",
    Alias:               "My Custom Shop",
    NumProducts:         10,
    ProductPriceRange:   [2]int64{5000, 50000},
    TxFrequency:         1.0,
    AnonymousTxRatio:    0.1,
    ActiveProductRatio:  0.9,
    PriceTrend:          "stable",
    PopularProductRatio: 0.6,
}
```

### Manually Adding Products

```go
merchant, _ := mockServer.GetMerchant("100")
productID := merchant.AddProduct("Custom Product", "USD", "15.99", true)
```

### Programmatic Transaction Generation

```go
merchant, _ := mockServer.GetMerchant("100")
merchant.GenerateTransactions(10) // Generate transactions as if 10 seconds passed
```

## Best Practices

1. **Use setup-mock.sh for frontend work** - Easiest way to get a full environment
2. **Run integration test before commits** - Validates nothing broke
3. **Start with few merchants for debugging** - Easier to trace issues
4. **Use fast polling intervals for testing** - See results quickly (5s)
5. **Reset merchants between test runs** - `POST /admin/merchants/{id}/reset`
6. **Monitor backend logs** - Shows polling activity and errors

## Performance Notes

- Mock server can handle 100+ merchants efficiently
- Transaction generation is lightweight (pure Go, no external calls)
- Default 20 merchants generate ~500-1000 transactions per minute combined
- Backend should poll every 3-10 seconds for responsive testing
- Frontend updates every 5 seconds via React Query polling

## Real vs Mock Differences

| Aspect              | Real PayWithFlash API | Mock Server |
|---------------------|-----------------------|-------------|
| Authentication      | Required              | Simplified  |
| Rate Limiting       | Yes                   | No          |
| Data Persistence    | Permanent             | In-memory   |
| Transaction History | Complete history      | Since start |
| Latency             | Variable (network)    | <1ms        |
| Availability        | Dependent on service  | Always up   |

The mock server is designed for **development and testing only**. For production, always use the real PayWithFlash API.
