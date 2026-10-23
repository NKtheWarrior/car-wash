# Synopsis Report — Specification & Source Material

**Project:** Automated Car Wash — An Unmanned, UPI-Verified, IoT-Controlled Wash Bay
**Type:** Final-year Diploma Capstone Project
**Date:** October 2026

> **Purpose of this document.** This is a writing specification, not the report
> itself. It gathers every fact, figure, diagram outline and section plan needed
> to author a professional synopsis report. Each numbered section below maps to a
> section of the final report; the bullet points are the content to expand into
> prose, tables and figures. All material here reflects the system as actually
> built, not development conveniences.

---

## 0. How to use this spec

- Sections 1–14 are the recommended report structure. Reorder or merge to fit
  your institution's synopsis format (most diploma synopses run 15–30 pages).
- "**Figure:**" markers indicate where a diagram should be drawn; an outline of
  each diagram is given so it can be produced in draw.io / Lucidchart.
- "**Table:**" markers indicate tabular content; the data is supplied inline.
- Keep the tone third-person and present tense ("The system verifies…"), which
  reads as professional specification writing.

---

## 1. Title Page & Front Matter

Content to include:

- Project title: **Automated Car Wash — An Unmanned, UPI-Verified Wash Bay**
- Subtitle: *A gateway-free payment verification and IoT motor-control system*
- Student / team names, roll numbers, guide name, department, institution, year
- Abstract (see Section 2)
- Table of contents, list of figures, list of tables

---

## 2. Abstract (≈200 words)

Draft the abstract from these points:

- The project is an **unmanned, self-service car wash** that removes the need for
  an on-site attendant and for any third-party payment gateway.
- A customer scans a **rotating QR code** displayed at the wash bay, pays the
  exact plan price over **UPI** from their own phone, and the bay's **pump motor
  starts automatically** once payment is confirmed.
- Payment confirmation is achieved **without a payment gateway or transaction
  fees**: an Android application on the owner's phone listens to incoming UPI
  **credit notifications**, parses the amount and reference, and reports each
  payment to the backend over a **cryptographically signed** channel.
- The bay hardware is an **ESP32 microcontroller** that drives the motor relay
  and communicates with the server over the lightweight **MQTT** protocol.
- The backend is a split **web + API architecture**: a customer-facing website
  for scan/pay/control, and a long-running API server that performs payment
  matching, session timing and device messaging.
- The owner monitors earnings, usage, device health and customer issues through a
  **native Android dashboard** and an equivalent **web admin** console.
- The result is a low-cost, fee-free, horizontally scalable car-wash automation
  platform demonstrated end-to-end on a single bay and architected for many.

---

## 3. Introduction

### 3.1 Background & motivation
- Conventional car washes depend on attended booths for payment collection and
  machine operation — a recurring labour cost and a constraint on operating hours.
- UPI is now the dominant retail payment rail in India, but merchant integration
  normally requires a payment aggregator that charges per-transaction fees and
  imposes onboarding/KYC overhead.
- The project's thesis: a small operator can run a **24×7 unmanned** wash bay and
  verify payments **using only the UPI notifications their own phone already
  receives**, eliminating both the attendant and the gateway fee.

### 3.2 Problem statement
- Automate the full wash cycle (payment → motor start → timed wash → stop) with
  **no human in the loop**, while guaranteeing that **the motor only runs for a
  customer who has actually paid the correct amount**.

### 3.3 Objectives
1. Let a customer start a wash by scanning a QR and paying over UPI, with no app
   install and no login.
2. Verify each payment **in-house**, with no payment gateway and no fees.
3. Control the physical motor safely and automatically over the network.
4. Give the owner real-time visibility of money, usage and machine health.
5. Build the system for **one bay today and many bays later** without redesign.
6. Enforce security so the motor cannot be triggered without a genuine, matched
   payment.

### 3.4 Scope
- **In scope / delivered:** customer website, in-house UPI payment verification
  (Android listener), REST API with payment matching and session timing, MQTT
  messaging, owner Android app (listener + dashboard), web admin, ESP32 bay
  firmware, shared contracts package, database schema, and a production
  deployment path.
- **Out of scope / future work:** multi-language website, digital receipts, OTA
  firmware updates, TimescaleDB roll-ups, additional UPI-app parsers beyond the
  launch set, battery-backup and advanced sensor calibration.

---

## 4. Literature / Technology Survey

