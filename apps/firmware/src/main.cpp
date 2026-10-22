// ESP32 bay controller.
//
// Responsibilities (PRD §Bay device behaviour):
//  - Connect to WiFi + MQTT using the bay's own credentials/topics.
//  - Drive the pump relay on start/stop/pause/resume commands from the API.
//  - Count the session down locally and persist remaining time to flash so a
//    reboot doesn't lose the session.
//  - After a power cut the motor NEVER restarts on its own — it waits for the
//    customer to tap resume (buzzer sounds when power returns).
//  - Publish a status heartbeat so the server knows the bay is online/ready.
//  - Show the rotating QR (received on the token topic) when ready.

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <qrcode.h>
#include <time.h>
#include "config.h"

#if USE_TFT
#include <TFT_eSPI.h>
static TFT_eSPI tft = TFT_eSPI();
#endif

enum State { READY, IN_USE, PAUSED, POWER_RETURNED, OUT_OF_SERVICE };

static WiFiClient net;
static PubSubClient mqtt(net);
static Preferences prefs;

static State state = OUT_OF_SERVICE;
static const char *oosReason = "offline";
static long remainingSec = 0;
static String sessionId = "";
static String lastCmdId = "";
static String currentUrl = "";
static bool motorOn = false;
static bool mainsPrev = true;

static unsigned long lastHeartbeat = 0;
static unsigned long lastTick = 0;

// ---- Helpers ----------------------------------------------------------------

static bool mainsOk() {
  return IGNORE_SENSORS ? true : digitalRead(PIN_MAINS_SENSE) == HIGH;
}
static bool waterOk() {
  return IGNORE_SENSORS ? true : digitalRead(PIN_WATER_SENSE) == HIGH;
}

static long long nowMs() {
  time_t t = time(nullptr);
  return (t > 1600000000) ? (long long)t * 1000LL : 0; // 0 => clock not synced
}

static const char *screenName(State s) {
  switch (s) {
    case READY: return "ready";
    case IN_USE: return "in_use";
    case PAUSED: return "paused";
    case POWER_RETURNED: return "power_returned";
    default: return "out_of_service";
  }
}

static void setMotor(bool on) {
  motorOn = on;
  bool level = RELAY_ACTIVE_HIGH ? on : !on;
  digitalWrite(PIN_RELAY, level ? HIGH : LOW);
}

static void persist() {
  prefs.putInt("state", (int)state);
  prefs.putLong("remaining", remainingSec);
  prefs.putString("session", sessionId);
}

static void renderScreen();

static void setState(State s, const char *reason = nullptr) {
  state = s;
  if (reason) oosReason = reason;
  persist();
  renderScreen();
}

// ---- Rendering --------------------------------------------------------------

static void printQrSerial(const String &text) {
  QRCode qrcode;
  uint8_t buf[qrcode_getBufferSize(3)];
  qrcode_initText(&qrcode, buf, 3, ECC_LOW, text.c_str());
  for (uint8_t y = 0; y < qrcode.size; y++) {
    String line;
    for (uint8_t x = 0; x < qrcode.size; x++) line += qrcode_getModule(&qrcode, x, y) ? "##" : "  ";
    Serial.println(line);
  }
}

static void renderScreen() {
  Serial.printf("\n[SCREEN] %s\n", screenName(state));
  switch (state) {
    case READY:
      Serial.println("Ready — scan to wash");
      if (currentUrl.length()) printQrSerial(currentUrl);
      break;
    case IN_USE:
      Serial.printf("In use — %lds left\n", remainingSec);
      break;
    case PAUSED:
      Serial.printf("Paused — %lds left\n", remainingSec);
      break;
    case POWER_RETURNED:
      Serial.println("Power returned — tap RESUME on your phone");
      break;
    case OUT_OF_SERVICE:
      Serial.printf("Out of service — %s\n", oosReason);
      break;
  }
#if USE_TFT
  tft.fillScreen(TFT_BLACK);
  tft.setCursor(0, 0);
  tft.setTextColor(TFT_WHITE);
  tft.println(screenName(state));
  // A real build would draw the QR modules / countdown here.
#endif
}

// ---- Status -----------------------------------------------------------------

static void publishStatus(const char *ackCmdId = nullptr) {
  JsonDocument doc;
  doc["bayId"] = BAY_ID;
  doc["screen"] = screenName(state);
  doc["motorOn"] = motorOn;
  doc["mains"] = mainsOk();
  doc["wifiRssi"] = WiFi.RSSI();
  if (state == IN_USE || state == PAUSED) doc["remainingSec"] = remainingSec;
  if (state == OUT_OF_SERVICE) doc["outOfServiceReason"] = oosReason;
  if (ackCmdId) doc["ackCmdId"] = ackCmdId;
  doc["ts"] = nowMs();

  char payload[256];
  size_t n = serializeJson(doc, payload);
  mqtt.publish(TOPIC_STATUS, (const uint8_t *)payload, n, false);
}

// ---- Commands ---------------------------------------------------------------

