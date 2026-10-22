# Bay controller firmware (ESP32)

Drives one wash bay: MQTT to the API, pump relay, local session countdown
persisted to flash, and the rotating QR. See the PRD §Bay device behaviour.

> Built with PlatformIO, **not** part of the Turborepo graph, and can't be
> compiled/flashed in the backend sandbox — build it on your machine.

## Build & flash

```bash
cd apps/firmware
pio run                 # build
pio run -t upload       # flash the connected ESP32
pio device monitor      # serial logs (115200) — prints the QR as ASCII
```

## Configure

Edit `include/config.h`:

- `BAY_ID` and `MQTT_USER` / `MQTT_PASS` must match the Bay row seeded in the DB
  (`bay-demo` / `bay-demo-secret` for the demo bay).
- `MQTT_HOST` = the LAN IP of the machine running Mosquitto (not `localhost`).
- `WIFI_SSID` / `WIFI_PASSWORD`.
- `PIN_*` for your wiring; `RELAY_ACTIVE_HIGH` for your relay board.
- `IGNORE_SENSORS 1` lets it run as "ready" before the mains/water sensors are
  wired — set to `0` once they are.

## Behaviour

| Topic | Direction | Payload |
| --- | --- | --- |
| `wash/{BAY_ID}/cmd` | API → device | `{cmdId,type,expiresAt,durationSec,sessionId}` |
| `wash/{BAY_ID}/token` | API → device (retained) | `{token,url,expiresAt}` for the QR |
| `wash/{BAY_ID}/status` | device → API | heartbeat + state snapshot |

- Commands are de-duplicated by `cmdId` and ignored once past `expiresAt`
  (needs NTP; the device syncs time on boot).
- Remaining time is saved to flash every few seconds; after a reboot mid-session
  the motor stays **off** and the screen shows "tap resume" until a `resume`
  command arrives (motor never auto-restarts after a power cut).
- A heartbeat is published every `HEARTBEAT_MS`; the API marks the bay offline if
  it stops.

## Display

Serial logs always print the current screen (and the QR as ASCII). For a real
TFT, set `-DUSE_TFT=1` in `platformio.ini`, add `TFT_eSPI` to `lib_deps`,
configure its `User_Setup.h`, and flesh out the `#if USE_TFT` drawing in
`renderScreen()`.
