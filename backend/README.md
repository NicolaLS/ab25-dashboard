# Live POS Dashboard — Go Backend

A production-ready Go service that polls PayWithFlash POS data, stores transaction and product information in SQLite, and exposes REST APIs for real-time dashboard visualization with authenticated admin management.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Database](#database)
- [API Documentation](#api-documentation)
- [Admin Workflows](#admin-workflows)
- [Logging](#logging)
- [Testing](#testing)
- [Security](#security)
- [Performance Tuning](#performance-tuning)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)

---

## Features

### Core Functionality
- **Automatic Data Ingestion**: Background polling with configurable intervals and concurrent processing
- **Idempotent Transactions**: Duplicate-safe ingestion with automatic deduplication
- **Product Tracking**: Cumulative product statistics with automatic updates
- **Milestone Engine**: One-time event triggers for transaction/volume thresholds
- **Real-time Metrics**: Transaction rates, volume, leaderboards, and live ticker

### Technical Highlights
- **Pure Go SQLite**: No CGO dependencies via `modernc.org/sqlite`
- **Production Hardened**: Security best practices, timing attack protection, request limits
- **Optimized Performance**: Query optimization, database indexing, concurrent polling
- **Comprehensive Testing**: Unit tests and integration tests with 100% critical path coverage
- **Auto-Migrations**: Database schema automatically initialized on startup

---

## Requirements

- **Go**: 1.21 or higher (tested with 1.25.4)
- **No CGO**: Pure Go implementation, no C compiler needed
- **Disk Space**: Minimal (SQLite database grows with transaction data)
- **Memory**: ~50MB base + 10MB per concurrent poll worker

---

## Quick Start

### 1. Install Dependencies

```bash
cd backend
go mod download
```

### 2. Set Required Environment Variables

```bash
export ADMIN_TOKEN="your-secure-random-token-here"
```

**⚠️ Important**: Use a strong, randomly generated token in production.

```bash
# Generate a secure token (macOS/Linux):
openssl rand -base64 32
```

### 3. Run the Server

```bash
go run ./cmd/server
```

The server will:
- Start on `http://localhost:8080`
- Create `dashboard.db` SQLite database
- Apply schema migrations automatically
- Begin polling enabled merchants every 30 seconds
- Log all HTTP requests to stdout

### 4. Verify It's Running

```bash
curl http://localhost:8080/v1/health
# Response: {"status":"ok"}
```

---

## Configuration

All configuration is done via environment variables with sensible defaults.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ADMIN_TOKEN` | **Required** - Bearer token for admin endpoints | `your-secure-token` |

### Server Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `ADDR` | HTTP listen address | `:8080` |
| `DB_PATH` | Path to SQLite database file | `dashboard.db` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `*` |

**CORS Examples:**
```bash
# Development (allow all)
export CORS_ORIGINS="*"

# Production (specific domains)
export CORS_ORIGINS="https://dashboard.example.com,https://app.example.com"
```

### Polling Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `POLL_INTERVAL` | Background poll frequency | `30s` |
| `POLL_CONCURRENCY` | Number of concurrent merchant polls | `5` |
| `HTTP_TIMEOUT` | Upstream API timeout | `10s` |
| `SOURCE_BASE_URL` | PayWithFlash API base URL | `https://api.paywithflash.com` |

**Performance Notes:**
- Higher `POLL_CONCURRENCY` = faster polling but more API load
- Lower `POLL_INTERVAL` = more real-time data but more API requests
- Recommended: 5 concurrent workers, 30s interval for production

### Display Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `TICKER_LIMIT` | Default ticker row count | `20` |
| `LEADERBOARD_LIMIT` | Default leaderboard size | `10` |
| `RATE_WINDOW` | Time window for rate calculations | `5m` |

### Example: Production Configuration

```bash
# Server
export ADDR=":8080"
export DB_PATH="/var/lib/dashboard/dashboard.db"
export CORS_ORIGINS="https://dashboard.example.com"

# Security
export ADMIN_TOKEN="$(openssl rand -base64 32)"

# Polling (10 merchants, poll every minute)
export POLL_INTERVAL="1m"
export POLL_CONCURRENCY="10"
export HTTP_TIMEOUT="15s"

# Start server
go run ./cmd/server
```

---

## Database

### Automatic Migrations

The database schema is **automatically created and migrated** on server startup. No manual migration steps needed.

**On first run**, the following tables are created:
- `merchants` - Merchant configuration
- `transactions` - Transaction records
- `products` - Product snapshots
- `milestones` - Milestone configurations
- `milestone_triggers` - Triggered milestone events

### Database Location

Default: `./dashboard.db` (relative to working directory)

```bash
# Custom location
export DB_PATH="/var/lib/dashboard/data.db"
```

### Database Maintenance

**Backup:**
```bash
# Stop server, copy database
cp dashboard.db dashboard.db.backup

# Or use SQLite backup command (while running)
sqlite3 dashboard.db ".backup dashboard.db.backup"
```

**Inspect Database:**
```bash
sqlite3 dashboard.db
sqlite> .tables
sqlite> SELECT COUNT(*) FROM transactions;
sqlite> .quit
```

**Reset Database:**
```bash
# Stop server first!
rm dashboard.db
# Restart server - will create fresh database
```

---

## API Documentation

### Public Endpoints (No Authentication)

#### Health Check
```http
GET /v1/health
```

**Response:**
```json
{
  "status": "ok"
}
```

---

#### Dashboard Summary
```http
GET /v1/summary
```

**Response:**
```json
{
  "total_transactions": 1523,
  "total_volume_sats": 4567890,
  "average_transaction_size": 2998.61,
  "active_merchants": 5,
  "total_merchants": 7,
  "unique_products": 42,
  "transactions_per_minute": 2.4,
  "volume_per_minute": 7200.5
}
```

**Notes:**
- Rates calculated over `RATE_WINDOW` (default: last 5 minutes)
- All sats values are integers
- Optimized single-query response

---

#### Live Ticker
```http
GET /v1/ticker?limit=20
```

**Query Parameters:**
- `limit` (optional): Number of entries (default: 20, max: 1000)

**Response:**
```json
[
  {
    "sale_id": 1523,
    "merchant_id": "173",
    "merchant_alias": "Bitcoin Coffee",
    "amount_sats": 2100,
    "sale_date": "2025-11-10T14:23:45Z"
  },
  ...
]
```

**Notes:**
- Returns latest transactions sorted by date (newest first)
- Empty result returns `[]` not `null`

---

#### Merchant Leaderboard
```http
GET /v1/leaderboard/merchants?metric=transactions&window=24h
```

**Query Parameters:**
- `metric` (optional): `transactions` or `volume` (default: `transactions`)
- `window` (optional): Time window or `all` (default: `24h`)
  - Examples: `5m`, `30m`, `60m`, `24h`, `168h`, `all`
- `limit` (optional): Number of results (default: 10, max: 1000)

**Response:**
```json
[
  {
    "merchant_id": "173",
    "alias": "Bitcoin Coffee",
    "transactions": 450,
    "volume_sats": 1234567
  },
  ...
]
```

---

#### Product Leaderboard
```http
GET /v1/leaderboard/products?metric=volume&limit=10
```

**Query Parameters:**
- `metric` (optional): `transactions` or `volume` (default: `transactions`)
- `limit` (optional): Number of results (default: 10, max: 1000)

**Response:**
```json
[
  {
    "merchant_id": "173",
    "product_id": 480,
    "name": "Espresso",
    "transactions": 125,
    "volume_sats": 87500
  },
  ...
]
```

**Notes:**
- Product data is cumulative (all-time) from upstream API
- No time window filtering available

---

#### Milestone Triggers
```http
GET /v1/milestones/triggers?since=2025-11-10T00:00:00Z
```

**Query Parameters:**
- `since` (optional): RFC3339 timestamp (default: 24 hours ago)

**Response:**
```json
[
  {
    "id": 1,
    "milestone_id": 5,
    "name": "1 Million Sats",
    "type": "volume",
    "threshold": 1000000,
    "triggered_at": "2025-11-10T14:30:00Z",
    "total_transactions": 1523,
    "total_volume_sats": 1002340
  },
  ...
]
```

---

### Admin Endpoints (Authentication Required)

All admin endpoints require authentication via **Bearer token** or **X-Admin-Token** header.

**Authentication Methods:**

```bash
# Method 1: Bearer Token (recommended)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/v1/admin/merchants

# Method 2: Custom Header
curl -H "X-Admin-Token: YOUR_TOKEN" http://localhost:8080/v1/admin/merchants
```

---

#### Validate Admin Token
```http
POST /v1/admin/auth/login
Content-Type: application/json

{
  "token": "your-admin-token"
}
```

**Response (success):**
```json
{
  "status": "ok"
}
```

**Response (failure):**
```json
{
  "error": "invalid token"
}
```

---

#### List Merchants
```http
GET /v1/admin/merchants
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
[
  {
    "id": "173",
    "public_key": "9853874ed7ca145...",
    "alias": "Bitcoin Coffee",
    "enabled": true,
    "last_polled_at": "2025-11-10T14:25:00Z",
    "created_at": "2025-11-01T10:00:00Z",
    "updated_at": "2025-11-10T14:25:00Z"
  },
  ...
]
```

---

#### Create/Update Merchant
```http
POST /v1/admin/merchants
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "id": "173",
  "public_key": "9853874ed7ca145fd90d0711988a231dfb73e7447f58b67c052e230fd7336d5f",
  "alias": "Bitcoin Coffee",
  "enabled": true
}
```

**Response:**
```json
{
  "id": "173",
  "public_key": "9853874ed7ca145...",
  "alias": "Bitcoin Coffee",
  "enabled": true,
  "created_at": "2025-11-10T14:30:00Z",
  "updated_at": "2025-11-10T14:30:00Z"
}
```

**Notes:**
- Uses upsert logic: creates if new, updates if exists
- `enabled` defaults to `true` if not specified

---

#### Update Merchant Fields
```http
PUT /v1/admin/merchants/173
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "alias": "New Name",
  "enabled": false
}
```

**Response:**
```json
{
  "id": "173",
  "public_key": "9853874ed7ca145...",
  "alias": "New Name",
  "enabled": false,
  "last_polled_at": "2025-11-10T14:25:00Z",
  "created_at": "2025-11-01T10:00:00Z",
  "updated_at": "2025-11-10T14:35:00Z"
}
```

**Notes:**
- Only updates provided fields
- Set `enabled: false` to pause polling for a merchant

---

#### Force Merchant Refresh
```http
POST /v1/admin/merchants/173/refetch
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "status": "refreshing"
}
```

**Notes:**
- Triggers immediate poll for this merchant
- Bypasses normal polling schedule
- Returns immediately; poll happens in background

---

#### List Milestones
```http
GET /v1/admin/milestones
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "1 Million Sats",
    "type": "volume",
    "threshold": 1000000,
    "enabled": true,
    "triggered": true,
    "triggered_at": "2025-11-10T14:30:00Z",
    "created_at": "2025-11-01T10:00:00Z",
    "updated_at": "2025-11-10T14:30:00Z"
  },
  ...
]
```

---

#### Create Milestone
```http
POST /v1/admin/milestones
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "10,000 Transactions",
  "type": "transactions",
  "threshold": 10000,
  "enabled": true
}
```

**Response:**
```json
{
  "id": 5,
  "name": "10,000 Transactions",
  "type": "transactions",
  "threshold": 10000,
  "enabled": true,
  "triggered": false,
  "created_at": "2025-11-10T14:40:00Z",
  "updated_at": "2025-11-10T14:40:00Z"
}
```

**Milestone Types:**
- `transactions`: Total transaction count
- `volume`: Total volume in sats

---

#### Update Milestone
```http
PUT /v1/admin/milestones/5
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Updated Name",
  "type": "transactions",
  "threshold": 15000,
  "enabled": true,
  "reset_trigger": false
}
```

**Response:**
```json
{
  "id": 5,
  "name": "Updated Name",
  "type": "transactions",
  "threshold": 15000,
  "enabled": true,
  "triggered": false,
  "created_at": "2025-11-10T14:40:00Z",
  "updated_at": "2025-11-10T14:45:00Z"
}
```

**Reset Trigger:**
- Set `reset_trigger: true` to re-arm a triggered milestone
- Allows milestone to fire again when threshold is crossed

---

## Admin Workflows

### Initial Setup: Add Your First Merchant

1. **Get merchant credentials from PayWithFlash**
   - Merchant ID (e.g., "173")
   - Public key

2. **Add merchant via API:**

```bash
curl -X POST http://localhost:8080/v1/admin/merchants \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "173",
    "public_key": "9853874ed7ca145fd90d0711988a231dfb73e7447f58b67c052e230fd7336d5f",
    "alias": "Bitcoin Coffee",
    "enabled": true
  }'
```

3. **Verify polling started:**

```bash
# Check logs for polling messages
# You should see: "merchant 173 poll complete (new_tx=N)"

# Check data is ingesting
curl http://localhost:8080/v1/summary
```

### Using the Helper Script

```bash
cd scripts
chmod +x add_merchant.sh

./add_merchant.sh \
  "173" \
  "9853874ed7ca145fd90d0711988a231dfb73e7447f58b67c052e230fd7336d5f" \
  "Bitcoin Coffee" \
  "http://localhost:8080"
```

### Create Milestones

```bash
# Create "First 1000 transactions" milestone
curl -X POST http://localhost:8080/v1/admin/milestones \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "First 1000 Transactions",
    "type": "transactions",
    "threshold": 1000,
    "enabled": true
  }'

# Create "1 Million Sats Processed" milestone
curl -X POST http://localhost:8080/v1/admin/milestones \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "1 Million Sats",
    "type": "volume",
    "threshold": 1000000,
    "enabled": true
  }'
```

### Disable a Merchant (Pause Polling)

```bash
curl -X PUT http://localhost:8080/v1/admin/merchants/173 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### Force Immediate Refresh

```bash
curl -X POST http://localhost:8080/v1/admin/merchants/173/refetch \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Logging

### Request Logging

All HTTP requests are automatically logged with:
- Request ID (for tracing)
- Method and path
- Source IP
- Status code
- Response size
- Duration

**Example log output:**
```
2025/11/10 14:30:26 [dashboard] HTTP server listening on :8080
2025/11/10 14:30:30 [192.168.1.100/abc123-000001] "GET /v1/summary HTTP/1.1" from 192.168.1.100 - 200 193B in 2.5ms
2025/11/10 14:30:35 [192.168.1.100/abc123-000002] "POST /v1/admin/merchants HTTP/1.1" from 192.168.1.100 - 201 245B in 15.2ms
```

### Application Logging

**Polling logs:**
```
[dashboard] poller started (interval=30s)
[dashboard] merchant 173 poll complete (new_tx=5)
[dashboard] merchant 174 poll failed: upstream responded 500
```

**Milestone logs:**
Milestones are logged when triggered (check database for records).

### Production Logging

**Redirect to file:**
```bash
./server 2>&1 | tee -a /var/log/dashboard.log
```

**Use systemd journal:**
```bash
journalctl -u dashboard -f
```

**Structured logging:**
Consider adding a structured logging library like `slog` for JSON logs in production.

---

## Testing

### Run All Tests

```bash
go test ./...
```

**Output:**
```
ok  	github.com/adopting-bitcoin/dashboard/internal/api	0.440s
ok  	github.com/adopting-bitcoin/dashboard/internal/store	0.257s
ok  	github.com/adopting-bitcoin/dashboard/test	32.440s
```

### Run Tests with Verbose Output

```bash
go test -v ./...
```

### Run Specific Test Suite

```bash
# Store tests only
go test ./internal/store

# API handler tests only
go test ./internal/api

# Integration test with mock server
go test -v ./test -run TestFullIntegration
```

### Test Coverage

```bash
# Generate coverage report
go test -coverprofile=coverage.out ./...

# View coverage
go tool cover -html=coverage.out
```

### What's Tested

**Store Layer (`internal/store`):**
- ✅ Transaction idempotency (duplicate prevention)
- ✅ Milestone one-time triggers
- ✅ Database queries and schema

**API Layer (`internal/api`):**
- ✅ Health endpoint
- ✅ Summary endpoint
- ✅ Ticker endpoint
- ✅ Admin authentication (valid/invalid/missing tokens)
- ✅ Window parameter validation
- ✅ Request size limits
- ✅ Empty array serialization

**Integration Tests (`test/`):**
- ✅ Full system test with mock PayWithFlash server
- ✅ 20 diverse merchant profiles with realistic behavior
- ✅ Automatic transaction generation
- ✅ Data ingestion validation
- ✅ Idempotency verification
- ✅ Milestone trigger validation
- ✅ Leaderboard and ticker functionality

### Mock Testing System

For **testing backend robustness** and **visualizing the frontend with realistic data**, use the mock PayWithFlash server:

#### Quick Start: Run Integration Test

```bash
cd backend
go test -v ./test -run TestFullIntegration
```

This comprehensive test:
- Starts a mock PayWithFlash API with 20 merchants
- Generates realistic transactions that accumulate over time
- Validates all backend functionality (ingestion, idempotency, milestones)
- Takes ~30 seconds to complete

#### Frontend Development with Mock Data

Start a complete mock environment:

```bash
# From project root
./_tools/setup-mock.sh --with-frontend
```

This automatically:
1. Starts mock PayWithFlash server (port 9999)
2. Starts dashboard backend (port 8080, pointed to mock)
3. Adds 20 merchants with diverse behavior profiles
4. Creates test milestones
5. Starts frontend (port 5173)

Visit `http://localhost:5173` to see the dashboard with realistic live data.

#### Manual Mock Server

For more control:

```bash
# Terminal 1: Start mock server
cd backend
go run ./cmd/mockserver

# Terminal 2: Start backend (pointing to mock)
export SOURCE_BASE_URL="http://localhost:9999"
export POLL_INTERVAL="5s"
go run ./cmd/server

# Terminal 3: Add merchants and start frontend
# (see MOCK_TESTING.md for details)
```

#### Merchant Profiles

The mock system includes 20 pre-configured merchants:
- **Bitcoin Coffee**: High volume, low cost (2 tx/min)
- **Bitcoin Electronics**: Low volume, high cost (1 tx/20min)
- **Lightning Bistro**: Medium restaurant
- **Satoshi's Bar**: Popular drinks
- **24/7 Satoshi**: Convenience store, very high volume (3 tx/min)
- And 15 more diverse profiles...

Each merchant has unique characteristics:
- Different product catalogs (6-50 products)
- Varied price ranges ($0.60 - $900)
- Realistic transaction frequencies
- Anonymous transaction ratios
- Popular product concentrations

**For complete documentation**, see [MOCK_TESTING.md](MOCK_TESTING.md)

#### Mock Server Configuration

```bash
# Start with custom settings
go run ./cmd/mockserver \
  -addr :9999 \
  -interval 10s \
  -no-gen  # Disable auto-generation

# Mock server endpoints
GET  /user-pos/{id}?user_public_key={key}  # Merchant data
GET  /admin/merchants                       # List merchants
POST /admin/merchants/{id}/reset           # Reset merchant data
GET  /health                               # Health check
```

#### Use Cases

**1. Test High Transaction Volume**
```bash
go run ./cmd/mockserver -interval 2s  # Fast generation
# Backend will process 100+ tx/min
```

**2. Validate Milestone Triggers**
```bash
./_tools/setup-mock.sh
# Milestones will trigger within 1-2 minutes
curl http://localhost:8080/v1/milestones/triggers
```

**3. Frontend Visual Testing**
```bash
./_tools/setup-mock.sh --with-frontend
# See dashboard with realistic data
# - Rapidly updating ticker
# - Milestone celebrations
# - Leaderboard changes
# - Live transaction rate
```

**4. Backend Robustness Testing**
```bash
# Run integration test
go test -v ./test -run TestFullIntegration

# Validates:
# - Data ingestion
# - Idempotency (no duplicates)
# - Milestone processing
# - Leaderboard accuracy
# - Ticker functionality
```

---

## Security

### Production Security Checklist

- [x] **Strong Admin Token**: Use 32+ character random token
- [x] **CORS Configuration**: Set specific allowed origins
- [x] **HTTPS**: Run behind reverse proxy with TLS
- [x] **Rate Limiting**: Consider adding rate limiting middleware
- [x] **Request Size Limits**: Enforced (1MB max)
- [x] **Query Limits**: Enforced (1000 max)
- [x] **SQL Injection**: Protected via parameterized queries
- [x] **Timing Attacks**: Constant-time token comparison

### Security Features

**Request Size Limits:**
- Maximum request body: 1MB
- Prevents memory exhaustion attacks

**Query Limits:**
- Maximum limit parameter: 1000
- Prevents DoS via large result sets

**Constant-Time Auth:**
- Admin token comparison uses `crypto/subtle`
- Prevents timing attack vulnerabilities

**SQL Injection Protection:**
- All queries use parameterized statements
- No dynamic SQL construction from user input

### Recommended: Run Behind Reverse Proxy

**nginx example:**
```nginx
server {
    listen 443 ssl http2;
    server_name dashboard.example.com;

    ssl_certificate /etc/letsencrypt/live/dashboard.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Performance Tuning

### Polling Performance

**Concurrent Workers:**
```bash
# Poll 10 merchants concurrently
export POLL_CONCURRENCY=10
```

**Formula:**
- 10 merchants, 5 workers, 2s per poll = ~4s total cycle time
- 10 merchants, 1 worker (sequential) = ~20s total cycle time

**Recommendations:**
- Development: 1-3 workers
- Production (5-10 merchants): 5 workers
- Production (20+ merchants): 10 workers

### Database Performance

**Optimizations Applied:**
- ✅ Index on `transactions.merchant_id`
- ✅ Index on `transactions.sale_date DESC`
- ✅ SQLite WAL mode enabled
- ✅ Optimized summary query (1 query instead of 5)

**Large Databases:**
```bash
# If database grows > 1GB, consider vacuuming
sqlite3 dashboard.db "VACUUM;"
```

### Memory Optimization

**Adjust Query Limits:**
```bash
# Reduce memory for ticker/leaderboards
export TICKER_LIMIT=10
export LEADERBOARD_LIMIT=5
```

---

## Production Deployment

### Systemd Service

Create `/etc/systemd/system/dashboard.service`:

```ini
[Unit]
Description=POS Dashboard Backend
After=network.target

[Service]
Type=simple
User=dashboard
Group=dashboard
WorkingDirectory=/opt/dashboard
Environment="ADMIN_TOKEN=your-secure-token"
Environment="DB_PATH=/var/lib/dashboard/dashboard.db"
Environment="ADDR=:8080"
Environment="POLL_CONCURRENCY=10"
Environment="CORS_ORIGINS=https://dashboard.example.com"
ExecStart=/opt/dashboard/server
Restart=always
RestartSec=5

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/dashboard

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl enable dashboard
sudo systemctl start dashboard
sudo systemctl status dashboard
```

### Docker Deployment

**Dockerfile:**
```dockerfile
FROM golang:1.25-alpine AS builder
WORKDIR /build
COPY go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o server ./cmd/server

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /build/server .
EXPOSE 8080
CMD ["./server"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  dashboard:
    build: .
    ports:
      - "8080:8080"
    environment:
      - ADMIN_TOKEN=${ADMIN_TOKEN}
      - DB_PATH=/data/dashboard.db
      - CORS_ORIGINS=${CORS_ORIGINS}
    volumes:
      - ./data:/data
    restart: unless-stopped
```

### Health Checks

**Kubernetes liveness probe:**
```yaml
livenessProbe:
  httpGet:
    path: /v1/health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 30
```

---

## Troubleshooting

### Server Won't Start

**Error: `ADMIN_TOKEN must be set`**
```bash
# Solution: Set the required environment variable
export ADMIN_TOKEN="your-secure-token"
```

**Error: `address already in use`**
```bash
# Solution: Change port or kill existing process
export ADDR=":8081"
# OR
lsof -i :8080
kill <PID>
```

### Database Issues

**Error: `database is locked`**
- SQLite is single-writer
- Check if another process has the database open
- Ensure only one server instance is running

**Error: `no such table`**
- Database migration failed
- Delete `dashboard.db` and restart
- Check file permissions

### No Data Appearing

**Check 1: Are merchants configured?**
```bash
curl http://localhost:8080/v1/admin/merchants \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Check 2: Are merchants enabled?**
Look for `"enabled": true` in merchant list

**Check 3: Are polls succeeding?**
Check logs for "poll complete" messages or errors

**Check 4: Force a refresh**
```bash
curl -X POST http://localhost:8080/v1/admin/merchants/MERCHANT_ID/refetch \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Authentication Issues

**Error: `unauthorized`**
- Token mismatch
- Check `ADMIN_TOKEN` environment variable
- Verify Bearer token format: `Authorization: Bearer TOKEN`

**Token works in curl but not browser:**
- Check CORS settings
- Browser may be blocked by CORS policy
- Set `CORS_ORIGINS` to include your frontend domain

### Performance Issues

**Slow polls:**
- Increase `POLL_CONCURRENCY`
- Check network latency to PayWithFlash API
- Increase `HTTP_TIMEOUT` if requests time out

**High memory usage:**
- Reduce `TICKER_LIMIT` and `LEADERBOARD_LIMIT`
- Reduce `POLL_CONCURRENCY`
- Check for database growth (vacuum if needed)

---

## Architecture

### System Components

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │────────>│  Go Backend  │────────>│ PayWithFlash│
│  Dashboard  │         │   (this)     │         │     API     │
└─────────────┘         └──────────────┘         └─────────────┘
                               │
                               v
                        ┌──────────────┐
                        │    SQLite    │
                        │   Database   │
                        └──────────────┘
```

### Code Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go              # Application entry point
├── internal/
│   ├── api/
│   │   ├── server.go            # HTTP handlers & routing
│   │   └── server_test.go       # API integration tests
│   ├── config/
│   │   └── config.go            # Configuration loading
│   ├── ingest/
│   │   └── poller.go            # Background polling logic
│   └── store/
│       ├── store.go             # Database layer
│       └── store_test.go        # Database tests
├── scripts/
│   └── add_merchant.sh          # Helper script
├── go.mod
├── go.sum
└── README.md
```

### Data Flow

1. **Polling Cycle** (every 30s):
   - Poller fetches enabled merchants from database
   - Concurrent workers poll PayWithFlash API
   - Transactions inserted (idempotent)
   - Products upserted
   - Milestones checked and triggered

2. **API Request**:
   - HTTP request received
   - Authentication middleware (if admin endpoint)
   - Handler processes request
   - Database query executed
   - JSON response returned

3. **Milestone Processing**:
   - After each merchant poll
   - Calculate current totals
   - Check enabled, untriggered milestones
   - If threshold crossed: mark triggered + create trigger record
   - Once triggered, never fires again (unless reset by admin)

### Database Schema

**merchants**
- `id` (PK), `public_key`, `alias`, `enabled`
- `last_polled_at`, `created_at`, `updated_at`

**transactions**
- `id` (PK), `merchant_id` (FK), `sale_id`, `sale_origin`
- `sale_date`, `amount_sats`, `created_at`
- UNIQUE(`merchant_id`, `sale_id`) - ensures idempotency

**products**
- `merchant_id` (FK), `product_id` (PK composite)
- `name`, `currency`, `price`
- `total_transactions`, `total_revenue_sats`, `active`, `updated_at`

**milestones**
- `id` (PK), `name`, `type`, `threshold`, `enabled`
- `triggered_at`, `created_at`, `updated_at`

**milestone_triggers**
- `id` (PK), `milestone_id` (FK)
- `name`, `type`, `threshold`, `triggered_at`
- `total_transactions`, `total_volume_sats`

---

## Support

For issues, questions, or contributions:
- Check the [Troubleshooting](#troubleshooting) section
- Review logs for error messages
- Ensure all environment variables are set correctly
- Verify PayWithFlash API is accessible

---

## License

See project root for license information.
