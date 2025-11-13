#!/bin/bash
# Debug version of leaderboard test with full logging

set -e

echo "========================================="
echo "Leaderboard Debug Test"
echo "========================================="
echo ""

# Cleanup
pkill -f "mockserver" 2>/dev/null || true
pkill -f "cmd/server" 2>/dev/null || true
rm -f dashboard-mock.db*
sleep 2

# Start mock server WITH LOGGING
echo "Starting mock server..."
go run ./cmd/mockserver -interval 3s 2>&1 | grep -E "(MOCK|merchant)" | head -30 &
MOCK_PID=$!
sleep 6

echo ""
echo "Starting backend WITH LOGGING..."
export SOURCE_BASE_URL="http://localhost:9999"
export POLL_INTERVAL="3s"
export DB_PATH="dashboard-mock.db"
export ADMIN_TOKEN="test-token"
go run ./cmd/server 2>&1 | grep -E "(Starting|polling|merchant)" &
BACKEND_PID=$!
sleep 3

# Add merchant to backend
echo ""
echo "Adding merchant 100 to backend..."
curl -s -X POST http://localhost:8080/v1/admin/merchants \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"id":"100","public_key":"mock_pubkey_0","alias":"Bitcoin Coffee","enabled":true}' | jq '.'

echo ""
echo "Waiting 12 seconds for polling cycles..."
sleep 12

echo ""
echo "========================================="
echo "Database Check:"
echo "========================================="
sqlite3 dashboard-mock.db "SELECT COUNT(*) as tx_count FROM transactions;"
sqlite3 dashboard-mock.db "SELECT * FROM merchants;"
sqlite3 dashboard-mock.db "SELECT merchant_id, COUNT(*) as count FROM transactions GROUP BY merchant_id;"

echo ""
echo "========================================="
echo "API Responses:"
echo "========================================="

echo ""
echo "Summary:"
curl -s http://localhost:8080/v1/summary | jq '{total_transactions, total_volume_sats}'

echo ""
echo "Leaderboard (all):"
curl -s 'http://localhost:8080/v1/leaderboard/merchants?window=all' | jq '.'

echo ""
echo "Leaderboard (24h):"
curl -s 'http://localhost:8080/v1/leaderboard/merchants?window=24h' | jq '.'

# Cleanup
kill $MOCK_PID $BACKEND_PID 2>/dev/null || true

echo ""
echo "========================================="
echo "Test complete"
echo "========================================="
