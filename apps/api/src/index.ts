import { createApp } from "./app.js";
import { env } from "./env.js";
import { refreshSettings, startSettingsRefresh } from "./lib/settings.js";
import { startSseHeartbeat } from "./lib/sse.js";
import { initMqtt } from "./mqtt/client.js";
import { startOfflineWatchdog } from "./services/bay.js";
import { startCheckoutExpiry } from "./services/checkout.js";
import { recoverSessions } from "./services/session.js";
import { startTokenRotation } from "./services/token.js";

async function main() {
  await refreshSettings();
  initMqtt();
  await recoverSessions();

  // Background loops.
  startSettingsRefresh();
  startTokenRotation();
  startOfflineWatchdog();
  startCheckoutExpiry();
  startSseHeartbeat();

  const app = createApp();
  app.listen(env.API_PORT, () => {
    console.log(`🚿 Car wash API listening on http://localhost:${env.API_PORT}`);
  });
}

main().catch((e) => {
  console.error("Fatal startup error:", e);
  process.exit(1);
});
