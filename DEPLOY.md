# Deploying to a VPS (Ubuntu + Docker Compose + Nginx/HTTPS)

This deploys the **API**, **web**, **Postgres**, and **Mosquitto** to one Ubuntu
VPS. The Android owner app and ESP32 firmware are *not* deployed here — they
connect to this server over the internet (the app posts payments to the API; the
ESP32 connects to the MQTT broker).

**Architecture**

```
                 Internet
                    │
        ┌───────────┴───────────┐
   example.com              api.example.com         :1883 (MQTT)
        │                        │                       │
   ┌────▼─────────────── Nginx (host, TLS) ──────────────┼──────┐
   │        │                        │                   │      │
   │   web :3000               api :4000                 │      │
   │  (container)             (container) ── postgres ──┐ │      │
   │                               │                    │ │      │
   │                           mosquitto :1883 ◄────────┴─┘◄─────┘ ESP32 bay
   └──────────────────── docker compose network ─────────────────┘
```

Replace `example.com` / `api.example.com` with your real domain everywhere below.

---

## 1. DNS

Create A records pointing at your VPS's public IP:

| Record | Host | Points to |
| --- | --- | --- |
| A | `example.com` | VPS IP |
| A | `api.example.com` | VPS IP |

(The ESP32 can also use `api.example.com` as its MQTT broker host.)

## 2. Prepare the server

SSH in as root (or a sudo user) and install Docker + Nginx + certbot:

```bash
# Docker Engine + compose plugin
curl -fsSL https://get.docker.com | sh

# Nginx + certbot
apt-get update && apt-get install -y nginx certbot python3-certbot-nginx

# Firewall
ufw allow OpenSSH
ufw allow 80,443/tcp
ufw allow 1883/tcp        # MQTT for the ESP32 (use 8883 if you enable TLS)
ufw --force enable
```

## 3. Get the code onto the server

```bash
# via git:
git clone <your-repo-url> /opt/car-wash && cd /opt/car-wash
# or copy from your machine:  scp -r F:/Capstone/car-wash user@vps:/opt/car-wash
```

## 4. Configure environment

```bash
cp .env.production.example .env
nano .env   # set strong POSTGRES_PASSWORD, matching DATABASE_URL, JWT_SECRET,
            # MQTT_PASSWORD, and your real API_PUBLIC_URL / WEB_PUBLIC_URL /
            # NEXT_PUBLIC_API_URL. Keep ENABLE_DEV_ROUTES=false.
```

Generate a good JWT secret: `openssl rand -base64 48`.

## 5. Create the MQTT password file

Credentials must exist before Mosquitto starts (the API user, plus one per bay):

```bash
docker run --rm -v "$PWD/infra/mosquitto:/m" eclipse-mosquitto:2 \
  mosquitto_passwd -b -c /m/passwd api      'THE_MQTT_PASSWORD_FROM_ENV'
docker run --rm -v "$PWD/infra/mosquitto:/m" eclipse-mosquitto:2 \
  mosquitto_passwd -b    /m/passwd bay-demo 'A_STRONG_BAY_PASSWORD'
```

`MQTT_USERNAME` / `MQTT_PASSWORD` in `.env` must match the `api` user above.

## 6. Build and start the stack

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## 7. Initialise the database (first deploy only)

```bash
# Apply migrations
docker compose -f docker-compose.prod.yml run --rm api \
  pnpm --filter @car-wash/db exec prisma migrate deploy

# Seed station / bay / plans / owner login
docker compose -f docker-compose.prod.yml run --rm api \
  pnpm --filter @car-wash/db exec prisma db seed
```

> The seed creates owner `owner@carwash.local` / `changeme123` and a `demo-bay`.
> **Change the owner password** after first login (Admin → Settings).

## 8. Nginx + HTTPS

```bash
sudo cp deploy/nginx/carwash.conf /etc/nginx/sites-available/carwash.conf
sudo ln -s /etc/nginx/sites-available/carwash.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
# Edit the file to put in your real domain first:
sudo nano /etc/nginx/sites-available/carwash.conf
sudo nginx -t && sudo systemctl reload nginx

# Issue certs (certbot rewrites the config to add :443 + redirect)
sudo certbot --nginx -d example.com -d www.example.com -d api.example.com
```

Certbot installs a renewal timer automatically.

## 9. Verify

```bash
curl https://api.example.com/health          # -> {"ok":true}
docker compose -f docker-compose.prod.yml ps  # all services Up
docker compose -f docker-compose.prod.yml logs -f api
```

Then open `https://example.com`. Admin login is at `https://example.com/admin/login`.

## 10. Connect the hardware / app

- **ESP32 bay controller**: broker host `api.example.com`, port `1883` (or `8883`
  if you enabled TLS), username `bay-demo` + its password. Bay id `demo-bay`.
- **Android owner app**: set the server URL to `https://api.example.com` and log
  in with the owner credentials. It posts UPI payment observations to the API
  (`ENABLE_DEV_ROUTES=false` means there is no mock payment path in production).

---

## Updating a deployment

```bash
cd /opt/car-wash && git pull        # or re-scp
docker compose -f docker-compose.prod.yml up -d --build
# run `prisma migrate deploy` (step 7) again if there are new migrations
```

## Backups

```bash
# Postgres dump
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U carwash carwash > backup-$(date +%F).sql
```

## Hardening notes

- **MQTT over TLS**: uncomment the 8883 listener in
  `infra/mosquitto/mosquitto.prod.conf`, mount the Let's Encrypt cert
  (`/etc/letsencrypt/live/api.example.com`) in `docker-compose.prod.yml`,
  publish `8883`, and point the ESP32 at `8883`. Prefer this over plaintext 1883
  on the public internet.
- Keep `ENABLE_DEV_ROUTES=false` — it exposes mock-payment routes.
- Postgres and the API/web ports are bound to the docker network / `127.0.0.1`
  only; nothing but Nginx and MQTT is reachable from the internet.
```
