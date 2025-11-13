#!/usr/bin/env bash
#
# stop.sh - Stop the backend and frontend servers
# Kills processes by PID files AND by checking ports/process names
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

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local name=$2

    # Find PIDs using the port
    local pids=$(lsof -ti :$port 2>/dev/null)

    if [ -n "$pids" ]; then
        echo -e "${YELLOW}→ Stopping $name on port $port...${NC}"
        echo "$pids" | xargs kill 2>/dev/null || true
        sleep 1

        # Force kill if still running
        pids=$(lsof -ti :$port 2>/dev/null)
        if [ -n "$pids" ]; then
            echo -e "${YELLOW}  Force killing...${NC}"
            echo "$pids" | xargs kill -9 2>/dev/null || true
        fi

        echo -e "${GREEN}✓ $name stopped${NC}"
        STOPPED_ANY=true
        return 0
    fi
    return 1
}

# Function to kill processes by pattern
kill_pattern() {
    local pattern=$1
    local name=$2

    local pids=$(pgrep -f "$pattern" 2>/dev/null)

    if [ -n "$pids" ]; then
        echo -e "${YELLOW}→ Stopping $name processes...${NC}"
        echo "$pids" | xargs kill 2>/dev/null || true
        sleep 1

        # Force kill if still running
        pids=$(pgrep -f "$pattern" 2>/dev/null)
        if [ -n "$pids" ]; then
            echo -e "${YELLOW}  Force killing...${NC}"
            echo "$pids" | xargs kill -9 2>/dev/null || true
        fi

        echo -e "${GREEN}✓ $name stopped${NC}"
        STOPPED_ANY=true
        return 0
    fi
    return 1
}

# Stop backend server (try PID file first, then port, then process pattern)
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

# Also check port 8080 for any remaining processes
kill_port 8080 "backend (port-based)"

# Also kill any remaining dashboard server processes
kill_pattern "go run ./cmd/server" "backend (process-based)"
kill_pattern "cmd/server/server" "backend (binary-based)"

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

# Also check port 5173 for any remaining processes
kill_port 5173 "frontend (port-based)"

# Also kill any vite processes
kill_pattern "vite" "frontend (process-based)"

# Kill mock servers too (port 9999)
if kill_port 9999 "mock server"; then
    :
fi
kill_pattern "cmd/mockserver" "mock server (process-based)"

if [ "$STOPPED_ANY" = false ]; then
    echo -e "${YELLOW}⚠ No running servers found${NC}"
else
    echo -e "\n${GREEN}✓ All services stopped${NC}"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
