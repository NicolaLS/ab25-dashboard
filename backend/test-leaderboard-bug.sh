#!/bin/bash
# Test to reproduce the leaderboard count mismatch bug

set -e

echo "========================================="
echo "Testing Leaderboard Count Mismatch"
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

# Start backend
echo "Starting backend..."
export SOURCE_BASE_URL="http://localhost:9999"
export POLL_INTERVAL="3s"
export DB_PATH="dashboard-mock.db"
export ADMIN_TOKEN="test-token"
go run ./cmd/server > /dev/null 2>&1 &
BACKEND_PID=$!
sleep 3

# Add ONE merchant
echo "Adding Bitcoin Coffee (merchant 100)..."
curl -s -X POST http://localhost:8080/v1/admin/merchants \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"id":"100","public_key":"mock_pubkey_0","alias":"Bitcoin Coffee","enabled":true}' > /dev/null

echo ""
echo "Monitoring for 30 seconds..."
echo ""
echo "Time | Summary TX | Leaderboard (all) | Leaderboard (24h) | Match?"
echo "-----|------------|-------------------|-------------------|--------"

for i in {1..10}; do
  sleep 3

  SUMMARY_TX=$(curl -s http://localhost:8080/v1/summary 2>/dev/null | jq -r '.total_transactions // 0')
  LEADER_ALL=$(curl -s 'http://localhost:8080/v1/leaderboard/merchants?window=all' 2>/dev/null | jq -r '.[0].count // 0')
  LEADER_24H=$(curl -s 'http://localhost:8080/v1/leaderboard/merchants?window=24h' 2>/dev/null | jq -r '.[0].count // 0')

  if [ "$SUMMARY_TX" = "$LEADER_ALL" ]; then
    MATCH="✓"
  else
    MATCH="✗ BUG!"
  fi

  printf "%3ds | %10s | %17s | %17s | %s\n" $((i*3)) "$SUMMARY_TX" "$LEADER_ALL" "$LEADER_24H" "$MATCH"
done

# Cleanup
kill $MOCK_PID $BACKEND_PID 2>/dev/null

echo ""
echo "========================================="
if grep -q "BUG" <<< "$(echo "$MATCH")"; then
  echo "❌ BUG DETECTED: Summary != Leaderboard"
else
  echo "✅ All counts match correctly"
fi
echo "========================================="
