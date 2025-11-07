# Live POS Dashboard — Frontend

React + Vite single-page app that consumes the Go backend (`/backend`) and renders both the venue loop (16:9, hands-free) and a lightweight attendee view.

## Getting Started

```bash
cd frontend
npm install          # install dependencies
npm run dev          # start Vite on http://localhost:5173
# or build for production
npm run build
```

### Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | same origin (dev proxy → `http://localhost:8080`) | Backend base URL; set when frontend and API live on different hosts |
| `VITE_PRICE_API_URL` | CoinGecko simple price | Optional override for BTC/USD source |

Add them to a `.env.local` file if required.

## Modes

- **Venue (default):** 16:9 auto-rotating scenes (overview, merchant/product leaderboards, trends). Use `?mode=attendee` to switch modes.
- **Attendee:** static layout tuned for phones; still read-only.

## Key Features

- KPI grid, ticker, and sparkline/trend visualizations driven by `/v1/summary`, `/v1/ticker`, and derived trend data.
- Merchant/product leaderboards call `/v1/leaderboard/*` with the selected time window.
- Milestone overlay listens to `/v1/milestones/triggers` and interrupts the loop once per new event.
- BTC price fetched from CoinGecko to show sats + USD conversions inline.
- Configurable time window selector, stale/offline indicator, and reduced-motion support.

## Linking with the Backend

1. Start the Go server (`cd backend && ADMIN_TOKEN=... go run ./cmd/server`).
2. Seed merchants via the provided admin API or `scripts/add_merchant.sh`.
3. Run `npm run dev` inside `frontend`.
4. Open `http://localhost:5173` for the venue view or append `?mode=attendee` for the attendee layout.

The dev server proxies `/v1/*` to `VITE_API_BASE_URL` (default `http://localhost:8080`), so API calls stay same-origin during development. For production, run `npm run build` and deploy the `dist` folder alongside or in front of the Go backend.
