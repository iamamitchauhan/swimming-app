#!/usr/bin/env bash
#
# Build the client and publish dist/ into the nginx web root.
#
# Usage (on the server):
#   cd /home/ubuntu/swimming-app
#   git pull --ff-only
#   ./deploy/deploy-client.sh                  # install deps, build, publish, reload
#   ./deploy/deploy-client.sh --skip-install   # skip `npm ci` on repeat deploys
#
# Run `git pull` yourself first — this script never touches git.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_DIR="$REPO_DIR/client"
PUBLISH_DIR="/var/www/swimtryout-app"

SKIP_INSTALL=0
for arg in "$@"; do
  case "$arg" in
    --skip-install) SKIP_INSTALL=1 ;;
    *) echo "Unknown option: $arg (supported: --skip-install)" >&2; exit 2 ;;
  esac
done

cd "$CLIENT_DIR"

# Vite inlines VITE_* variables at build time. Building with the localhost
# fallback would ship an app that calls the visitor's own machine, so refuse.
if ! grep -qE '^VITE_API_BASE_URL=https://' .env; then
  echo "ERROR: client/.env must define an https VITE_API_BASE_URL before building." >&2
  echo "       Found: $(grep -E '^VITE_API_BASE_URL=' .env || echo '<unset>')" >&2
  exit 1
fi

# If the vhost still proxies to the Vite dev server, publishing will look fine
# but the site will keep returning 502 until nginx serves PUBLISH_DIR directly.
if sudo nginx -T 2>/dev/null | grep -q "proxy_pass http://127.0.0.1:5002"; then
  echo "WARNING: nginx still proxies app.swimtryout.feteboard.ai to :5002." >&2
  echo "         The publish will succeed, but the site will not serve from" >&2
  echo "         $PUBLISH_DIR until the vhost uses 'root $PUBLISH_DIR;'." >&2
fi

if [ "$SKIP_INSTALL" -eq 0 ]; then
  echo "==> Installing dependencies"
  npm ci
fi

echo "==> Building client"
npm run build

if [ ! -f dist/index.html ]; then
  echo "ERROR: build produced no dist/index.html — nothing to publish." >&2
  exit 1
fi

echo "==> Publishing dist/ -> $PUBLISH_DIR"
sudo mkdir -p "$PUBLISH_DIR"
sudo rsync -a --delete "$CLIENT_DIR/dist/" "$PUBLISH_DIR/"
# nginx (www-data) must be able to traverse the dirs and read the files.
sudo chmod -R a+rX "$PUBLISH_DIR"

echo "==> Testing nginx config"
sudo nginx -t

echo "==> Reloading nginx"
sudo systemctl reload nginx

echo "==> Smoke test (via localhost, no CDN/DNS involved)"
code="$(curl -ksS -o /dev/null -w '%{http_code}' \
  --resolve app.swimtryout.feteboard.ai:443:127.0.0.1 \
  https://app.swimtryout.feteboard.ai/ || true)"
if [ "$code" = "200" ]; then
  echo "    ok — HTTP 200, $(du -sh "$PUBLISH_DIR" | cut -f1) in $PUBLISH_DIR"
else
  echo "    WARNING: expected HTTP 200, got '${code:-no response}'" >&2
  echo "             check the vhost serves $PUBLISH_DIR (see deploy/nginx/)" >&2
fi
