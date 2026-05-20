#!/bin/bash
cd /home/z/my-project

# Install dependencies
bun install

# Push database schema
bun run db:push

# Build for production
bun run build

# Start production server
NODE_ENV=production exec node .next/standalone/server.js
