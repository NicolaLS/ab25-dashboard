#!/usr/bin/env bash
#
# server.sh - Run the backend server
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PID_FILE="/tmp/dashboard-server.pid"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Adopting Bitcoin Dashboard - Backend Server${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check if server is already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo -e "${YELLOW}⚠ Backend server already running (PID: $OLD_PID)${NC}"
        echo -e "${YELLOW}→ Stopping existing server...${NC}"
        kill "$OLD_PID" 2>/dev/null || true
        sleep 1
        # Force kill if still running
        if kill -0 "$OLD_PID" 2>/dev/null; then
            kill -9 "$OLD_PID" 2>/dev/null || true
        fi
        echo -e "${GREEN}✓ Stopped existing server${NC}"
    fi
    rm -f "$PID_FILE"
fi

# Check if admin token exists
if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${YELLOW}⚠ No ADMIN_TOKEN found, generating one...${NC}"
    source "$SCRIPT_DIR/create-token.sh"
fi

echo -e "${GREEN}✓ Admin Token: $ADMIN_TOKEN${NC}"
echo -e "${BLUE}→ Starting backend server...${NC}\n"

# Cleanup on exit
cleanup() {
    rm -f "$PID_FILE"
}
trap cleanup EXIT INT TERM

cd "$PROJECT_ROOT/backend"

# Start server and store PID
go run ./cmd/server &
SERVER_PID=$!
echo $SERVER_PID > "$PID_FILE"

# Wait for the process
wait $SERVER_PID
