#!/bin/bash

# Setup script for mock testing environment
# This script:
# 1. Starts the mock PayWithFlash server
# 2. Starts the dashboard backend (pointing to mock server)
# 3. Adds all 20 mock merchants to the backend
# 4. Optionally starts the frontend

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if admin token is set
if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${YELLOW}Warning: ADMIN_TOKEN not set. Generating one...${NC}"
  export ADMIN_TOKEN=$("$SCRIPT_DIR/create-token.sh" 2>/dev/null || echo "test-admin-token")
  echo -e "${GREEN}Using ADMIN_TOKEN: $ADMIN_TOKEN${NC}"
fi

# Check if we should start frontend
START_FRONTEND=false
if [ "$1" = "--with-frontend" ]; then
  START_FRONTEND=true
fi

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Mock Testing Environment Setup${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Always stop existing services first (ensures clean state)
echo -e "${GREEN}→ Ensuring clean state (stopping any existing services)...${NC}"
# Use the robust stop script to clean up
"$SCRIPT_DIR/stop.sh" > /dev/null 2>&1 || true
sleep 1
echo -e "${GREEN}✓ Clean state ensured${NC}"
echo ""

# Start mock server
echo ""
echo -e "${GREEN}[1/4] Starting mock PayWithFlash server on :9999...${NC}"
cd "$ROOT_DIR/backend"
# Use faster generation interval (3s) for more visible activity
go run ./cmd/mockserver -interval 3s &
MOCK_PID=$!
echo "Mock server PID: $MOCK_PID"
echo "Initializing merchants with baseline data..."
sleep 5

# Check mock server health
if ! curl -s http://localhost:9999/health > /dev/null; then
  echo -e "${YELLOW}Warning: Mock server may not be ready yet${NC}"
  sleep 2
fi

# Start dashboard backend pointing to mock server
echo ""
echo -e "${GREEN}[2/4] Starting dashboard backend on :8080 (pointing to mock)...${NC}"

# Use a separate mock database (clean slate)
MOCK_DB="$ROOT_DIR/backend/dashboard-mock.db"
if [ -f "$MOCK_DB" ]; then
  echo -e "${YELLOW}Removing existing mock database...${NC}"
  rm "$MOCK_DB"
fi

export SOURCE_BASE_URL="http://localhost:9999"
export POLL_INTERVAL="3s"  # Poll frequently to show live updates
export DB_PATH="$MOCK_DB"
go run ./cmd/server 2>&1 | tee /tmp/dashboard-backend.log &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
echo "Waiting for backend to initialize and start polling..."
sleep 5

# Check backend health with retries
HEALTH_CHECK_RETRIES=3
BACKEND_HEALTHY=false

for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
  if curl -s http://localhost:8080/v1/health > /dev/null 2>&1; then
    BACKEND_HEALTHY=true
    echo -e "${GREEN}✓ Backend is healthy${NC}"
    break
  else
    echo -e "${YELLOW}Health check attempt $i/$HEALTH_CHECK_RETRIES failed...${NC}"
    sleep 2
  fi
done

if [ "$BACKEND_HEALTHY" = false ]; then
  echo -e "${YELLOW}ERROR: Backend failed to start properly!${NC}"
  echo -e "${YELLOW}Last 10 lines of backend logs:${NC}"
  tail -10 /tmp/dashboard-backend.log 2>/dev/null || echo "No logs available"
  echo ""
  echo -e "${YELLOW}Check if port 8080 is in use: lsof -i :8080${NC}"
  kill $MOCK_PID 2>/dev/null || true
  exit 1
fi

# Add all 20 merchants
echo ""
echo -e "${GREEN}[3/4] Adding 20 mock merchants to backend...${NC}"

MERCHANTS=(
  '{"id":"100","public_key":"mock_pubkey_0","alias":"Bitcoin Coffee","enabled":true}'
  '{"id":"101","public_key":"mock_pubkey_1","alias":"Bitcoin Electronics","enabled":true}'
  '{"id":"102","public_key":"mock_pubkey_2","alias":"Lightning Bistro","enabled":true}'
  '{"id":"103","public_key":"mock_pubkey_3","alias":"Satoshi'\''s Bar","enabled":true}'
  '{"id":"104","public_key":"mock_pubkey_4","alias":"Bread & Bitcoin","enabled":true}'
  '{"id":"105","public_key":"mock_pubkey_5","alias":"Bitcoin Books","enabled":true}'
  '{"id":"106","public_key":"mock_pubkey_6","alias":"Lightning Tacos","enabled":true}'
  '{"id":"107","public_key":"mock_pubkey_7","alias":"Bitcoin Threads","enabled":true}'
  '{"id":"108","public_key":"mock_pubkey_8","alias":"Bolt & Satoshi","enabled":true}'
  '{"id":"109","public_key":"mock_pubkey_9","alias":"Frozen Sats","enabled":true}'
  '{"id":"110","public_key":"mock_pubkey_10","alias":"Fresh Squeeze ₿","enabled":true}'
  '{"id":"111","public_key":"mock_pubkey_11","alias":"PlayBTC","enabled":true}'
  '{"id":"112","public_key":"mock_pubkey_12","alias":"HealthChain Pharmacy","enabled":true}'
  '{"id":"113","public_key":"mock_pubkey_13","alias":"Pizza Lightning","enabled":true}'
  '{"id":"114","public_key":"mock_pubkey_14","alias":"Bloom & Bitcoin","enabled":true}'
  '{"id":"115","public_key":"mock_pubkey_15","alias":"Two Wheels One Chain","enabled":true}'
  '{"id":"116","public_key":"mock_pubkey_16","alias":"Proof of Workout","enabled":true}'
  '{"id":"117","public_key":"mock_pubkey_17","alias":"Trim the Chain","enabled":true}'
  '{"id":"118","public_key":"mock_pubkey_18","alias":"Paws & Sats","enabled":true}'
  '{"id":"119","public_key":"mock_pubkey_19","alias":"24/7 Satoshi","enabled":true}'
)

SUCCESS_COUNT=0
for merchant in "${MERCHANTS[@]}"; do
  if curl -s -X POST http://localhost:8080/v1/admin/merchants \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$merchant" > /dev/null; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo -e "${YELLOW}Warning: Failed to add merchant${NC}"
  fi
done

echo -e "${GREEN}Successfully added $SUCCESS_COUNT/20 merchants${NC}"

# Add some milestones
echo ""
echo -e "${GREEN}[4/4] Creating test milestones...${NC}"

MILESTONES=(
  '{"name":"100 Transactions","type":"transactions","threshold":100,"enabled":true}'
  '{"name":"500 Transactions","type":"transactions","threshold":500,"enabled":true}'
  '{"name":"1000 Transactions","type":"transactions","threshold":1000,"enabled":true}'
  '{"name":"100k Sats Volume","type":"volume","threshold":100000,"enabled":true}'
  '{"name":"500k Sats Volume","type":"volume","threshold":500000,"enabled":true}'
  '{"name":"1M Sats Volume","type":"volume","threshold":1000000,"enabled":true}'
  '{"name":"5M Sats Volume","type":"volume","threshold":5000000,"enabled":true}'
)

for milestone in "${MILESTONES[@]}"; do
  curl -s -X POST http://localhost:8080/v1/admin/milestones \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$milestone" > /dev/null
done

echo -e "${GREEN}Created 7 milestones${NC}"

# Start frontend if requested
if [ "$START_FRONTEND" = true ]; then
  echo ""
  echo -e "${GREEN}Starting frontend on :5173...${NC}"
  cd "$ROOT_DIR/frontend"
  npm run dev &
  FRONTEND_PID=$!
  echo "Frontend PID: $FRONTEND_PID"
fi

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Mock Environment Ready!${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${GREEN}Services running:${NC}"
echo "  • Mock PayWithFlash API: http://localhost:9999"
echo "  • Dashboard Backend:     http://localhost:8080 (using $MOCK_DB)"
if [ "$START_FRONTEND" = true ]; then
  echo "  • Dashboard Frontend:    http://localhost:5173"
fi
echo ""
echo -e "${GREEN}Test endpoints:${NC}"
echo "  • Health:      curl http://localhost:8080/v1/health"
echo "  • Summary:     curl http://localhost:8080/v1/summary"
echo "  • Ticker:      curl http://localhost:8080/v1/ticker"
echo "  • Merchants:   curl -H \"Authorization: Bearer \$ADMIN_TOKEN\" http://localhost:8080/v1/admin/merchants"
echo ""
echo -e "${YELLOW}How it works:${NC}"
echo "  • Mock server generates new transactions every 3 seconds"
echo "  • Backend polls for updates every 3 seconds"
echo "  • Transactions accumulate gradually (like a live event)"
echo "  • Watch the dashboard grow over ~5 minutes to full activity"
echo ""
echo -e "${GREEN}Note:${NC} Using separate mock database ($MOCK_DB)"
echo "      Your regular database (dashboard.db) is not affected."
echo ""

# Show initial stats
echo -e "${GREEN}Starting State:${NC}"
SUMMARY=$(curl -s http://localhost:8080/v1/summary 2>/dev/null)
if [ -n "$SUMMARY" ]; then
  TOTAL_TX=$(echo "$SUMMARY" | grep -o '"total_transactions":[0-9]*' | grep -o '[0-9]*')
  echo "  • Initial transactions: $TOTAL_TX"
  echo "  • More transactions will appear every few seconds"
  echo "  • Refresh your browser to see the updates!"
else
  echo "  • Waiting for first poll cycle..."
  echo "  • Data will start flowing in moments..."
fi
echo ""
echo -e "${BLUE}To stop all services:${NC}"
echo "  kill $MOCK_PID $BACKEND_PID"
if [ "$START_FRONTEND" = true ]; then
  echo "  kill $FRONTEND_PID"
fi
echo ""
echo "Or press Ctrl+C in each terminal window"
echo ""
echo -e "${BLUE}================================================${NC}"

# Wait for interrupt
trap "kill $MOCK_PID $BACKEND_PID 2>/dev/null; [ '$START_FRONTEND' = true ] && kill $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait
