#!/usr/bin/env bash
# install-hashgram-io.sh — publish hashgram.io on this explorer VPS.
#
# Run as root from the repository root, AFTER scripts/install/bootstrap-ubuntu.sh
# and after the node + indexer are up (hashgramctl chain-status: catching_up=false).
#
#   sudo scripts/install/install-hashgram-io.sh
#
# What it does (idempotent — safe to re-run after every `git pull`):
#   1. Node.js 22 + pnpm (only if missing)
#   2. builds web/ → /var/www/hashgram-io (static SolidJS SPA, precompressed)
#   3. (re)builds and installs hashgram-indexer if a Go toolchain is present
#   4. installs a Caddy build with rate-limit / Cloudflare-IP / DNS / replace modules
#   5. installs deploy/caddy/Caddyfile + deploy/systemd/caddy.service
#   6. opens ONLY 80/tcp, 443/tcp, 443/udp in ufw (on top of what bootstrap opened)
#   7. enables caddy + hashgram-indexer, then runs `hashgramctl mainnet-preflight`
#      and exits non-zero if it fails.
#
# Environment (optional), read from /etc/hashgram/caddy.env if present:
#   ACME_EMAIL     contact for Let's Encrypt (default ops@hashgram.io)
#   CF_API_TOKEN   Cloudflare token (Zone:DNS:Edit) → DNS-01 instead of HTTP-01
#   SITE_DOMAIN    default hashgram.io
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "run as root" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WEB_ROOT=/var/www/hashgram-io
CADDY_BIN=/usr/local/bin/caddy
CADDY_PLUGINS="github.com/mholt/caddy-ratelimit,github.com/WeidiDeng/caddy-cloudflare-ip,github.com/caddy-dns/cloudflare,github.com/caddyserver/replace-response"
SITE_DOMAIN="${SITE_DOMAIN:-hashgram.io}"

log() { printf '\e[1m[hashgram.io]\e[0m %s\n' "$*"; }
die() { printf '\e[1m[hashgram.io] ERROR:\e[0m %s\n' "$*" >&2; exit 1; }

# shellcheck disable=SC1091
[[ -f /etc/hashgram/caddy.env ]] && set -a && source /etc/hashgram/caddy.env && set +a

# ------------------------------------------------------------------ preflight
command -v hashgramctl >/dev/null || die "hashgramctl not found — run scripts/install/bootstrap-ubuntu.sh first"
[[ -d /etc/hashgram ]] || die "/etc/hashgram missing — run bootstrap-ubuntu.sh first"
systemctl list-unit-files hashgram-indexer.service >/dev/null 2>&1 || die "hashgram-indexer.service not installed"
[[ -d "$REPO_ROOT/web" ]] || die "web/ not found in $REPO_ROOT"

# ------------------------------------------------------------------ 1. node
if ! command -v node >/dev/null || [[ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 22 ]]; then
  log "installing Node.js 22 LTS (NodeSource)"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
if ! command -v pnpm >/dev/null; then
  log "enabling pnpm via corepack"
  corepack enable
  corepack prepare pnpm@latest --activate
fi
log "node $(node -v), pnpm $(pnpm -v)"

# ------------------------------------------------------------------ 2. web
log "building web/"
(
  cd "$REPO_ROOT/web"
  pnpm install --frozen-lockfile
  pnpm run build
)
install -d -m 0755 "$WEB_ROOT"
rsync -a --delete "$REPO_ROOT/web/dist/" "$WEB_ROOT/"
# precompress for `file_server precompressed` (zstd + gzip; brotli if available)
find "$WEB_ROOT" -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.svg' -o -name '*.json' -o -name '*.xml' -o -name '*.txt' -o -name '*.webmanifest' \) -print0 |
  while IFS= read -r -d '' f; do
    gzip -9 -k -f "$f"
    command -v zstd >/dev/null && zstd -19 -q -f "$f" -o "$f.zst"
    command -v brotli >/dev/null && brotli -f -k "$f"
  done
chown -R root:root "$WEB_ROOT"
chmod -R a+rX "$WEB_ROOT"
log "site → $WEB_ROOT ($(find "$WEB_ROOT" -type f | wc -l) files)"

# ------------------------------------------------------------------ 3. indexer
if command -v go >/dev/null && [[ -d "$REPO_ROOT/cmd/hashgram-indexer" ]]; then
  log "building hashgram-indexer"
  (cd "$REPO_ROOT" && CGO_ENABLED=0 go build -trimpath -ldflags "-X github.com/cosmos/cosmos-sdk/version.Version=$(git -C "$REPO_ROOT" describe --tags --always --dirty 2>/dev/null || echo dev)" -o /tmp/hashgram-indexer.new ./cmd/hashgram-indexer)
  if ! cmp -s /tmp/hashgram-indexer.new /usr/local/bin/hashgram-indexer; then
    install -m 0755 /tmp/hashgram-indexer.new /usr/local/bin/hashgram-indexer
    log "indexer binary updated → restarting"
    systemctl restart hashgram-indexer
  fi
  rm -f /tmp/hashgram-indexer.new
fi

# ------------------------------------------------------------------ 4. caddy
if ! id caddy >/dev/null 2>&1; then
  useradd --system --home /var/lib/caddy --shell /usr/sbin/nologin caddy
fi
install -d -o caddy -g caddy -m 0750 /var/lib/caddy /var/log/caddy
install -d -m 0755 /etc/caddy /etc/caddy/conf.d