Summarise the key technologies and *why each was chosen* (this doubles as the
"tools and technologies" section):

**Table: Technology stack**

| Layer | Technology | Version | Why chosen |
| --- | --- | --- | --- |
| Monorepo tooling | Turborepo + pnpm | turbo 2.3, pnpm 11.10 | One repo, shared types, cached builds across apps |
| API server | Node.js + Express + TypeScript | Express 4.21, TS 5.7, Node ≥20 | Long-running process for persistent MQTT connection, timers and live updates |
| Website | Next.js (React) | Next 15.1, React 19 | Server-rendered customer pages + admin console |
| Database | PostgreSQL + Prisma ORM | Prisma 6.19 | Relational integrity for money/sessions; typed data access |
| Messaging | MQTT (Mosquitto broker) | mqtt 5.10 | Lightweight pub/sub suited to constrained IoT devices |
| Live updates | Server-Sent Events (SSE) | — | Push bay/session state to browsers and admin without polling overhead |
| Owner app | Kotlin + Jetpack Compose | Kotlin 2.0, Compose BOM 2024.12, minSdk 26 / targetSdk 35 | Native notification access + modern declarative UI |
| Bay controller | ESP32 + PlatformIO (C++) | — | Low-cost Wi-Fi MCU with GPIO for relay/sensors |
| Auth / integrity | JWT, bcrypt, HMAC-SHA256 | jsonwebtoken 9, bcryptjs 2.4 | Owner login; tamper-proof payment reports |
| Validation | Zod schemas | Zod 3.24 | Runtime validation of all API inputs |

- Note the comparison point: the in-house listener approach is **modelled on the
  open-source "YouPI PG" notification-observer pattern**, but re-implemented from
  scratch in Kotlin (the reference project has no open licence, so it was used
  only as a conceptual reference).

---

## 5. System Architecture

### 5.1 High-level overview
**Figure: System architecture diagram.** Outline the following nodes and flows:

- **Customer phone (browser)** → HTTPS → **Web (Next.js)** and → **API (Express)**
- **Owner phone (Android app)** → HTTPS (signed) → **API**
- **API** ↔ **PostgreSQL** (data), **API** ↔ **Mosquitto (MQTT broker)**
- **Mosquitto** ↔ **ESP32 bay controller** (per-bay topics)
- **API** → **Web/Admin browsers** via SSE (live updates)
- Hosting: Nginx reverse proxy (TLS) in front of web + API; Postgres and
  Mosquitto alongside, all on one VPS via Docker Compose.

Key architectural decision to state explicitly:

- **Only the API publishes motor commands.** The website, the owner app and the
  bay devices never command each other directly. This single choke point is what
  makes the security model enforceable.
- The API is a **long-running process** precisely because the workload — a
  permanent MQTT connection, server-side session countdown timers, and live push
  to browsers — is a poor fit for stateless serverless/Next.js API routes.

### 5.2 Monorepo layout
**Table: Repository structure**

| Path | Responsibility |
| --- | --- |
| `apps/api` | Express + TS: REST endpoints, payment matching, MQTT client, session timers, SSE |
| `apps/web` | Next.js: customer pages (scan / pay / session) + web admin console |
| `apps/android` | Kotlin owner app: payment listener + full dashboard |
| `apps/firmware` | ESP32 PlatformIO firmware for one bay |
| `packages/shared` | Shared TypeScript: MQTT topics & payloads, HMAC helpers, amount helpers, UPI link builder, Zod schemas |
| `packages/db` | Prisma schema, migrations, seed script |

- The JS/TS apps are built and run by Turborepo; **Android (Gradle)** and
  **firmware (PlatformIO)** build with their own toolchains and are deliberately
  outside the Turbo graph.

### 5.3 Multi-bay design
- Each bay is identified by a `bayId` and lives on **its own MQTT topic
  namespace**, so a bay can only read/write its own topics.
- Adding a bay = flash the same firmware with a new `BAY_ID` + credentials and
  register the bay row; no code change. The entire data model is keyed on
  `Station → Bay`, so the demo runs one bay while the design supports many.

---

## 6. Data Model

**Figure: Entity-Relationship diagram.** Core shape:
`Station → Bay → Session → Payment`, with `Plan`, `Checkout`, `Setting`,
`Event`, `Reading`, `Issue`, `Device`, and `User` around it.

**Table: Entities**

