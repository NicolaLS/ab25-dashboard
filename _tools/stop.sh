#!/usr/bin/env bash
#
# stop.sh - Stop the backend and frontend servers
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_PID_FILE="/tmp/dashboard-server.pid"
FRONTEND_PID_FILE="/tmp/dashboard-frontend.pid"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Adopting Bitcoin Dashboard - Stop Services${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

STOPPED_ANY=false

# Stop backend server
if [ -f "$SERVER_PID_FILE" ]; then
    SERVER_PID=$(cat "$SERVER_PID_FILE")
    if kill -0 "$SERVER_PID" 2>/dev/null; then
        echo -e "${YELLOW}→ Stopping backend server (PID: $SERVER_PID)...${NC}"
        kill "$SERVER_PID" 2>/dev/null || true
        sleep 1
        # Force kill if still running
        if kill -0 "$SERVER_PID" 2>/dev/null; then
            kill -9 "$SERVER_PID" 2>/dev/null || true
        fi
        echo -e "${GREEN}✓ Backend server stopped${NC}"
        STOPPED_ANY=true
    fi
    rm -f "$SERVER_PID_FILE"
fi

# Stop frontend server
if [ -f "$FRONTEND_PID_FILE" ]; then
    FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
    if kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo -e "${YELLOW}→ Stopping frontend server (PID: $FRONTEND_PID)...${NC}"
        kill "$FRONTEND_PID" 2>/dev/null || true
        sleep 1
        # Force kill if still running
        if kill -0 "$FRONTEND_PID" 2>/dev/null; then
            kill -9 "$FRONTEND_PID" 2>/dev/null || true
        fi
        echo -e "${GREEN}✓ Frontend server stopped${NC}"
        STOPPED_ANY=true
    fi
    rm -f "$FRONTEND_PID_FILE"
fi

if [ "$STOPPED_ANY" = false ]; then
    echo -e "${YELLOW}⚠ No running servers found${NC}"
else
    echo -e "\n${GREEN}✓ All services stopped${NC}"
fi
