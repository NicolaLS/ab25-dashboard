#!/bin/bash
# Quick test script to verify the mock system works end-to-end

set -e

echo "========================================="
echo "Testing Mock Server → Backend Flow"
echo "========================================="
echo ""

# Cleanup
echo "1. Cleaning up any running processes..."
pkill -f "mockserver" 2>/dev/null || true
pkill -f "cmd/server" 2>/dev/null || true
rm -f dashboard-mock.db* /tmp/mock-test.log /tmp/backend-test.log
sleep 2

# Start mock server
echo "2. Starting mock server..."
go run ./cmd/mockserver -interval 3s > /tmp/mock-test.log 2>&1 &
MOCK_PID=$!
sleep 12
echo "   Mock server started (PID: $MOCK_PID)"

# Verify mock has data
echo "3. Verifying mock server has transaction data..."
SALES_COUNT=$(curl -s "http://localhost:9999/user-pos/100?user_public_key=mock_pubkey_0" | jq '.data.sales | length')
echo "   Mock server has $SALES_COUNT transactions for merchant 100"

if [ "$SALES_COUNT" -lt 10 ]; then
  echo "   ❌ ERROR: Expected at least 10 transactions, got $SALES_COUNT"
  kill $MOCK_PID
  exit 1
fi

# Start backend
echo "4. Starting dashboard backend..."
export SOURCE_BASE_URL="http://localhost:9999"
export POLL_INTERVAL="3s"
export DB_PATH="dashboard-mock.db"
export ADMIN_TOKEN="test-token-123"
go run ./cmd/server > /tmp/backend-test.log 2>&1 &
BACKEND_PID=$!
sleep 3
echo "   Backend started (PID: $BACKEND_PID)"

# Add a merchant
echo "5. Adding merchant to backend..."
curl -s -X POST http://localhost:8080/v1/admin/merchants \
  -H "Authorization: Bearer test-token-123" \
  -H "Content-Type: application/json" \
  -d '{"id":"100","public_key":"mock_pubkey_0","alias":"Bitcoin Coffee","enabled":true}' > /dev/null
echo "   Merchant added"

# Wait for polling
echo "6. Waiting for backend to poll and ingest data (10 seconds)..."
sleep 10

# Check if data was ingested
echo "7. Verifying data ingestion..."
BACKEND_TX=$(curl -s http://localhost:8080/v1/summary | jq '.total_transactions')
echo "   Backend has $BACKEND_TX transactions"

if [ "$BACKEND_TX" -gt 0 ]; then
  echo ""
  echo "========================================="
  echo "✅ SUCCESS! Mock system is working!"
  echo "========================================="
  echo ""
  echo "Summary:"
  curl -s http://localhost:8080/v1/summary | jq '.'
  echo ""
else
  echo ""
  echo "========================================="
  echo "❌ FAILED! No transactions ingested"
  echo "========================================="
  echo ""
  echo "Backend logs:"
  tail -20 /tmp/backend-test.log
  kill $MOCK_PID $BACKEND_PID
  exit 1
fi

# Cleanup
kill $MOCK_PID $BACKEND_PID
echo "Test complete, processes stopped."