| Entity | Purpose | Notable fields |
| --- | --- | --- |
| `Station` | A physical location / owner account | `ownerVpa`, `payeeName` |
| `Bay` | One wash bay | `status`, `online`, `lastHeartbeatAt`, per-bay `mqttUser/mqttPass`, rotating `currentToken` + `tokenExpiresAt` |
| `Plan` | A purchasable wash | `vehicleType` (bike/car), `durationSec`, `pricePaise`, `active` |
| `Checkout` | A pay attempt awaiting a matching credit | `amountPaise` (unique), `state`, `expiresAt`, `cookieId` |
| `Session` | A running/finished wash | `state`, `cookieId`, `remainingSec`, `pauseUsedSec`, `startedAt/endedAt` |
| `Payment` | An observed UPI credit | `amountPaise`, `upiRef` (**unique dedupe key**), `senderVpa`, `rawText`, `state` |
| `Device` | A paired Android phone | `role` (listener/dashboard), `signingKey`, `lastHeartbeatAt`, `revoked` |
| `Event` | A logged state change | `type`, `data` (JSON), `bayId` |
| `Reading` | A telemetry snapshot | `motorOn`, `mains`, `batteryMv`, `wifiRssi`, `remainingSec` |
| `Issue` | A customer-reported problem | `kind`, `description`, `status` (open/resolved) |
| `Setting` | A tunable per-station value | `key`, `value` (string) |
| `User` | Owner login | `email`, `passwordHash` (bcrypt) |

**Design points to call out:**
- **All money is stored as integer paise**, never floats — avoids rounding error.
- **State machines** are modelled as database enums:
  - Bay: `ready → in_use → paused → power_returned → out_of_service`
  - Session: `pending → running → paused → ended`
  - Checkout: `awaiting → matched / pending / expired / cancelled`
  - Payment: `matched / unmatched / duplicate / pending`
- **No business value is hard-coded.** Prices, durations, timeouts and thresholds
  live in the `Plan` and `Setting` tables and are editable by the owner; only
  secrets (DB URL, JWT secret, MQTT credentials) live in environment config.

---

## 7. Customer Flow (Functional Walk-through)

**Figure: Customer sequence diagram** (actors: Customer browser, Web, API,
MQTT, Bay). Steps:

1. Customer scans the bay's QR; the browser opens `/b/{bayId}?t={token}`.
2. API validates the token is **fresh** and the bay is **online and ready**. A
   busy bay shows a **waiting page** with time remaining.
3. Customer selects a plan (bike/car × 10/20/30 min); prices come from the DB.
4. The site shows a **UPI pay button** carrying the exact unique amount; the
   customer pays in any UPI app via a `upi://pay?...` deep link / QR.
5. The owner phone observes the credit, reports it, the API **matches** it to the
   checkout, and publishes a `start` command to the bay — the motor runs.
6. The **live session page** shows a countdown with **pause / resume** and a
   **report-issue** button. Control is bound to a **session cookie**, so closing
   and reopening the browser restores control.
7. When the timer ends, the motor stops, the bay returns to `ready`, and a new
   rotating QR appears.

**Anti-abuse property to highlight:** the QR token **rotates on an interval**, so
a photo of the QR shared with someone else stops working — a session can only be
started from the code currently on the bay screen.

---

## 8. Payment Verification Subsystem (the core innovation)

This is the project's distinguishing contribution; give it its own detailed
section.

### 8.1 Principle
- No payment gateway. The owner's own phone already receives a **UPI credit
  notification** for every payment into their account. The Android app reads that
  notification and reports it to the server; the server decides whether it
  matches a pending checkout.

### 8.2 How a payment is uniquely identified
- Each checkout is assigned a **unique amount in paise** = plan price + a small
  sub-rupee offset (e.g. ₹50.00 → ₹50.03), chosen from offsets not currently in
  use by other live checkouts (max offset 99 paise, randomised start to avoid
  collisions). This lets a single incoming notification map to **exactly one
  customer**, even when several people pay at the same moment.

### 8.3 Pipeline
**Figure: Payment pipeline.** Notification → Listener → Parser → Signed delivery
→ API match.

- **Listener:** an Android `NotificationListenerService` reads notifications
  **only from the one UPI app the owner selects** (matched by package name; the
  launch target is FamPay, `com.fampay.in`). Other apps appear disabled until a
  parser is added.
