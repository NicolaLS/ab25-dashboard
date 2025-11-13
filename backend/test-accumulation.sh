#!/bin/bash
# Test gradual transaction accumulation over 1 minute

pkill -f mockserver 2>/dev/null
sleep 2

echo "Starting mock server with auto-generation..."
go run ./cmd/mockserver -interval 3s > /dev/null 2>&1 &
MOCK_PID=$!

sleep 6

echo ""
echo "Monitoring transaction accumulation over 60 seconds..."
echo "Checking all merchants combined + high-volume merchant"
echo ""
echo "Time | Total Sales | Merchant 119 | Rate"
echo "-----|-------------|--------------|------"

PREV_TOTAL=0
for i in {1..20}; do
  TOTAL=$(curl -s "http://localhost:9999/admin/merchants" 2>/dev/null | jq 'map(.sales) | add')
  M119=$(curl -s "http://localhost:9999/user-pos/119?user_public_key=mock_pubkey_19" 2>/dev/null | jq '.data.sales | length')

  RATE=$((TOTAL - PREV_TOTAL))
  PREV_TOTAL=$TOTAL

  printf "%3ds | %11s | %12s | +%s\\n" $((i*3)) "$TOTAL" "$M119" "$RATE"
  sleep 3
done

kill $MOCK_PID 2>/dev/null
echo ""
echo "✅ Transactions should steadily accumulate over time"
echo "Expected rate: ~10-20 transactions per 3 seconds across all merchants"
