# Automated Car Wash — PRD

Oct 18, 2026 · @NK

## Overview

An unmanned car wash where customers scan a QR on the bay's screen, pay by UPI on their phone, and the pump motor starts automatically. No attendant is needed: an ESP32 at each bay controls the motor through a relay, and the server only accepts payments while that bay is online and able to run.

This is a final-year diploma project. The first milestone is a working software demo for the panel; hardware integration follows.

## Goals and scope

The presentation demo must show a full wash cycle end to end: scan, pay, motor starts, pause/resume, timer ends, and the owner sees it in the app.

**In scope for the demo**

- Customer website: plan selection, UPI payment, live session control
- Our own payment verification: Android owner app listens for UPI credit notifications
- Express API, database and MQTT messaging for one bay, built to support many
- Owner Android app: listener, live status, earnings, usage and health insights
- ESP32 simulator (software stand-in for the real device) so the demo runs without hardware

**Later**

- Real ESP32 firmware, TFT screen, relay and sensors (tank level, motor current, mains detection, battery backup)
- OTA firmware updates, multilingual website, digital receipts

## Users and roles

| Role | Uses | Can do |
| --- | --- | --- |
| Customer | Website (no login, session cookie), any phone | Pick a plan, pay, start/pause/resume own session, report an issue |
| Owner | Android app (Kotlin) | Verify payments (listener), see live bays, earnings, usage, health; approve pending payments; review issues; change prices and settings; remote stop |
| Bay device | ESP32 over MQTT | Show QR and status, switch the motor, send telemetry |

## System architecture

&#91;embedded content: system architecture · 1 bay now, more later\]

Frontend and backend are split and hosted on a VPS. The Express API is a long-running process, which suits what Next.js API routes handle poorly: a permanent MQTT connection, server-side session timers and live updates to browsers. Only the API sends commands to bays, each bay on its own topics (`wash/{bayId}/cmd`, `wash/{bayId}/status`). Adding a bay = flash the same firmware, set its bay ID, add it in admin.

**Monorepo (Turborepo + pnpm)**

```
apps/
  api/        Express + TypeScript: REST, payment matching, MQTT client, timers
  web/        Next.js: customer pages (scan, pay, session control)
  android/    Owner app, Kotlin + Gradle (listener + dashboard)
  firmware/   ESP32 code (PlatformIO)
  simulator/  Fake ESP32 for the demo
packages/
  shared/     Types, MQTT topics and payloads, plan logic
  db/         Prisma schema and migrations
```

The Android and firmware folders build with their own tools (Gradle, PlatformIO); Turborepo runs the JS/TS apps. On the VPS: Nginx in front, PM2 or Docker for `api` and `web`, Postgres and Mosquitto alongside.

Database shape: `Station → Bay → Session → Payment`, plus `Plan`, `Setting`, `Event`, `Reading` and `Issue`.

## Customer flow

A customer can only start a session by scanning the QR currently on the bay's screen; the token inside it rotates, so a shared photo stops working.

1. Customer scans the QR. The website opens at `/b/{bayId}?t={token}`.
2. Server checks the token is fresh and the bay is online and ready. If the bay is busy, the customer sees a waiting page.
3. Customer picks a plan (bike wash, car wash, 10/20/30 min). Prices come from the database.
4. Website shows a UPI pay button with the exact amount. Customer pays in any UPI app.
5. Payment is matched (see Payments). Server sends `start` to the bay; the motor runs.
6. Live session page: countdown, pause/resume, and a report-issue button. Control works through the session cookie; reopening the browser restores it.
7. Timer ends, motor stops, bay returns to ready and a new QR appears.

**Waiting page:** while a bay is in use, everyone else who scans sees "Bay in use" with the time left. When the session ends, the page refreshes to plan selection for all of them; whoever pays first gets the slot.

## Payments

Payments are verified by our own Android owner app (Kotlin), modelled on the YouPI PG observer: it listens for credit notifications from UPI apps on the owner's phone, parses the amount and UPI reference, and sends them to our API as a signed request. No third-party gateway, no fees; Android only.