- **Parser:** per-app rules extract amount (as paise), UPI reference and sender
  VPA, and **accept only credit messages** ("received"/"credited"), never debits
  or balance lines. (A unit test fixes a real quirk: for FamPay the word "sent"
  denotes a credit to the receiver, not a debit.)
- **Delivery:** each observation is POSTed to the API with an **HMAC signature
  and timestamp**. Failed sends are **queued on the phone and retried**, so a
  weak network never loses a payment.
- **Match (server):** the API looks for a live checkout with the exact amount.
  - Exact match → checkout `matched`, motor `start` issued.
  - **Paid less** than the plan price → motor does **not** start; checkout goes to
    the owner's **pending** list, customer pointed to the issue form.
  - **Paid more** → motor starts; customer told to use the issue form for a
    refund of the excess.
  - **No match within the timeout** → checkout `pending`; owner confirms/rejects.
  - **Duplicate** (same `upiRef` seen again, e.g. notification + SMS) → counted
    once; the `upiRef` is a unique key in the database.

### 8.4 Reliability & liveness
- **Pairing:** the app pairs once by scanning a one-time QR from the admin; the
  server issues a **device ID and signing key**, stored in Android
  **EncryptedSharedPreferences**.
- **Always-on:** a **foreground service**, a **boot receiver**, and a
  **battery-optimisation exemption** keep the listener alive; a **heartbeat**
  every 30 s tells the server the listener is live. If heartbeats stop, the server
  **blocks payments** and marks the bay out of service.

---

## 9. Bay Device Behaviour (Firmware)

**Table: Bay screen states**

| State | Shown when | On screen |
| --- | --- | --- |
| Ready | Online, mains on, water available, no fault | Rotating QR + plan prices |
| In use | Session running | Countdown, "Bay in use" |
| Paused | Customer paused | Remaining time + pause time left |
| Power returned | Mains back mid-session | "Tap resume on your phone" + buzzer |
| Out of service | No water / no mains / motor fault / offline | Reason shown, **no QR** |

Firmware facts (ESP32, PlatformIO, C++):

- Drives a **pump relay** (default active-high on GPIO 26), a **buzzer** (GPIO
  27), and reads **mains** and **water** sense pins (GPIO 34/35).
- Runs the **session countdown locally** and **persists remaining time to flash**
  every few seconds, so a reboot mid-session does not lose the session.
- **Safety rule:** after a power cut the motor **never auto-restarts** — the
  screen asks the customer to tap *resume* and only a fresh `resume` command
  starts the motor again.
- Publishes a **heartbeat** every 10 s; the API marks the bay offline if it stops.
- Commands are **de-duplicated by `cmdId`** and **ignored once past `expiresAt`**
  (the device syncs time via NTP on boot).

---

## 10. Owner Application & Admin Console

The owner has two equivalent interfaces: the **native Android app** and the
**web admin**. The Android app additionally hosts the payment listener and must
run on the phone whose UPI account receives payments.

**Table: Owner screens**

| Screen | Shows / does |
| --- | --- |
| Listener (Android only) | Listener on/off, last payment seen, last heartbeat, permission checks |
| Live / Overview | Each bay's state, countdown, mains/battery, **remote stop** |
| Earnings | Today / week / month, split by plan |
| Usage / Insights | Session count, average duration, peak-hours pattern, most popular plan |
| Health | Uptime %, outage log, motor-runtime hours with service-due reminder |
| Payments | Every observed payment and its match; **pending** payments to confirm/reject |
| Issues | Customer reports with status (open/resolved) |
| Plans | Create / edit / delete plans and prices |
| Settings | Pause limit, QR rotation interval, timeouts, alert thresholds, owner VPA / payee name |
| Devices / Pairing | Pair a listener phone (one-time QR), list and **revoke** paired devices |

- The Android dashboard **polls the `/admin/*` endpoints every 5 s**; the web
  admin receives live updates over SSE.
- Both are gated by **owner login** (email + password → JWT).

---

## 11. API Surface

Summarise the REST interface. All admin routes require a JWT; all listener routes
require a valid device HMAC signature.

**Table: Representative endpoints**

