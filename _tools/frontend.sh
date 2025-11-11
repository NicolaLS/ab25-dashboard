#!/usr/bin/env bash
#
# frontend.sh - Run the frontend development server
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PID_FILE="/tmp/dashboard-frontend.pid"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Adopting Bitcoin Dashboard - Frontend Dev Server${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check if frontend is already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo -e "${YELLOW}⚠ Frontend server already running (PID: $OLD_PID)${NC}"
        echo -e "${YELLOW}→ Stopping existing frontend...${NC}"
        kill "$OLD_PID" 2>/dev/null || true
        sleep 1
        # Force kill if still running
        if kill -0 "$OLD_PID" 2>/dev/null; then
            kill -9 "$OLD_PID" 2>/dev/null || true
        fi
        echo -e "${GREEN}✓ Stopped existing frontend${NC}"
    fi
    rm -f "$PID_FILE"
fi

echo -e "${BLUE}→ Starting frontend...${NC}\n"

# Cleanup on exit
cleanup() {
    rm -f "$PID_FILE"
}
trap cleanup EXIT INT TERM

cd "$PROJECT_ROOT/frontend"

# Start frontend and store PID
npm run dev &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$PID_FILE"

# Wait for the process
wait $FRONTEND_PID