need_caddy=1
if [[ -x "$CADDY_BIN" ]] && "$CADDY_BIN" list-modules 2>/dev/null | grep -q '^http.handlers.rate_limit$' &&
  "$CADDY_BIN" list-modules 2>/dev/null | grep -q '^http.ip_sources.cloudflare$' &&
  "$CADDY_BIN" list-modules 2>/dev/null | grep -q '^dns.providers.cloudflare$' &&
  "$CADDY_BIN" list-modules 2>/dev/null | grep -q '^http.handlers.replace_response$'; then
  need_caddy=0
fi
if [[ $need_caddy -eq 1 ]]; then
  log "downloading Caddy with plugins ($CADDY_PLUGINS)"
  arch=$(dpkg --print-architecture)
  q="os=linux&arch=${arch}"
  IFS=',' read -ra plugs <<<"$CADDY_PLUGINS"
  for p in "${plugs[@]}"; do q="$q&p=$p"; done
  curl -fsSL -o /tmp/caddy.new "https://caddyserver.com/api/download?$q"
  chmod +x /tmp/caddy.new
  /tmp/caddy.new version >/dev/null || die "downloaded caddy does not run"
  install -m 0755 /tmp/caddy.new "$CADDY_BIN"
  rm -f /tmp/caddy.new
fi
log "caddy $("$CADDY_BIN" version | cut -d' ' -f1)"

# ------------------------------------------------------------------ 5. config
install -m 0644 "$REPO_ROOT/deploy/caddy/Caddyfile" /etc/caddy/Caddyfile
if [[ "$SITE_DOMAIN" != "hashgram.io" ]]; then
  sed -i "s/hashgram\.io/${SITE_DOMAIN}/g" /etc/caddy/Caddyfile
fi
# DNS-01 only when a token is configured; otherwise HTTP-01 (default).
if [[ -n "${CF_API_TOKEN:-}" ]]; then
  install -m 0644 "$REPO_ROOT/deploy/caddy/conf.d/tls-dns.conf.example" /etc/caddy/conf.d/tls-dns.conf
  log "TLS: DNS-01 via Cloudflare API"
else
  rm -f /etc/caddy/conf.d/tls-dns.conf
  log "TLS: HTTP-01 (set CF_API_TOKEN in /etc/hashgram/caddy.env for DNS-01)"
fi
if [[ ! -f /etc/hashgram/caddy.env ]]; then
  cat >/etc/hashgram/caddy.env <<EOF
# Environment for caddy.service (read by install-hashgram-io.sh and systemd)
ACME_EMAIL=${ACME_EMAIL:-ops@hashgram.io}
# CF_API_TOKEN=   # Cloudflare API token with Zone:DNS:Edit → enables DNS-01
EOF
  chmod 0640 /etc/hashgram/caddy.env
  chown root:caddy /etc/hashgram/caddy.env
fi
install -m 0644 "$REPO_ROOT/deploy/systemd/caddy.service" /etc/systemd/system/caddy.service
# Validate as the service user: validation opens the log files, and files created
# by root here would make the service fail with "permission denied".
if ! runuser -u caddy -- "$CADDY_BIN" validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
  runuser -u caddy -- "$CADDY_BIN" validate --config /etc/caddy/Caddyfile --adapter caddyfile
  die "Caddyfile invalid"
fi
chown -R caddy:caddy /var/log/caddy /var/lib/caddy

# ------------------------------------------------------------------ 6. firewall
if command -v ufw >/dev/null; then
  ufw allow 80/tcp comment 'hashgram.io http (ACME + redirect)' >/dev/null
  ufw allow 443/tcp comment 'hashgram.io https' >/dev/null
  ufw allow 443/udp comment 'hashgram.io http/3' >/dev/null
  log "ufw: 80/tcp 443/tcp 443/udp allowed"
fi

# ------------------------------------------------------------------ 7. services
systemctl daemon-reload
systemctl enable --now hashgram-indexer >/dev/null
systemctl enable caddy >/dev/null
if systemctl is-active --quiet caddy; then
  systemctl reload caddy || systemctl restart caddy
else
  systemctl start caddy
fi
sleep 1
systemctl is-active --quiet caddy || { journalctl -u caddy -n 30 --no-pager; die "caddy failed to start"; }

# ------------------------------------------------------------------ checks
log "mainnet-preflight"
if ! hashgramctl mainnet-preflight; then
  die "hashgramctl mainnet-preflight failed — fix before publishing"
fi

log "listening sockets on non-loopback addresses (expect only 22, 80, 443, 26656, 26670):"
ss -Hltn | awk '{print $4}' | grep -vE '^(127\.|\[::1\]|127\.0\.0\.53|127\.0\.0\.54)' | sed 's/.*://' | sort -un | tr '\n' ' '
echo
if ss -Hltn | grep -E '(0\.0\.0\.0|\*|\[::\]):(26657|1317|9091|26672|1318|5432|3000)\b' >/dev/null; then
  die "an admin port is exposed on a non-loopback address"
fi

log "local smoke test"
curl -fsS -m 5 127.0.0.1:1318/v1/health >/dev/null && log "  indexer /v1/health ok"
curl -fsS -m 5 -H "Host: ${SITE_DOMAIN}" http://127.0.0.1/robots.txt >/dev/null && log "  caddy serves the site (via 80 → redirect/ACME path)"

log "done. DNS: ${SITE_DOMAIN} A → this host, www CNAME → apex (Cloudflare proxied, SSL mode Full (strict))."
