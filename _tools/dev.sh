#!/usr/bin/env bash
#
# dev.sh - Start both backend and frontend in development mode
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

SERVER_PID_FILE="/tmp/dashboard-server.pid"
FRONTEND_PID_FILE="/tmp/dashboard-frontend.pid"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Adopting Bitcoin Dashboard - Development Mode${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Always stop existing services first (ensures clean state)
echo -e "${YELLOW}→ Ensuring clean state...${NC}"
"$SCRIPT_DIR/stop.sh" > /dev/null 2>&1 || true
sleep 1
echo ""

# Function to check if port is free
check_port() {
    local port=$1
    local name=$2

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${RED}✗ Port $port is already in use ($name)${NC}"
        echo -e "${YELLOW}  Run ./_tools/stop.sh to stop all services${NC}"
        exit 1
    fi
}

# Verify ports are available
echo -e "${BLUE}→ Checking port availability...${NC}"
check_port 8080 "backend"
check_port 5173 "frontend"
echo -e "${GREEN}✓ Ports 8080 and 5173 are available${NC}\n"

# Check if admin token exists, if not create one
if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${YELLOW}⚠ No ADMIN_TOKEN found, generating one...${NC}"
    source "$SCRIPT_DIR/create-token.sh"
fi

echo -e "\n${GREEN}✓ Admin Token: $ADMIN_TOKEN${NC}\n"

# Start backend in background
echo -e "${BLUE}→ Starting backend server...${NC}"
(cd backend && ADMIN_TOKEN="$ADMIN_TOKEN" go run ./cmd/server) > /tmp/dashboard-backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$SERVER_PID_FILE"

# Wait for backend to be ready
echo -e "${BLUE}→ Waiting for backend to be ready...${NC}"
for i in {1..10}; do
    sleep 1
    if curl -s http://localhost:8080/v1/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend started successfully (PID: $BACKEND_PID)${NC}\n"
        break
    fi

    # Check if process died
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}✗ Backend failed to start${NC}"
        echo -e "${YELLOW}Last 20 lines of backend log:${NC}"
        tail -20 /tmp/dashboard-backend.log
        rm -f "$SERVER_PID_FILE"
        exit 1
    fi

    if [ $i -eq 10 ]; then
        echo -e "${RED}✗ Backend health check timeout${NC}"
        echo -e "${YELLOW}Backend process is running but not responding${NC}"
        echo -e "${YELLOW}Last 20 lines of backend log:${NC}"
        tail -20 /tmp/dashboard-backend.log
        kill $BACKEND_PID 2>/dev/null || true
        rm -f "$SERVER_PID_FILE"
        exit 1
    fi
done

# Start frontend in background
echo -e "${BLUE}→ Starting frontend dev server...${NC}"
(cd frontend && npm run dev) > /tmp/dashboard-frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$FRONTEND_PID_FILE"

# Wait a bit for frontend to start
sleep 2

# Check if frontend is running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}✗ Frontend failed to start${NC}"
    echo -e "${YELLOW}Last 20 lines of frontend log:${NC}"
    tail -20 /tmp/dashboard-frontend.log
    kill $BACKEND_PID 2>/dev/null || true
    rm -f "$SERVER_PID_FILE" "$FRONTEND_PID_FILE"
    exit 1
fi

echo -e "${GREEN}✓ Frontend started successfully (PID: $FRONTEND_PID)${NC}\n"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Development environment running!${NC}\n"
echo -e "  Dashboard:       ${BLUE}http://localhost:5173${NC}"
echo -e "  Dashboard Admin: ${BLUE}http://localhost:5173/?admin=true${NC}"
echo -e "  Backend API:     ${BLUE}http://localhost:8080${NC}"
echo -e "  Admin Token:     ${GREEN}$ADMIN_TOKEN${NC}"
echo -e "\n  Logs:"
echo -e "    Backend:  tail -f /tmp/dashboard-backend.log"
echo -e "    Frontend: tail -f /tmp/dashboard-frontend.log"
echo -e "\n  Press Ctrl+C to stop both services"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Stopping services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    rm -f "$SERVER_PID_FILE" "$FRONTEND_PID_FILE"
    exit
}

# Trap Ctrl+C and kill both processes
trap cleanup INT TERM EXIT

# Wait for both processes
wait
