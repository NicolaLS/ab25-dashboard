# Frontend Project Brief — Live POS Dashboard

## Goal

Build a **non-interactive, venue-first** live dashboard that cycles through high-signal views of POS activity. It must be readable from a distance, run hands-free, and optionally be accessible by attendees on their phones (secondary).

---

## Recommended Stack (high level)

* **Framework:** React + TypeScript
* **Build:** Vite (fast dev & easy static hosting)
* **Styling:** Your choice of utility CSS or design tokens (e.g., Tailwind or CSS variables); emphasize a dark theme and tabular numerals
* **Charts:** Lightweight React charting (sparklines + simple time series)
* **State/Queries:** Minimal client state + a query library for polling/caching
* **Transport:** Read-only REST from our backend; support SSE/WebSocket if exposed later

*(Keep the implementation minimal—no heavy component kits. Optimize for legibility and stability.)*

---

## Data Sources (high level)

* **Our backend (read-only):** summary, ticker, leaderboards, time-series, milestone triggers (names as agreed with the backend team)
* **BTC/USD price:** reputable public source (e.g., CoinGecko). Use it to **display price** and **convert sats → USD** inline (e.g., “Total Volume: 1,234,567 sats · $XYZ”). Add light caching and a fallback.

---

## Primary Mode: Venue (Non-Interactive)

### Layout & Display

* **Aspect:** 16:9, optimized for 1080p/4K
* **Typography:** large, high-contrast, **tabular numerals**
* **Global header:** Event/brand, selected time window (e.g., “Live · Last 60 min”), clock, and “Last updated” indicator

### Scene Playlist (auto-rotation)

* **Overview:** KPI cards (Totals, Volume (sats), Avg Tx, Active/Total Merchants, Unique Products, Tx/min, Vol/min), **Live Ticker** on the side, small sparklines
* **Merchants Leaderboard:** alternate “by Transactions” and “by Volume”; top N with pagination if needed
* **Products Leaderboard:** same pattern as merchants
* **Trends:** clean time-series for Tx/min and Vol/min over the selected window
* **Milestone Spotlight (interrupt):** full-screen effect + large overlay (see below)

### Milestones (one-time, live-only)

* When a milestone event arrives **after page load**, interrupt the playlist **once**, play a **single celebratory effect** (confetti/fireworks/spotlight/sats-rain; pick randomly), show a large centered overlay (title, value, time), then resume.
* Do **not** replay on refresh; no backfilling old milestones.

### Motion & Accessibility

* Smooth fades; subtle number tweens; no strobe effects
* Reduced-motion configuration shows a static celebratory frame
* Clear stale/offline state (freeze data, show a small banner)

---

## Secondary Mode: Attendee (Mobile/Web)

* Single page or two compact tabs:

  * **Overview:** KPIs, compact ticker, top-N combined leaderboard
  * Optional **Trends** mini chart
* Read-only; conservative refresh cadence; lightweight assets

---

## BTC/USD Price & Conversions (UI)

* **Header:** current BTC/USD price (compact, unobtrusive)
* **Inline:** show sats as primary; add smaller **converted USD** beside key figures (e.g., Total Volume, leaderboards rows, ticker if space allows)
* **Behavior:** gently update when price changes; avoid jitter

---

## Theming & Readability (design guardrails)

* Dark background, high contrast, one accent color for sats (e.g., orange)
* Large type scale for distance viewing; consistent spacing
* Number formatting: thousands separators, compact notation for big values (1.2M)
* Truncation for long names in ticker/leaderboards with ellipsis

---

## Data Freshness (UX, not implementation)

* Venue loop auto-refreshes data when each scene becomes active
* Ticker updates frequently; aggregates less frequently (stable look)
* “Last updated” clock visible; reconnect indicator if stale

---

## Configuration (high level)

* Time window presets (5m / 30m / 60m / 24h)
* Scene order and duration per scene
* Leaderboard page size
* Effects on/off, reduced-motion toggle
* BTC price polling interval and fallback

---

## Acceptance Criteria (high level)

* Venue loop runs hands-free at 1080p/4K; all content legible from distance
* Scenes rotate smoothly; milestone spotlight interrupts once and never replays
* KPIs, ticker, leaderboards, and trends reflect backend data accurately
* BTC price visible; major totals show sats **and** USD conversion
* Clear stale/offline state; app recovers gracefully
* Attendee view loads fast and remains read-only

If you want, I can also provide quick wireframes for each scene to align on layout before the build.

