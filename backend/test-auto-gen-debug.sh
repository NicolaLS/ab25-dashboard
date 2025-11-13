#!/bin/bash
# Test auto-generation with debug logging

pkill -f mockserver 2>/dev/null
sleep 2

echo "Starting mock server with auto-generation..."
go run ./cmd/mockserver -interval 3s &
MOCK_PID=$!
echo "Mock server PID: $MOCK_PID"

sleep 8

echo ""
echo "Checking high-volume merchant (24/7 Satoshi - 3 tx/min)..."
echo ""

for i in 1 2 3 4 5; do
  COUNT=$(curl -s "http://localhost:9999/user-pos/119?user_public_key=mock_pubkey_19" 2>/dev/null | jq '.data.sales | length')
  echo "Check $i (at $(($i * 4))s): $COUNT transactions"
  sleep 4
done

kill $MOCK_PID 2>/dev/null
echo ""
echo "If auto-generation is working, counts should increase over time."
echo "Look for 'auto-generated' log messages in the mock server output."