static void handleCommand(JsonDocument &doc) {
  const char *cmdId = doc["cmdId"] | "";
  if (strlen(cmdId) == 0 || lastCmdId == cmdId) return; // dedupe repeats
  // Ignore stale commands when the clock is synced (replay/expiry protection).
  long long expiresAt = doc["expiresAt"] | 0;
  long long t = nowMs();
  if (t > 0 && expiresAt > 0 && expiresAt < t) return;
  lastCmdId = cmdId;

  const char *type = doc["type"] | "";
  long durationSec = doc["durationSec"] | 0;
  const char *sid = doc["sessionId"] | "";

  if (strcmp(type, "start") == 0) {
    sessionId = sid;
    remainingSec = durationSec;
    setMotor(true);
    setState(IN_USE);
  } else if (strcmp(type, "resume") == 0) {
    if (durationSec > 0) remainingSec = durationSec;
    setMotor(true);
    setState(IN_USE);
  } else if (strcmp(type, "pause") == 0) {
    setMotor(false);
    setState(PAUSED);
  } else if (strcmp(type, "stop") == 0) {
    setMotor(false);
    remainingSec = 0;
    sessionId = "";
    setState(READY);
  }
  publishStatus(cmdId);
}

static void onMessage(char *topic, uint8_t *payload, unsigned int len) {
  JsonDocument doc;
  if (deserializeJson(doc, payload, len)) return;

  if (strcmp(topic, TOPIC_TOKEN) == 0) {
    currentUrl = String((const char *)(doc["url"] | ""));
    if (state == READY) renderScreen();
  } else if (strcmp(topic, TOPIC_CMD) == 0) {
    handleCommand(doc);
  }
}

// ---- Connectivity -----------------------------------------------------------

static void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("WiFi connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.printf("\nWiFi OK: %s\n", WiFi.localIP().toString().c_str());
}

static void connectMqtt() {
  while (!mqtt.connected()) {
    String clientId = String("bay-") + BAY_ID;
    if (mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)) {
      mqtt.subscribe(TOPIC_CMD, 1);
      mqtt.subscribe(TOPIC_TOKEN, 1);
      Serial.println("MQTT connected");
      publishStatus();
    } else {
      Serial.printf("MQTT failed rc=%d, retrying\n", mqtt.state());
      delay(2000);
    }
  }
}

// ---- Setup / loop -----------------------------------------------------------

void setup() {
  Serial.begin(115200);
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_MAINS_SENSE, INPUT);
  pinMode(PIN_WATER_SENSE, INPUT);
  setMotor(false);

#if USE_TFT
  tft.init();
  tft.setRotation(1);
#endif

  prefs.begin("carwash", false);
  state = (State)prefs.getInt("state", (int)OUT_OF_SERVICE);
  remainingSec = prefs.getLong("remaining", 0);
  sessionId = prefs.getString("session", "");

  // Reboot recovery: if we were mid-session, do NOT auto-start the motor. Wait
  // for the customer to resume (PRD edge cases 13/14).
  if (state == IN_USE || state == PAUSED) {
    setMotor(false);
    state = POWER_RETURNED;
    tone(PIN_BUZZER, 2000, 500);
  } else {
    // Fresh boot: become ready if mains + water are available.
    if (mainsOk() && waterOk()) state = READY;
    else {
      state = OUT_OF_SERVICE;
      oosReason = !mainsOk() ? "no_mains" : "no_water";
    }
  }

  connectWifi();
  configTime(0, 0, "pool.ntp.org");
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMessage);
  mqtt.setBufferSize(512);
  connectMqtt();

  mainsPrev = digitalRead(PIN_MAINS_SENSE) == HIGH;
  renderScreen();
}

void loop() {
  connectWifi();
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  unsigned long now = millis();

  // 1 Hz session countdown.
  if (now - lastTick >= 1000) {
    lastTick = now;
    if (state == IN_USE && remainingSec > 0) {
      remainingSec--;
      if (remainingSec % 5 == 0) persist();
      if (remainingSec <= 0) {
        setMotor(false);
        sessionId = "";
        setState(READY);
        publishStatus();
      }
    }

    // Mains transition handling.
    bool mains = mainsOk();
    if (!mains && mainsPrev && (state == IN_USE || state == PAUSED)) {
      setMotor(false);
      setState(POWER_RETURNED); // motor off; await resume
    } else if (mains && !mainsPrev && state == POWER_RETURNED) {
      tone(PIN_BUZZER, 2000, 500); // power is back — prompt resume
      renderScreen();
    }
    mainsPrev = mains;

    // Water availability (only gates readiness, not an active wash).
    if (state == READY && !waterOk()) {
      setState(OUT_OF_SERVICE, "no_water");
    } else if (state == OUT_OF_SERVICE && strcmp(oosReason, "no_water") == 0 && waterOk()) {
      setState(READY);
    }
  }

  // Heartbeat.
  if (now - lastHeartbeat >= HEARTBEAT_MS) {
    lastHeartbeat = now;
    publishStatus();
  }
}
