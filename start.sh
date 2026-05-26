#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting Next.js production server..."
  NODE_OPTIONS="--max-old-space-size=8192 --expose-gc" node node_modules/.bin/next start -p 3000 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..."
  sleep 3
done
