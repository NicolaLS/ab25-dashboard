#!/bin/bash
# Test that transactions accumulate gradually over time

set -e

echo "========================================="
echo "Testing Gradual Transaction Accumulation"
echo "========================================="
echo ""

# Cleanup
pkill -f "mockserver" 2>/dev/null || true
pkill -f "cmd/server" 2>/dev/null || true
rm -f dashboard-mock.db*
sleep 2

# Start mock server
echo "Starting mock server..."
go run ./cmd/mockserver -interval 3s > /dev/null 2>&1 &
MOCK_PID=$!
sleep 6

# Check initial transaction count from mock
INITIAL_MOCK=$(curl -s "http://localhost:9999/user-pos/100?user_public_key=mock_pubkey_0" | jq '.data.sales | length')
echo "Initial mock transactions for merchant 100: $INITIAL_MOCK"

if [ "$INITIAL_MOCK" -gt 10 ]; then
  echo "  ✓ Has minimal baseline data ($INITIAL_MOCK transactions)"
else
  echo "  ⚠ Very low initial data ($INITIAL_MOCK transactions)"
fi

# Start backend
echo ""
echo "Starting backend..."
export SOURCE_BASE_URL="http://localhost:9999"
export POLL_INTERVAL="3s"
export DB_PATH="dashboard-mock.db"
export ADMIN_TOKEN="test-token"
go run ./cmd/server > /dev/null 2>&1 &
BACKEND_PID=$!
sleep 3

# Add merchant
curl -s -X POST http://localhost:8080/v1/admin/merchants \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"id":"100","public_key":"mock_pubkey_0","alias":"Bitcoin Coffee","enabled":true}' > /dev/null

echo "Monitoring transaction accumulation over 30 seconds..."
echo ""
echo "Time | Backend TX | Mock TX | Growth"
echo "-----|-----------|---------|--------"

PREV_BACKEND=0
for i in {1..10}; do
  sleep 3

  BACKEND_TX=$(curl -s http://localhost:8080/v1/summary 2>/dev/null | jq -r '.total_transactions // 0')
  MOCK_TX=$(curl -s "http://localhost:9999/user-pos/100?user_public_key=mock_pubkey_0" 2>/dev/null | jq -r '.data.sales | length')

  GROWTH=$((BACKEND_TX - PREV_BACKEND))
  PREV_BACKEND=$BACKEND_TX

  printf "%2ds  | %-9s | %-7s | +%s\n" $((i*3)) "$BACKEND_TX" "$MOCK_TX" "$GROWTH"
done

# Cleanup
kill $MOCK_PID $BACKEND_PID 2>/dev/null

echo ""
echo "========================================="
echo "✅ Test Complete"
echo "========================================="
echo ""
echo "Expected behavior:"
echo "  • Backend TX should start low (< 50)"
echo "  • Growth should be steady (+3-10 per 3 seconds)"
echo "  • Mock TX should also be growing"
echo "  • Full activity reached in ~5 minutes"
