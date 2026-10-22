#pragma once

// ---- Identity ---------------------------------------------------------------
// Each bay flashes the same firmware with its own BAY_ID and MQTT credentials.
#define BAY_ID "demo-bay"

// ---- WiFi -------------------------------------------------------------------
#define WIFI_SSID "your-wifi"
#define WIFI_PASSWORD "your-wifi-password"

// ---- MQTT -------------------------------------------------------------------
#define MQTT_HOST "192.168.1.100" // IP of the host running Mosquitto
#define MQTT_PORT 1883
#define MQTT_USER "bay-demo"        // per-bay username (seeded on the Bay row)
#define MQTT_PASS "bay-demo-secret" // per-bay password

// ---- Pins -------------------------------------------------------------------
#define PIN_RELAY 26       // pump motor relay (active HIGH)
#define PIN_BUZZER 27      // buzzer for "power returned" alert
#define PIN_MAINS_SENSE 34 // HIGH when mains present (input only)
#define PIN_WATER_SENSE 35 // HIGH when water available

// ---- Timing -----------------------------------------------------------------
#define HEARTBEAT_MS 10000   // status heartbeat interval
#define RELAY_ACTIVE_HIGH 1  // set 0 if your relay board is active-LOW

// During the demo (no sensors wired) treat mains + water as always available.
// Set to 0 once the mains/water sensors are connected.
#define IGNORE_SENSORS 1

// ---- Derived topics ---------------------------------------------------------
#define TOPIC_CMD "wash/" BAY_ID "/cmd"
#define TOPIC_STATUS "wash/" BAY_ID "/status"
#define TOPIC_TOKEN "wash/" BAY_ID "/token"
