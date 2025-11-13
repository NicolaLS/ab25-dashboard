#!/bin/bash
# Test that auto-generation is working

pkill -f mockserver 2>/dev/null
sleep 2

echo "Starting mock server with auto-generation..."
go run ./cmd/mockserver -interval 3s > /dev/null 2>&1 &
MOCK_PID=$!
sleep 6

echo "Checking high-volume merchant (24/7 Satoshi - 3 tx/min)..."
echo ""

for i in 1 2 3 4; do
  COUNT=$(curl -s "http://localhost:9999/user-pos/119?user_public_key=mock_pubkey_19" | jq '.data.sales | length')
  echo "Check $i: $COUNT transactions"
  sleep 6
done

kill $MOCK_PID
echo ""
echo "If auto-generation is working, counts should increase over time."
