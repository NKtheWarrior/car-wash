#!/usr/bin/env bash
# One-shot deployer for the Car Wash stack. Run on the Ubuntu VPS, as root/sudo,
# from the repo root.
#
#   sudo ./deploy.sh mqtt                 # just the MQTT broker (api/web not ready yet)
#   sudo DOMAIN=yourdomain.com ./deploy.sh all   # full stack + migrate + seed
#
# It is safe to re-run: an existing .env / passwd file is reused, never clobbered.
# All secrets are generated once and stored in .env; this script prints the ones
# you need (the bay's MQTT password for the ESP32).
set -euo pipefail

MODE="${1:-all}"                       # mqtt | all
cd "$(dirname "$0")"                    # repo root
MQ_DIR="infra/mosquitto"

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!  %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31mx  %s\033[0m\n' "$*" >&2; exit 1; }

[[ "$MODE" == "mqtt" || "$MODE" == "all" ]] || die "mode must be 'mqtt' or 'all' (got '$MODE')"

# Read a KEY=value (optionally quoted) out of .env.
get_env() { grep -E "^$1=" .env | head -1 | cut -d= -f2- | sed 's/^"//; s/"$//'; }
# Random alphanumeric secret.
gen() { openssl rand -hex 24; }

# ---------------------------------------------------------------------------
say "1/6  Docker"
if ! command -v docker >/dev/null 2>&1; then
  say "Installing Docker Engine..."
  curl -fsSL https://get.docker.com | sh
else
  echo "Docker already installed: $(docker --version)"
fi
docker compose version >/dev/null 2>&1 || die "docker compose plugin missing"

# ---------------------------------------------------------------------------
say "2/6  Environment (.env)"
if [[ -f .env ]]; then
  echo ".env already exists — reusing it."
else
  [[ -f .env.production.example ]] || die ".env.production.example not found"
  DBPASS="$(gen)"; MQTTPASS="$(gen)"; JWT="$(gen)$(gen)"; BAYPASS="$(gen)"
  cp .env.production.example .env
  sed -i "s|CHANGE_ME_db_password|${DBPASS}|g"        .env
  sed -i "s|CHANGE_ME_api_mqtt_password|${MQTTPASS}|g" .env
  sed -i "s|CHANGE_ME_long_random_secret|${JWT}|g"     .env
  if [[ -n "${DOMAIN:-}" ]]; then
    sed -i "s|api.example.com|api.${DOMAIN}|g" .env   # must run before example.com
    sed -i "s|example.com|${DOMAIN}|g"         .env
  else
    warn "No DOMAIN set — API/WEB URLs in .env still say example.com. Fine for MQTT-only; edit before deploying api/web."
  fi
  # Extra var the API ignores; used here to seed the bay's MQTT credential.
  printf '\n# Bay controller (ESP32) MQTT password — not read by the API.\nBAY_DEMO_PASSWORD="%s"\n' "$BAYPASS" >> .env
  echo "Generated .env with fresh secrets."
fi

# ---------------------------------------------------------------------------
say "3/6  Mosquitto password file"
if [[ -f "$MQ_DIR/passwd" ]]; then
  echo "passwd already exists — reusing it."
else
  API_MQTT_PW="$(get_env MQTT_PASSWORD)"
  BAY_MQTT_PW="$(get_env BAY_DEMO_PASSWORD)"
  API_MQTT_USER="$(get_env MQTT_USERNAME)"; API_MQTT_USER="${API_MQTT_USER:-api}"
  docker run --rm -v "$PWD/$MQ_DIR:/m" eclipse-mosquitto:2 \
    mosquitto_passwd -b -c /m/passwd "$API_MQTT_USER" "$API_MQTT_PW"
  docker run --rm -v "$PWD/$MQ_DIR:/m" eclipse-mosquitto:2 \
    mosquitto_passwd -b    /m/passwd bay-demo          "$BAY_MQTT_PW"
  echo "Created passwd for users: $API_MQTT_USER, bay-demo"
fi

# ---------------------------------------------------------------------------
say "4/6  Firewall"
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH      >/dev/null 2>&1 || true
  ufw allow 1883/tcp     >/dev/null 2>&1 || true   # MQTT
  if [[ "$MODE" == "all" ]]; then ufw allow 80,443/tcp >/dev/null 2>&1 || true; fi
  yes | ufw enable >/dev/null 2>&1 || true
  echo "ufw rules applied."
else
  warn "ufw not installed — skipping firewall. Open port 1883 (and 80/443 for 'all') yourself."
fi

# ---------------------------------------------------------------------------
say "5/6  Start services ($MODE)"
if [[ "$MODE" == "mqtt" ]]; then
  docker compose -f docker-compose.mqtt.yml up -d
else
  docker compose -f docker-compose.prod.yml up -d --build
  say "6/6  Database migrate + seed"
  docker compose -f docker-compose.prod.yml run --rm api \
    pnpm --filter @car-wash/db exec prisma migrate deploy
  if [[ -f .seeded ]]; then
    echo "Already seeded (.seeded present) — skipping seed."
  else
    docker compose -f docker-compose.prod.yml run --rm api \
      pnpm --filter @car-wash/db exec prisma db seed
    touch .seeded
  fi
fi

# ---------------------------------------------------------------------------
say "Done."
echo "ESP32 bay 'demo-bay' MQTT credentials:"
echo "  host: <this VPS IP${DOMAIN:+ or api.$DOMAIN}>   port: 1883"
echo "  user: bay-demo   pass: $(get_env BAY_DEMO_PASSWORD)"
if [[ "$MODE" == "all" ]]; then
  echo
  echo "Still to do for a public site: install Nginx + certbot (see DEPLOY.md §8)."
  echo "Seeded owner login: owner@carwash.local / changeme123  (change it after first login)."
fi
docker compose -f "docker-compose.$([[ $MODE == mqtt ]] && echo mqtt || echo prod).yml" ps
