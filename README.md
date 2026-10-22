# Automated Car Wash

Unmanned car wash: scan a rotating QR at the bay → pay by UPI → the server starts the
bay's motor over MQTT. Payments are verified by the owner's own Android app (a UPI
notification listener) — no payment gateway. See [`PRD.md`](./PRD.md) for the full spec
and [the implementation plan](./.claude/plans) for the build order.

## Monorepo layout

| Path | What |
| --- | --- |
| `apps/api` | Express + TS: REST, payment matching, MQTT client, session timers, SSE |
| `apps/web` | Next.js: customer (scan/pay/session) + admin pages |
| `apps/android` | Kotlin owner app (payment listener + dashboard) |
| `apps/firmware` | ESP32 PlatformIO |
| `packages/shared` | Types, MQTT topics/payloads, HMAC + amount helpers, Zod schemas |
| `packages/db` | Prisma schema, migrations, seed |

## Prerequisites

- Node ≥ 20, pnpm ≥ 11
- Docker (for local Postgres + Mosquitto), or your own Postgres + MQTT broker

## Quick start (software demo)

```bash
cp .env.example .env            # fill in secrets if needed
pnpm install
pnpm infra:up                   # starts Postgres + Mosquitto (docker compose)
pnpm db:migrate && pnpm db:seed # create schema + seed station/bay/plans/owner
pnpm dev                        # runs api + web via turbo
```

Then open the seeded bay URL printed by the seed script to run a full cycle
(scan → pay (mocked) → motor start → countdown → pause/resume → end).

## Useful scripts

| Command | Does |
| --- | --- |
| `pnpm infra:up` / `pnpm infra:down` | Start/stop Postgres + Mosquitto |
| `pnpm db:migrate` | Apply Prisma migrations |
| `pnpm db:seed` | Seed demo data |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm dev` | Run all JS/TS apps in dev |
| `pnpm build` / `pnpm test` / `pnpm typecheck` | Across the workspace |

> The Android and firmware apps build with their own tooling (Gradle, PlatformIO)
> and are not part of the `turbo` graph.
