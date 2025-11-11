# Development Tools

Utility scripts to simplify development and deployment of the Adopting Bitcoin Dashboard.

## Quick Start

```bash
# Initial setup (run once)
./_tools/setup.sh

# Start full dev environment
./_tools/dev.sh

# Or start services separately
./_tools/server.sh    # Backend only
./_tools/frontend.sh  # Frontend only
```

## Available Scripts

### `setup.sh`
**Initial project setup**

Performs first-time setup:
- Checks Go and Node.js installations
- Installs backend dependencies (`go mod download`)
- Installs frontend dependencies (`npm install`)
- Runs backend tests to verify setup
- Generates admin token
- Creates `.env` file with sensible defaults

```bash
./_tools/setup.sh
```

Run this once after cloning the repository.

---

### `dev.sh`
**Start full development environment**

Starts both backend and frontend in development mode:
- Automatically stops any existing instances
- Generates admin token if not set
- Starts Go backend server (`:8080`)
- Starts Vite frontend dev server (`:5173`)
- Shows both services' logs
- Press `Ctrl+C` to stop both
- Stores PIDs in `/tmp/dashboard-*.pid`

```bash
./_tools/dev.sh
```

Requires `ADMIN_TOKEN` environment variable (auto-generated if missing).

---

### `server.sh`
**Run backend server only**

Starts just the Go backend API server:
- Automatically stops any existing backend instance
- Generates admin token if not set
- Runs `go run ./cmd/server`
- Listens on port `:8080` (configurable via `ADDR` env var)
- Stores PID in `/tmp/dashboard-server.pid`

```bash
./_tools/server.sh
```

Useful when you only need the API or want to run frontend separately.

---

### `frontend.sh`
**Run frontend dev server only**

Starts just the Vite frontend development server:
- Automatically stops any existing frontend instance
- Runs `npm run dev`
- Listens on port `:5173`
- Hot module reloading enabled
- Stores PID in `/tmp/dashboard-frontend.pid`

```bash
./_tools/frontend.sh
```

Requires backend to be running separately on `:8080`.

---

### `stop.sh`
**Stop all running services**

Stops both backend and frontend servers gracefully:
- Reads PID files to find running processes
- Sends SIGTERM first, then SIGKILL if needed
- Cleans up PID files
- Safe to run even if services aren't running

```bash
./_tools/stop.sh
```

Useful for stopping services started in the background.

---

### `create-token.sh`
**Generate new admin token**

Creates a cryptographically secure random admin token:
- Uses `openssl rand -hex 24`
- Exports `ADMIN_TOKEN` environment variable
- Displays usage instructions

```bash
# Generate and export in current shell
source ./_tools/create-token.sh

# Or just generate without exporting
./_tools/create-token.sh
```

---

### `print-token.sh`
**Display current admin token**

Shows the current `ADMIN_TOKEN` with usage examples:
- Displays token value
- Shows curl examples for API authentication
- Exits with error if no token is set

```bash
./_tools/print-token.sh
```

---

### `reset-db.sh`
**Reset database**

Deletes the SQLite database file:
- Prompts for confirmation
- Deletes `backend/data/dashboard.db`
- Database will be recreated on next server start

```bash
./_tools/reset-db.sh
```

**WARNING:** This deletes all merchants, transactions, products, and milestones.

---

### `build.sh`
**Production build**

Builds both backend and frontend for production:
- Compiles Go binary to `dist/dashboard-server`
- Builds frontend assets to `frontend/dist/`
- Optimized for production deployment

```bash
./_tools/build.sh
```

---

### `test.sh`
**Run all tests**

Executes test suites for both backend and frontend:
- Runs `go test -v ./...` for backend
- Runs `npm test` for frontend (if configured)
- Reports pass/fail status

```bash
./_tools/test.sh
```

---

## Typical Workflows

### First Time Setup
```bash
# 1. Clone repository
git clone <repo-url>
cd dashboard

# 2. Run setup
./_tools/setup.sh

# 3. Start development
./_tools/dev.sh
```

### Daily Development
```bash
# Export admin token (if not in .env or shell)
export ADMIN_TOKEN="your-token-here"

# Start dev environment
./_tools/dev.sh

# Or run separately in different terminals
./_tools/server.sh    # Terminal 1
./_tools/frontend.sh  # Terminal 2
```

### Testing Changes
```bash
# Run tests before committing
./_tools/test.sh

# Run just backend tests
cd backend && go test ./...

# Run just frontend tests (if configured)
cd frontend && npm test
```

### Production Deployment
```bash
# Build for production
./_tools/build.sh

# Binary and frontend assets are ready
dist/dashboard-server
frontend/dist/
```

### Troubleshooting
```bash
# Stop all running services
./_tools/stop.sh

# Check current token
./_tools/print-token.sh

# Generate new token
source ./_tools/create-token.sh

# Reset database if corrupted
./_tools/reset-db.sh

# Kill processes on ports if services won't start
lsof -ti:8080 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend

# Clean rebuild
rm -rf backend/data frontend/dist backend/dist
./_tools/build.sh
```

---

## Environment Variables

These scripts respect standard environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_TOKEN` | Admin authentication token | Auto-generated |
| `ADDR` | Backend server address | `:8080` |
| `DB_PATH` | SQLite database path | `./data/dashboard.db` |
| `POLL_INTERVAL` | Merchant polling interval | `5m` |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |

See `backend/.env` (created by `setup.sh`) for full configuration options.

---

## Requirements

- **Go 1.21+** - Backend runtime
- **Node.js 18+** - Frontend build tooling
- **Bash 4+** - Script execution
- **openssl** - Token generation (usually pre-installed)

---

## Notes

### Process Management
- All start scripts (`dev.sh`, `server.sh`, `frontend.sh`) automatically stop existing instances before starting
- PID files are stored in `/tmp/dashboard-*.pid` for easy process tracking
- Each script can be safely re-run without causing port conflicts
- Use `stop.sh` to cleanly stop all services at any time
- PID files are automatically cleaned up on normal exit

### General
- All scripts use color output for better readability
- Scripts set `set -e` to fail fast on errors
- Paths are resolved relative to project root
- Scripts can be run from any directory
- Token generation uses cryptographically secure random