| Group | Method & path | Purpose |
| --- | --- | --- |
| Health | `GET /health` | Liveness probe |
| Auth | `POST /auth/login`, `GET /auth/me` | Owner login (JWT), current user |
| Customer | `GET /b/:bayId` | Bay + plan state for the scan page |
| Customer | `POST /b/:bayId/checkout` | Create a checkout (allocates unique amount) |
| Customer | `GET /checkout/:id` | Poll checkout state |
| Customer | `GET /session/:id` | Session state |
| Customer | `POST /session/:id/{pause\|resume}` | Control own session (cookie-bound) |
| Customer | `POST /issue` | Report a problem |
| Listener | `POST /observations` | Report an observed UPI credit (signed) |
| Listener | `POST /listener/heartbeat` | Listener liveness (signed) |
| Admin | `GET /admin/payments`, `.../:id/confirm`, `.../:id/reject` | Review & resolve payments |
| Admin | `GET /admin/bays`, `POST /admin/bays/:id/stop` | Live bays, remote stop |
| Admin | `GET/POST/PUT/DELETE /admin/plans[/:id]` | Manage plans & prices |
| Admin | `GET/PUT /admin/settings`, `/admin/station` | Tunables, station/VPA |
| Admin | `GET /admin/issues`, `.../:id/resolve` | Customer issues |
| Admin | `POST /admin/pairing`, `GET /admin/devices`, `.../:id/revoke` | Device pairing & revocation |
| Admin | `GET /admin/stats` | Earnings / usage / health figures |
| Stream | `GET /b/:bayId/stream`, `GET /admin/stream` | SSE live updates |

**MQTT contract**

| Topic | Direction | Payload |
| --- | --- | --- |
| `wash/{bayId}/cmd` | API → device | `{cmdId, type, expiresAt, issuedAt, durationSec?, sessionId?}` |
| `wash/{bayId}/token` | API → device (retained) | `{token, url, expiresAt}` for the QR |
| `wash/{bayId}/status` | device → API | heartbeat + state snapshot (`screen`, `motorOn`, `mains`, `batteryMv?`, `wifiRssi?`, `remainingSec?`) |

---

## 12. Security Design

Present this as a dedicated section — it is a grading strength.

- **Single command authority:** only the API may publish motor commands;
  browsers and the app never talk to MQTT directly.
- **Per-bay MQTT credentials:** each bay has its own username/password and is
  restricted to its own topics; the broker supports TLS (port 8883) for
  deployment over the public internet.
- **Command integrity:** every command carries a **unique id and an expiry**; the
  device ignores repeats and stale commands (replay protection at the device).
- **Signed payment reports:** every observation and heartbeat from the listener
  is **HMAC-SHA256 signed** over `${timestampMs}.${rawBody}` using the device's
  signing key. The API rejects **bad signatures** and **timestamps older than 5
  minutes** (replay protection at the server). The raw request bytes are signed,
  not a re-serialised object.
- **Device lifecycle:** listener phones pair via a **one-time QR**; the signing
  key lives in **Android encrypted storage**; the owner can **revoke** a device
  from the admin at any time.
- **Session control:** a customer controls only their own session via an
  unguessable **session cookie**; the rotating QR token prevents a shared photo
  from starting a wash.
- **Owner authentication:** the Android app and web admin require **JWT login**;
  passwords are stored as **bcrypt hashes**.
- **Input validation:** all request bodies are validated with **Zod schemas**.
- **Trust boundary note:** the owner's phone is a trusted device, so a spoofed
  "₹x received" notification from *another* app is ignored because the listener
  reads only the **owner-selected package**.

---

## 13. Deployment & Operations

- **Target:** a single Ubuntu VPS running **Docker Compose** (API, web, Postgres,
  Mosquitto) behind **Nginx** with **Let's Encrypt TLS**.
- **Topology:** `example.com` → web (:3000), `api.example.com` → API (:4000),
  MQTT on :1883 (or :8883 with TLS) for the ESP32. Postgres and the app ports are
  bound to the Docker network / loopback — **only Nginx and MQTT are exposed**.
- **Provisioning steps:** DNS A-records → install Docker/Nginx/certbot → clone
  repo → configure `.env` → create MQTT password file (API user + per-bay user) →
  `docker compose up --build` → run Prisma migrations + seed → issue TLS certs →
  verify `GET /health`.
- **Operations covered:** rolling updates (`git pull` + rebuild + migrate),
  **Postgres backups** (`pg_dump`), and MQTT-over-TLS hardening.

**Table: Owner-tunable configuration (defaults)**

