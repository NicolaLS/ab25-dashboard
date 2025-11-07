# Project brief — Go backend for live POS dashboard

## Overview

Build a small Go server that **polls** per-merchant POS data and exposes a **JSON REST API** for a live dashboard. Include an **authenticated Admin API** to manage merchants and milestone rules. Keep it simple and pragmatic.

## Tech

* **Language:** Go
* **Database:** SQLite via `modernc.org/sqlite`
* **API:** REST + JSON, versioned (e.g., `/v1`)
* **Style:** clean, minimal layering; avoid over-engineering

## Data ingestion (polling only)

* Source (per merchant):
  `GET https://api.paywithflash.com/user-pos/<id>?user_public_key=<pk>`
  (see `example.json` for shape)
* Constraints:

  * Upstream provides **full data every time** (no filtering/paging).
  * **Do not assume JSON order.**
* Requirements:

  * Poll on a schedule; allow per-merchant enable/disable.
  * Make ingestion **idempotent** (dedupe by stable transaction key).
  * Provide an admin endpoint to **force a refresh** for a merchant.

## Dashboard metrics (expose via REST)

* Total transactions
* Total volume (sats)
* Average transaction size
* Active merchants / Total merchants
* Unique products / Total unique products
* Transactions per minute
* Volume (sats) per minute
* **Live ticker** (latest transactions; short text rows)
* Leaderboards:

  * Merchants by transactions / by volume
  * Products by transactions / by volume

## Milestones (one-time effects)

* Examples: “1,000,000 sats processed”, “1,000 transactions processed”.
* Admins can create/edit/enable/disable milestones for:

  * Total transactions
  * Total volume (sats)
* The server records **once** when thresholds are crossed and exposes these triggers for the dashboard.

## REST API (high-level)

* **Public (read-only):**

  * `/v1/health`
  * `/v1/summary` (totals, rates, counts)
  * `/v1/ticker` (latest N)
  * `/v1/leaderboard/merchants` (by tx/volume; time window)
  * `/v1/leaderboard/products` (by tx/volume; time window)
  * `/v1/milestones/triggers` (since timestamp)
* **Admin (auth required):**

  * `/v1/admin/auth/*` (login/logout or token)
  * `/v1/admin/merchants` (list/create/update: `id`, `public_key`, `alias`, enabled)
  * `/v1/admin/merchants/{id}/refetch` (force poll now)
  * `/v1/admin/milestones` (list/create/update/enable/disable)
  * Optional: `/v1/admin/summary`

*(Keep routes ergonomic and consistent; exact shapes are up to the implementer.)*

## Efficiency & reliability (guidelines)

* Optimize polling with **dedupe** to avoid reprocessing unchanged data.
* Keep dashboard reads fast (lightweight aggregation where helpful).
* Ensure milestone triggers are **non-replaying**.
* Basic logging, sensible timeouts, and minimal rate-limiting on admin endpoints.

## Admin workflow

* To add a merchant, admin provides: `<id>`, `<pk>`, and display name `alias`.
* The system uses these to poll the per-merchant endpoint and include the merchant in ingestion.

## Deliverables / acceptance

* Running Go server with:

  * Public dashboard API returning the metrics above
  * Authenticated Admin API for merchants and milestones
  * **Polling-only** ingestion that is idempotent
  * SQLite storage using `modernc.org/sqlite`
* Short README (run/config, env vars, DB path)
* Simple tests for ingestion dedupe and “trigger once” milestones

