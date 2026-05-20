#!/bin/bash
cd /home/z/my-project
export NODE_ENV=production
export PORT=3000

# Trap errors
trap 'echo "Server process died at $(date)" >> /tmp/server-crash.log' EXIT

# Add Node.js flags for better error handling
exec node \
  --unhandled-rejections=warn \
  .next/standalone/server.js 2>&1
