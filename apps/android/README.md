# Car Wash Owner (Android)

Native Kotlin app that is both the **owner dashboard** and the **payment
listener**. The owner logs in, then gets a full native clone of the web admin
(overview, live bays, payments, issues, plans, insights, devices, settings +
payout VPA) plus a listener tab that reads UPI credit notifications and posts
HMAC-signed observations to the API. See the PRD §Payments.

## Login + dashboard

Launch → **sign in** (server URL + owner email/password → JWT, stored in
`EncryptedSharedPreferences`). The server URL prefills from a prior login or the
listener pairing; point it at a host the phone can reach, not `localhost`.

Once logged in, a scrollable tab bar switches between native screens that each
poll the `/admin/*` API every 5s (same data as the web):

| Tab | Backs onto |
| --- | --- |
| overview | `/admin/bays` + `/payments` + `/issues` + `/stats` |
| live | `/admin/bays`, remote-stop, scan QR |
| payments | `/admin/payments` + `/checkouts`, confirm / reject |
| issues | `/admin/issues`, resolve |
| plans | `/admin/plans`, edit price + on/off |
| insights | `/admin/stats` |
| devices | `/admin/devices`, pair (QR) / revoke |
| settings | payout VPA (`/admin/station`) + `/admin/settings` |
| listener | the payment-listener setup below |

Admin layer lives in `admin/` (`AdminApi.kt`, `AdminModels.kt`, `screens/`);
`net/ApiClient.kt` is still the HMAC device channel used by the listener.

> Built with its own toolchain (Gradle), **not** part of the Turborepo graph.
> It can't be compiled in the backend sandbox — build it on your machine.

## Build & run

Open `apps/android` in **Android Studio** (which provisions the Gradle wrapper
jar automatically), or from the CLI with a local Gradle ≥ 8.11:

```bash
cd apps/android
gradle wrapper        # one-time: generates ./gradlew + wrapper jar
./gradlew assembleDebug
# APK at app/build/outputs/apk/debug/app-debug.apk
```

Min SDK 26, target SDK 35.

## Onboarding flow

The app walks the owner through four screens (state is persisted, so it resumes
at the first incomplete step):

1. **Permissions** — requests Notification access, Show notifications
   (`POST_NOTIFICATIONS`), and Battery-optimisation exemption. The first two are
   required; the screen re-reads their state when you return from Settings.
2. **Choose payment app** — scans installed UPI apps (via the manifest
   `<queries>`). Only **FamPay** is selectable; every other app is blacked-out
   ("coming soon") because the parser only handles FamPay-style credits for now.
3. **Pair this phone** — in the web admin → **Devices → Pair a new phone** a QR
   appears containing `{ deviceId, signingKey, apiUrl }`; scan it here. The
   pairing is stored in `EncryptedSharedPreferences`. Point `apiUrl` at a host
   the phone can reach (your PC's LAN IP / a tunnel), **not** `localhost`.
4. **Dashboard** — listener on/off, receiving app, notification-access health,
   last payment, last heartbeat, and re-pair / change-app / permissions actions.

> Notifications not captured? The dashboard calls `requestRebind` whenever it can
> listen, which fixes Android leaving the listener unbound after a settings
> toggle. The listener also now reads every notification text field (text,
> big-text, sub-text, inbox lines), not just the first.

## Design system

UI follows the web's "Terminal Ember" system (`ui/theme/Theme.kt`): charcoal
`#0F1012`, warm off-white `#F0ECE6`, coral accent `#FC8A7D`, pastel highlights,
hairline borders, no shadows. Funnel Display / DM Sans aren't bundled on Android,
so headings/body use the platform sans and "code" accents use Monospace — drop
the real TTFs into `res/font` and update `Cw.display` / `Cw.body` to match
pixel-for-pixel.

## How it works

| Piece | File |
| --- | --- |
| Reads UPI notifications (selected package only) | `service/PaymentNotificationListener.kt` |
| Parses amount / UPI ref / sender VPA (credits only) | `parser/UpiParser.kt` |
| HMAC signing (`${ts}.${body}`) | `net/Hmac.kt`, `net/ApiClient.kt` |
| Offline queue + retry | `data/SecureStore.kt`, `delivery/Delivery.kt`, `work/DeliveryWorker.kt` |
| Keep-alive + 30s heartbeat | `service/ListenerForegroundService.kt` |
| Restart after reboot | `service/BootReceiver.kt` |
| Onboarding flow + nav | `ui/MainActivity.kt` |
| Screens | `ui/screens/{Permissions,SelectApp,Pairing,Home}Screen.kt` |
| Design-system theme + UI kit | `ui/theme/Theme.kt`, `ui/components/Components.kt` |
| Permission / rebind helpers | `ui/Platform.kt` |

## Deferred

- **FCM push alerts** (bay offline, unmatched payment, etc.) need a Firebase
  project + `google-services.json`; wire in once Firebase is set up.
- **Dashboard screens** (live bays, earnings, etc.) — the web admin covers these
  for now; port them here against the same `/admin/*` API using the JWT login.
- Additional per-app parser rules (beyond FamPay-style credit text).
