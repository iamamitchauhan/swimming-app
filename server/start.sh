#!/bin/bash
set -e
cd "$(dirname "$0")"
if [ ! -d "dist" ] || [ "$(find src -newer dist -print -quit)" ]; then
  echo "Building server..."
  npm run build
fi
node dist/server.js