- **Listener:** an Android `NotificationListenerService` reads notifications only from the one UPI app the owner selects as their receiving app, matched by package name. FamPay (\`com.fampay.in\`) at launch; other apps are added later as config entries (package name + parsing rules) the owner can pick from.
- **Parser:** per-app rules extract amount (stored as integer paise), UPI reference and sender VPA, and only accept credit messages ("received", "credited"), never debits or balance lines.
- **Delivery:** the app POSTs each observation to the API with an HMAC signature and timestamp; failed sends are queued on the phone and retried, so a weak network never loses a payment.
- **Pairing:** the app pairs once by scanning a one-time QR from the admin; the server issues a device ID and signing key, stored in encrypted storage.
- **Always on:** a foreground service, boot receiver and battery-optimisation exemption keep the listener alive; a heartbeat every 30 s tells the server it is listening.
- **Unique amount per checkout:** each checkout gets unique paise (e.g. ₹50.03) for a configurable window, so a notification maps to exactly one customer even when several pay at once.
- **UPI link / QR:** `upi://pay?pa=<owner VPA>&pn=<name>&am=<amount>&cu=INR&tn=<checkout id>` opens the customer's UPI app with the amount filled in.
- **Duplicates:** an observation with an already-seen UPI reference is ignored; notification + SMS for the same payment count once.
- **Amount less than expected:** motor does not start; payment goes to the owner's pending list and the customer is pointed to the issue form.
- **Amount more than expected:** motor starts; customer is told to use the issue form for a refund of the extra.
- **No match within the timeout:** checkout marked pending; owner confirms or rejects in the app.
- **Refunds:** always manual, via the issue form and the owner.

## Bay device behaviour

The bay screen shows a QR only when the motor can actually run; otherwise it shows why it is out of service.

| Screen state | Shown when | On screen |
| --- | --- | --- |
| Ready | Online, mains on, water available, no fault | Rotating QR + plan prices |
| In use | Session running | Countdown, "Bay in use" |
| Paused | Customer paused | Remaining time, pause time left |
| Power returned | Mains back mid-session | "Tap resume on your phone" + buzzer |
| Out of service | No water, no mains, motor fault or offline | Reason, no QR |

- The ESP32 runs the session timer locally and saves remaining time to flash, so a reboot does not lose the session.
- After a power cut, the motor never restarts on its own; the customer must tap resume.
- If the bay goes offline after payment, the customer is redirected to the issue form and the owner is alerted.
- Until hardware is ready, a software simulator plays the ESP32's role over the same MQTT topics.

## Owner app and admin

The owner app is a native Android app (Kotlin) that is both the merchant dashboard and the payment listener. It must run on the phone where the owner's UPI account receives payments; a second phone can install it in dashboard-only mode.

| Screen | Shows / does |
| --- | --- |
| Listener | Listener on/off, last payment seen, last heartbeat, permission checks (notification access, battery exemption) |
| Live | Each bay's state, countdown, mains and battery, remote stop |
| Earnings | Today / week / month, split by plan |
| Usage | Session count, average duration, peak-hours heatmap, most popular plan |
| Health | Uptime %, outage log, motor runtime hours with service-due reminder, water and power per wash |
| Payments | Every observed payment and its match; pending payments to confirm or reject |
| Issues | Customer reports with status |
| Settings | Plans and prices, pause limit, QR rotation interval, timeouts, alert thresholds |

Push alerts (Firebase Cloud Messaging): bay offline, listener offline, power cut, low water, motor fault, stuck relay, new issue report, unmatched payment.

## Edge cases and decisions

| # | Situation | Decision |
| --- | --- | --- |
| 1 | Someone tries to start the motor remotely | Rotating QR token only; no GPS |
| 2 | Pause/resume after payment | Session cookie, no extra proximity check |
| 3 | Payment notification never arrives | Marked pending; owner confirms or rejects |
| 4 | Paid less than the plan price | Motor does not start; pending + issue form |
| 5 | Paid more than the plan price | Motor starts; refund via issue form |
| 6 | Same payment seen twice (notification + SMS, or repeat) | Counted once, by UPI reference number |
| 7 | Bay busy when someone scans | Waiting page; open to all when the slot frees; first to pay wins |
| 8 | Customer pauses too long | Configurable pause limit |
| 9 | Customer closes the browser | Session continues; reopen via cookie |
| 10 | Time runs out mid-wash | No extension; buy a new slot |
| 11 | Bay offline before payment | Payments blocked; screen shows out of service |
| 12 | Bay offline after payment | Redirect to issue form; owner alerted |
| 13 | Power returns mid-session | Wait for customer to tap resume; buzzer sounds |
| 14 | ESP32 reboots mid-session | Remaining time restored from flash |
| 15 | Motor fault, no water, no mains | QR hidden, reason shown, owner alerted |
| 16 | Unusual readings in telemetry | Owner notified |
| 17 | Any payment or service problem | Report-an-issue form; owner reviews |
| 18 | Owner's listener phone offline, killed or notification access revoked | No heartbeat for the set time: payments blocked, screen shows out of service, owner alerted |
| 19 | Listener phone sends while offline | Observations queued on phone and retried; late arrivals still matched by unique amount within the window |
| 20 | A fake app posts a "₹50 received" notification | Ignored: only the owner's selected app package is read (owner's phone is trusted, so no certificate check) |
| 21 | Notification text format changes after a UPI app update | Unparsed notifications are logged raw and shown to the owner, so parser rules can be updated |

