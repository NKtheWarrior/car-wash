// Canonical tunable settings (PRD §Configuration). Stored per-station in the
// Setting table as strings; parsed at read time. Defaults seeded on first run
// and editable from the owner app / admin.

export const SETTING_KEYS = {
  pauseLimitSec: "pause_limit_sec",
  qrRotationSec: "qr_rotation_sec",
  checkoutMatchWindowSec: "checkout_match_window_sec",
  paymentPendingTimeoutSec: "payment_pending_timeout_sec",
  bayHeartbeatSec: "bay_heartbeat_sec",
  bayOfflineThresholdSec: "bay_offline_threshold_sec",
  listenerHeartbeatSec: "listener_heartbeat_sec",
  listenerOfflineThresholdSec: "listener_offline_threshold_sec",
  receivingUpiPackage: "receiving_upi_package",
  lowWaterThreshold: "low_water_threshold",
  motorCurrentThreshold: "motor_current_threshold",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

// Starting suggestions from the PRD. Values are strings (as stored).
export const DEFAULT_SETTINGS: Record<string, string> = {
  [SETTING_KEYS.pauseLimitSec]: "180",
  [SETTING_KEYS.qrRotationSec]: "60",
  [SETTING_KEYS.checkoutMatchWindowSec]: "300",
  [SETTING_KEYS.paymentPendingTimeoutSec]: "180",
  [SETTING_KEYS.bayHeartbeatSec]: "10",
  [SETTING_KEYS.bayOfflineThresholdSec]: "30",
  [SETTING_KEYS.listenerHeartbeatSec]: "30",
  [SETTING_KEYS.listenerOfflineThresholdSec]: "120",
  [SETTING_KEYS.receivingUpiPackage]: "com.fampay.in",
  // Set after hardware calibration; empty means "no threshold yet".
  [SETTING_KEYS.lowWaterThreshold]: "",
  [SETTING_KEYS.motorCurrentThreshold]: "",
};