| Setting | Default |
| --- | --- |
| Plans / durations / prices | Bike & car wash × 10/20/30 min (seeded ₹30–₹110) |
| Pause limit per session | 3 min |
| QR rotation interval | 60 s |
| Checkout amount-matching window | 5 min |
| Payment pending timeout | 3 min |
| Bay heartbeat interval | 10 s |
| Bay offline threshold | 30 s without heartbeat |
| Listener heartbeat interval | 30 s |
| Listener offline threshold | 2 min without heartbeat |

---

## 14. Edge Cases Handled

Reproduce as a table — it demonstrates design rigour.

**Table: Edge cases & decisions**

| Situation | Decision |
| --- | --- |
| Someone tries to start the motor remotely | Only the rotating QR token starts a wash |
| Payment notification never arrives | Checkout marked pending; owner confirms/rejects |
| Paid less than plan price | Motor does not start; pending + issue form |
| Paid more than plan price | Motor starts; refund via issue form |
| Same payment seen twice (notification + SMS) | Counted once, by UPI reference |
| Bay busy when someone scans | Waiting page; slot opens to all when free; first to pay wins |
| Customer pauses too long | Configurable pause limit enforced |
| Customer closes the browser | Session continues; restored via cookie |
| Time runs out mid-wash | No extension; buy a new slot |
| Bay offline before / after payment | Payments blocked before; issue form + owner alert after |
| Power returns mid-session | Motor waits for customer to tap resume; buzzer sounds |
| ESP32 reboots mid-session | Remaining time restored from flash |
| Motor fault / no water / no mains | QR hidden, reason shown, owner alerted |
| Listener phone offline / access revoked | No heartbeat → payments blocked, bay out of service, owner alerted |
| Spoofed "payment received" from another app | Ignored — only owner-selected package is read |
| UPI app changes notification format | Unparsed text logged raw and shown to owner so rules can be updated |

---

## 15. Telemetry, Logging & Insights

- Every state change raises an **Event**; the device also pushes periodic
  **Readings** (motor state, mains, battery, Wi-Fi signal, remaining time).
- All owner insights (earnings, usage, uptime, motor-runtime, popular plan) are
  **computed from this real logged data**, not estimated.
- Offline buffering: the device stores events in flash while offline and uploads
  on reconnect. (Roadmap: 30-day raw retention then roll-up to hourly averages.)
- **Alerts** (roadmap via Firebase Cloud Messaging): bay offline, listener
  offline, power cut, low water, motor fault, stuck relay, new issue, unmatched
  payment.

---

## 16. Testing & Verification

- **Shared package** carries unit tests for the two riskiest pure functions:
  **HMAC signing/verification** and **unique-amount allocation**, plus the
  **FamPay credit parser** (JUnit, on the Android side).
- The full cycle has been verified **end-to-end**: scan → pay → match → motor
  start → countdown → pause/resume → end, across web (customer + admin), API, DB
  and MQTT.
- Type safety is enforced repo-wide (`typecheck`) and shared contracts
  (topics, payloads, schemas) are a single source of truth for client and server.

---

## 17. Results & Conclusion

Points to make:

- A complete, working, **fee-free** self-service car-wash system was delivered:
  a customer can pay and run a wash with **no attendant, no app install, no
  gateway**.
- The **in-house UPI verification** is the key result — it removes per-transaction
  fees and gateway onboarding while keeping a strong security posture (signed,
  replay-protected, deduplicated, uniquely-matched payments).
- The system is **demonstrated on one bay** and **architected for many** with no
  code change per bay.

---

## 18. Future Enhancements

- Real sensor calibration (tank level, motor current, mains detection) and
  **battery backup**.
- **OTA firmware updates** and a physical TFT bay display.
- **Multi-language** website and **digital receipts**.
- Additional **UPI-app parsers** beyond the launch set, selectable by the owner.
- **TimescaleDB** roll-ups for long-term telemetry, and FCM push alerts.
- Concurrency policy for two near-simultaneous payers (credit-carry vs. refund).

---

## 19. Appendices (optional)

- A. Full ER diagram
- B. Full API endpoint list
- C. MQTT topic & payload reference
- D. Screenshots: customer scan/pay/session, web admin, Android dashboard
- E. Glossary: UPI, VPA, HMAC, MQTT, SSE, JWT, ESP32, QR token rotation

---

### Figures checklist (to produce)

1. System architecture (Section 5.1)
2. Entity-Relationship diagram (Section 6)
3. Customer flow sequence diagram (Section 7)
4. Payment verification pipeline (Section 8.3)
5. Bay state machine (Section 9)
6. Deployment topology (Section 13)
