#!/usr/bin/env bash
#
# Build the client and publish it to the nginx web root.
#
# Usage (on the server):
#   cd /home/ubuntu/swimming-app
#   git pull --ff-only          # update the source first
#   ./deploy/deploy-client.sh
#
# After the first run, remove the client from pm2 so the old Vite dev server
# stops holding port 5002:
#   pm2 delete swimming-client && pm2 save

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_DIR="$REPO_DIR/client"
PUBLISH_DIR="/var/www/swimtryout-app"

cd "$CLIENT_DIR"

# Vite inlines VITE_* variables at build time. Building with the localhost
# fallback would ship an app that calls the user's own machine, so refuse.
if ! grep -qE '^VITE_API_BASE_URL=https://' .env; then
  echo "ERROR: client/.env must define an https VITE_API_BASE_URL before building." >&2
  echo "       Found: $(grep -E '^VITE_API_BASE_URL=' .env || echo '<unset>')" >&2
  exit 1
fi

echo "==> Installing dependencies"
npm ci

echo "==> Building client"
npm run build

echo "==> Publishing to $PUBLISH_DIR"
sudo mkdir -p "$PUBLISH_DIR"
sudo rsync -a --delete "$CLIENT_DIR/dist/" "$PUBLISH_DIR/"

echo "==> Reloading nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Done. Served from $PUBLISH_DIR"
