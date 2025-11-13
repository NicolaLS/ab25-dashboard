#!/bin/bash
# Check database while backend is running

set -e

echo "========================================="
echo "Database Live Check Test"
echo "========================================="
echo ""

# Cleanup
pkill -f "mockserver" 2>/dev/null || true
pkill -f "cmd/server" 2>/dev/null || true
rm -f dashboard-mock.db*
sleep 2

# Start mock server (minimal logging)
echo "Starting mock server..."
go run ./cmd/mockserver -interval 3s > /tmp/mock.log 2>&1 &
MOCK_PID=$!
sleep 6

# Start backend (minimal logging)
echo "Starting backend..."
export SOURCE_BASE_URL="http://localhost:9999"
export POLL_INTERVAL="3s"
export DB_PATH="dashboard-mock.db"
export ADMIN_TOKEN="test-token"
go run ./cmd/server > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
sleep 3

# Add merchant
echo "Adding merchant 100..."
curl -s -X POST http://localhost:8080/v1/admin/merchants \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"id":"100","public_key":"mock_pubkey_0","alias":"Bitcoin Coffee","enabled":true}' > /dev/null

echo ""
echo "Waiting for polling cycles and checking database..."
echo ""
echo "Time | DB Transactions | API Summary | API Leaderboard"
echo "-----|-----------------|-------------|----------------"

for i in {1..5}; do
  sleep 3

  # Check database while backend is RUNNING
  DB_COUNT=$(sqlite3 dashboard-mock.db "SELECT COUNT(*) FROM transactions;" 2>/dev/null || echo "0")

  # Check API
  API_SUMMARY=$(curl -s http://localhost:8080/v1/summary 2>/dev/null | jq -r '.total_transactions // 0')
  API_LEADER=$(curl -s 'http://localhost:8080/v1/leaderboard/merchants?window=all' 2>/dev/null | jq -r '.[0].transactions // 0')

  printf "%3ds | %15s | %11s | %15s\n" $((i*3)) "$DB_COUNT" "$API_SUMMARY" "$API_LEADER"
done

# Cleanup
echo ""
echo "Stopping processes..."
kill $MOCK_PID $BACKEND_PID 2>/dev/null || true
sleep 1

echo ""
echo "Final database check (after shutdown):"
sqlite3 dashboard-mock.db "SELECT COUNT(*) FROM transactions;" 2>/dev/null || echo "0"

echo ""
echo "Backend logs (last 20 lines):"
tail -20 /tmp/backend.log

echo ""
echo "========================================="
echo "If DB count stays 0 while API counts increase,"
echo "this indicates data is in memory but not persisted"
echo "========================================="
