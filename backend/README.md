# Live POS Dashboard — Go Backend

This service polls PayWithFlash POS data for a configured set of merchants, stores the information in SQLite and exposes public dashboard APIs plus authenticated admin endpoints.

## Features
- Configurable merchant list with per-merchant enable/disable.
- Background polling with idempotent transaction ingestion and product snapshots.
- REST API for dashboard metrics, live ticker, leaderboards and milestone triggers.
- Admin API (token-based) for managing merchants/milestones and forcing refreshes.
- Milestone engine that records one-time triggers for total transactions or volume.
- SQLite storage via `modernc.org/sqlite`.
- Tests covering ingestion dedupe and milestone triggering.

## Getting started

### Requirements
- Go 1.21+ (tested with 1.25).
- No CGO needed thanks to `modernc.org/sqlite`.

### Configuration

Environment variables (defaults shown):

| Variable | Description | Default |
| --- | --- | --- |
| `ADDR` | HTTP listen address | `:8080` |
| `DB_PATH` | Path to SQLite database file | `dashboard.db` |
| `ADMIN_TOKEN` | **Required** admin bearer token | none |
| `SOURCE_BASE_URL` | Base URL for PayWithFlash API | `https://api.paywithflash.com` |
| `POLL_INTERVAL` | Background poll interval | `30s` |
| `HTTP_TIMEOUT` | Upstream fetch timeout | `10s` |
| `RATE_WINDOW` | Time window for rate calculations | `5m` |
| `TICKER_LIMIT` | Default ticker row count | `20` |
| `LEADERBOARD_LIMIT` | Default leaderboard size | `10` |

### Run

```bash
export ADMIN_TOKEN=supersecret
go run ./cmd/server
```

The server automatically migrates the SQLite database and starts polling enabled merchants. Add merchants via the admin API:

```
POST /v1/admin/merchants
Authorization: Bearer $ADMIN_TOKEN
{
  "id": "173",
  "public_key": "9853...",
  "alias": "Flash Merchant"
}
```

### REST overview

Public endpoints:
- `GET /v1/health`
- `GET /v1/summary`
- `GET /v1/ticker?limit=20`
- `GET /v1/leaderboard/merchants?metric=transactions|volume&window=24h`
- `GET /v1/leaderboard/products?metric=transactions|volume` *(uses upstream cumulative product stats)*
- `GET /v1/milestones/triggers?since=RFC3339`

Admin endpoints (Bearer `ADMIN_TOKEN` or `X-Admin-Token` header):
- `POST /v1/admin/auth/login`
- `GET/POST /v1/admin/merchants`
- `PUT /v1/admin/merchants/{id}`
- `POST /v1/admin/merchants/{id}/refetch`
- `GET/POST /v1/admin/milestones`
- `PUT /v1/admin/milestones/{id}` (set `reset_trigger=true` to re-arm)
- `GET /v1/admin/summary`

### Testing

```bash
go test ./internal/store
```

The suite focuses on ingestion dedupe guarantees and ensuring milestone triggers fire only once per threshold. Running `go test ./...` is also supported.

## Notes & assumptions
- The upstream product payload contains cumulative totals only, so product leaderboards are global rather than time-windowed.
- Milestones currently support total transactions or total volume (sats); more dimensions can be added via the same pattern.
- Polling is sequential per cycle to stay gentle on the upstream API; adjust `POLL_INTERVAL` as needed.
