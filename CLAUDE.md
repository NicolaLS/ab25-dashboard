# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A live POS dashboard system for displaying real-time Bitcoin transaction data from PayWithFlash merchants. Consists of:
- **Backend**: Go server that polls PayWithFlash API, stores data in SQLite, and exposes REST APIs
- **Frontend**: React + TypeScript dashboard with auto-rotating venue view and mobile attendee view

## Development Commands

### Initial Setup
```bash
./_tools/setup.sh       # First-time setup: installs dependencies, creates .env, generates token
```

### Development
```bash
./_tools/dev.sh         # Start both backend + frontend
./_tools/server.sh      # Backend only (port 8080)
./_tools/frontend.sh    # Frontend only (port 5173)
```

### Backend Commands
```bash
cd backend
go run ./cmd/server                    # Run server
go test ./...                          # Run all tests
go test -v ./internal/store            # Store layer tests only
go test -v ./internal/api              # API handler tests only
go test -run TestSpecificTest ./...    # Run specific test
```

### Frontend Commands
```bash
cd frontend
npm run dev            # Dev server (port 5173)
npm run build          # Production build
npm run lint           # Run ESLint
npm run preview        # Preview production build
```

### Utility Commands
```bash
./_tools/test.sh           # Run all tests (backend + frontend)
./_tools/build.sh          # Production build (both)
./_tools/create-token.sh   # Generate new admin token
./_tools/print-token.sh    # Show current admin token
./_tools/reset-db.sh       # Delete database (prompts for confirmation)
```

### Admin API Examples
```bash
# List merchants
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8080/v1/admin/merchants

# Add merchant
curl -X POST http://localhost:8080/v1/admin/merchants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id":"173","public_key":"...","alias":"Bitcoin Coffee","enabled":true}'

# Force merchant refresh
curl -X POST http://localhost:8080/v1/admin/merchants/173/refetch \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Create milestone
curl -X POST http://localhost:8080/v1/admin/milestones \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"1M Sats","type":"volume","threshold":1000000,"enabled":true}'
```

## Architecture

### Backend Structure (`backend/`)
```
cmd/server/main.go          # Entry point, wires components together
internal/
  api/server.go             # HTTP handlers, routing, CORS, auth middleware
  api/server_test.go        # Integration tests for all endpoints
  config/config.go          # Environment variable loading
  ingest/poller.go          # Background polling of PayWithFlash API
  store/store.go            # SQLite database layer with all queries
  store/store_test.go       # Tests for idempotency and milestone triggers
```

**Key Backend Patterns:**
- Uses `chi` router with middleware for auth, logging, CORS
- Admin endpoints require Bearer token (constant-time comparison)
- Polling runs concurrently using worker pool pattern
- Transactions are idempotent via UNIQUE constraint on (merchant_id, sale_id)
- Milestones trigger once and never replay unless manually reset
- All queries use parameterized statements (no SQL injection)

### Frontend Structure (`frontend/src/`)
```
App.tsx                     # Main app, handles venue vs attendee mode
main.tsx                    # Entry point
context/DashboardContext.tsx # Global state (time window, reduced motion)
hooks/
  useDashboardQueries.ts    # React Query hooks for API calls
  useMilestoneAlerts.ts     # Polls for new milestone triggers
  useBtcPrice.ts            # Polls CoinGecko for BTC/USD price
  useSceneRotation.ts       # Auto-rotation timer for venue mode
api/client.ts               # Fetch wrappers for all backend endpoints
components/
  scenes/                   # Individual carousel scenes (Overview, Trends, etc.)
  SceneCarousel.tsx         # Scene rotation orchestrator
  MilestoneOverlay.tsx      # Full-screen celebration overlay
  DashboardHeader.tsx       # Top bar with logo, clock, time window
  Ticker.tsx                # Live transaction ticker
  TrendsChart.tsx           # Recharts time-series chart
utils/
  data.ts                   # Data transformation, trend series builder
  format.ts                 # Number formatting (sats, USD, compact notation)
  timeWindow.ts             # Time window parsing
types.ts                    # TypeScript interfaces for API responses
```

**Key Frontend Patterns:**
- React Query for data fetching with polling (`refetchInterval`)
- Venue mode: auto-rotating scenes, milestone overlays interrupt rotation
- Attendee mode: static single-page view for mobile
- Uses `?mode=attendee` query param to switch modes
- Milestone alerts only show triggers received after page load (no backfill)
- BTC/USD price fetched from CoinGecko, cached, with fallback handling
- All sats values display with optional USD conversion inline

### Style and Design Guide

- Design **for large screens** (TV/Projector) the dashboard is shown on a large screen at a conference and has to be optimal for this.
- Design **non-interactively** since the dashboard is going to be displayed on a large screen. Scenes should automatically swap.

### Data Flow
1. **Polling**: Backend polls enabled merchants every 30s (configurable), inserts transactions, updates products, checks milestones
2. **Frontend Queries**: React Query polls summary, ticker, leaderboards, milestone triggers
3. **Venue Loop**: Scenes rotate every N seconds, paused during milestone celebrations
4. **Milestone Interrupt**: When new trigger detected, show overlay once, play effect, resume rotation

## Environment Variables