## Configuration

No business values are hard-coded: secrets live in `.env`, everything the owner may tune lives in the database and is editable from the app. Default values below are starting suggestions.

| Setting | Where | Suggested default |
| --- | --- | --- |
| Plans, durations, prices | Database (per station) | Bike wash, car wash, 10 / 20 / 30 min |
| Pause limit per session | Database | 3 min |
| QR rotation interval | Database | 60 s |
| Checkout amount-matching window | Database | 5 min |
| Payment pending timeout | Database | 3 min |
| Bay heartbeat interval | Database (pushed to device) | 10 s |
| Bay offline threshold | Database | 30 s without heartbeat |
| Listener heartbeat interval | Database (pushed to app) | 30 s |
| Listener offline threshold | Database | 2 min without heartbeat |
| Receiving UPI app | Database | One selected app; FamPay at launch |
| Alert thresholds (low water, motor current) | Database | Set after hardware calibration |
| Owner UPI VPA and payee name | Database | — |
| MQTT broker URL and credentials, DB URL, JWT secret | `.env` | — |

## Telemetry, logging and alerts

Every state change and a periodic heartbeat are logged, so all owner insights are computed from real data.

- **Heartbeat** (every configured interval): motor state, mains, battery voltage, WiFi signal, remaining time; later tank level and motor current.
- **Events** (instantly): session started/paused/resumed/ended, power lost/restored, payment matched, fault detected.
- **Storage:** Postgres; an `events` table and a `readings` table (TimescaleDB optional). Raw readings kept 30 days, then rolled into hourly averages.
- **Offline buffering:** the device stores events in flash while offline and uploads them on reconnect.
- **Alerts:** rules over events and readings trigger owner push notifications (offline, power cut, low water, motor fault, stuck relay).

## Security

- Only the API can publish motor commands; the website and app talk to the API, never to MQTT directly.
- Each bay has its own MQTT username/password and may only use its own topics; TLS on the broker.
- Every command carries a unique ID and expiry; the device ignores repeats and stale commands.
- Listener app pairs via a one-time QR; every payment event is HMAC-signed with a timestamp, and the API rejects bad signatures and timestamps older than 5 min (replay protection). Heartbeats are signed too.
- Signing key kept in Android encrypted storage; owner can revoke a paired phone from the app or admin.
- Rate limits on checkout, control and listener endpoints.
- Owner app and admin require login (JWT).

## Open questions

- [ ] **Two people pay at nearly the same time:** the first payer gets the bay; what happens to the second payment? Suggested: keep it as a credit that starts their session as soon as the bay is free, or send them to the issue form.
- [ ] **YouPI PG licence:** its package.json says "Commercial" and the repo has no licence file, so use it as a reference and write our own Kotlin rather than copying files.
- [ ] Which UPI apps and bank does the owner's account use? Their real notification texts are needed to write and test the parser rules.
- [ ] Is a web admin also needed, or is the Android app the only owner interface?
- [x] Owner app: native Android (Kotlin), Android only.
- [x] Backend: Express API on a VPS, separate from the Next.js website.
