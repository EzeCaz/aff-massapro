#!/bin/bash
cd /home/z/my-project
export NODE_ENV=production
export PORT=3000

while true; do
  echo "[$(date)] Starting server..." >> /tmp/daemon.log
  node .next/standalone/server.js >> /tmp/daemon.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE" >> /tmp/daemon.log
  sleep 2
done
