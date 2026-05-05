#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== AeroLicense Blockchain Setup ==="

# Start Hardhat node in background
echo "[1/3] Starting Hardhat node on port 8545..."
npx hardhat node > /tmp/hardhat.log 2>&1 &
HARDHAT_PID=$!
echo "      Hardhat PID: $HARDHAT_PID"

# Wait for node to be ready
echo "      Waiting for node..."
for i in $(seq 1 20); do
  if curl -s -X POST http://127.0.0.1:8545 \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    > /dev/null 2>&1; then
    echo "      Node ready."
    break
  fi
  sleep 0.5
done

# Deploy contract
echo "[2/3] Deploying AeroLicenseRegistry..."
npx hardhat run scripts/deploy.js --network localhost

echo "[3/3] Done."
echo ""
echo "Now restart the backend:"
echo "  cd backend && source venv/bin/activate && uvicorn main:app --reload"
echo ""
echo "Hardhat node is running (PID $HARDHAT_PID). To stop: kill $HARDHAT_PID"