### Backend (see `backend/README.md` for full list)
- `ADMIN_TOKEN` (required): Bearer token for admin endpoints
- `ADDR`: Listen address (default `:8080`)
- `DB_PATH`: SQLite database path (default `dashboard.db`)
- `POLL_INTERVAL`: Polling frequency (default `30s`)
- `POLL_CONCURRENCY`: Concurrent workers (default `5`)
- `CORS_ORIGINS`: Comma-separated origins (default `*`)
- `TICKER_LIMIT`: Default ticker size (default `20`)
- `LEADERBOARD_LIMIT`: Default leaderboard size (default `10`)

### Frontend
- `VITE_API_BASE_URL`: Override backend URL (defaults to current origin)

## Database Schema (SQLite)

**merchants**: `id`, `public_key`, `alias`, `enabled`, `last_polled_at`, `created_at`, `updated_at`

**transactions**: `id`, `merchant_id`, `sale_id`, `sale_origin`, `sale_date`, `amount_sats`, `created_at`
- UNIQUE constraint on (`merchant_id`, `sale_id`) ensures idempotency

**products**: `merchant_id`, `product_id`, `name`, `currency`, `price`, `total_transactions`, `total_revenue_sats`, `active`, `updated_at`

**milestones**: `id`, `name`, `type` (transactions/volume), `threshold`, `enabled`, `triggered_at`, `created_at`, `updated_at`

**milestone_triggers**: `id`, `milestone_id`, `name`, `type`, `threshold`, `triggered_at`, `total_transactions`, `total_volume_sats`

Schema auto-migrates on server startup.

## API Endpoints

### Public (No Auth)
- `GET /v1/health` - Health check
- `GET /v1/summary` - Dashboard metrics (totals, rates, counts)
- `GET /v1/ticker?limit=N` - Latest transactions
- `GET /v1/leaderboard/merchants?metric=transactions|volume&window=5m|30m|60m|24h|all` - Merchant leaderboard
- `GET /v1/leaderboard/products?metric=transactions|volume` - Product leaderboard (all-time)
- `GET /v1/milestones/triggers?since=RFC3339` - Triggered milestones

### Admin (Require Bearer Token)
- `POST /v1/admin/auth/login` - Validate token
- `GET /v1/admin/merchants` - List merchants
- `POST /v1/admin/merchants` - Create/update merchant (upsert)
- `PUT /v1/admin/merchants/:id` - Update merchant fields
- `POST /v1/admin/merchants/:id/refetch` - Force immediate poll
- `GET /v1/admin/milestones` - List milestones
- `POST /v1/admin/milestones` - Create milestone
- `PUT /v1/admin/milestones/:id` - Update milestone (supports `reset_trigger`)

## Testing

### Backend Tests
- **Store tests** (`internal/store/store_test.go`): Idempotency, milestone one-time triggers
- **API tests** (`internal/api/server_test.go`): All endpoints, auth, validation, limits

When writing new backend code:
- Add tests for new store methods in `store_test.go`
- Add handler tests in `server_test.go`
- Test error cases (invalid auth, missing params, etc.)

### Frontend Tests
Frontend uses Playwright for E2E testing (installed as dev dependency).

## Code Style & Conventions

### Backend (Go)
- Use structured returns (named result parameters for complex functions)
- Middleware pattern for cross-cutting concerns (auth, logging)
- Errors returned, not panicked (except startup failures)
- Use `context.Context` for cancellation
- Database queries use `*sql.Tx` for transactions where needed

### Frontend (TypeScript/React)
- Functional components with hooks
- Types imported from `types.ts`
- API client functions in `api/client.ts`
- Custom hooks in `hooks/` directory
- Context for global state (avoid prop drilling)
- Use React Query for server state
- Format numbers with utility functions (`format.ts`)

## Important Implementation Details

### Milestone Behavior
- Milestones trigger **once** when threshold crossed
- Frontend only shows triggers received **after page load** (no backfill on refresh)
- Overlay interrupts scene rotation, plays effect, then resumes
- Admin can reset trigger via `PUT /v1/admin/milestones/:id` with `reset_trigger: true`

### Idempotency
- Transactions use UNIQUE constraint on (merchant_id, sale_id)
- Upstream API returns full dataset each poll (no filtering)
- Backend must handle duplicate inserts gracefully
- Products use upsert pattern (INSERT ... ON CONFLICT UPDATE)

### Time Windows
- Frontend supports `5m`, `30m`, `60m`, `24h`, `all`
- Backend calculates rates over `RATE_WINDOW` (default 5m)
- Leaderboards support time filtering via `window` param
- Products are cumulative (all-time), no time filtering

### BTC/USD Price
- Fetched from CoinGecko API
- Cached in frontend, polled periodically
- Fallback on error (show last known price or hide conversion)
- Used to display inline USD conversions next to sats values

## Troubleshooting

### Backend won't start
- Check `ADMIN_TOKEN` is set (`export ADMIN_TOKEN="..."`)
- Check port 8080 is not in use (`lsof -i :8080`)
- Check database file permissions

### No data appearing
- Verify merchants are added and enabled (`curl /v1/admin/merchants`)
- Check logs for polling errors
- Force refresh: `POST /v1/admin/merchants/:id/refetch`
- Verify PayWithFlash API is accessible

### Frontend not connecting
- Check backend is running on port 8080
- Check CORS settings if frontend on different origin
- Check browser console for fetch errors

### Database locked
- Only one server instance can write
- Stop other instances or use different DB_PATH

### Tests failing
- Ensure no other server is running on port 8080
- Run `go clean -testcache` to clear test cache
- Check test database is not locked
