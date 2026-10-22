package com.carwash.owner.service

import android.app.Notification
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.carwash.owner.CarWashApp
import com.carwash.owner.data.SecureStore
import com.carwash.owner.delivery.Delivery
import com.carwash.owner.net.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Keeps the listener alive and sends a heartbeat on an interval so the server
 * knows payments are being watched (PRD §Payments "always on", edge case 18).
 */
class ListenerForegroundService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIF_ID, buildNotification())
        startHeartbeatLoop()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    private fun buildNotification(): Notification =
        NotificationCompat.Builder(this, CarWashApp.CHANNEL_ID)
            .setContentTitle("Car Wash listener active")
            .setContentText("Watching for UPI payments")
            .setSmallIcon(android.R.drawable.ic_popup_sync)
            .setOngoing(true)
            .build()

    private fun startHeartbeatLoop() {
        scope.launch {
            while (isActive) {
                val store = SecureStore(applicationContext)
                store.pairing?.let { pairing ->
                    if (ApiClient(pairing).postHeartbeat()) {
                        store.lastHeartbeatAt = System.currentTimeMillis()
                    }
                }
                // Also nudge the delivery queue in case a send was pending.
                Delivery.schedule(applicationContext)
                delay(HEARTBEAT_INTERVAL_MS)
            }
        }
    }

    companion object {
        private const val NOTIF_ID = 1001
        private const val HEARTBEAT_INTERVAL_MS = 30_000L

        fun start(context: Context) {
            val intent = Intent(context, ListenerForegroundService::class.java)
            context.startForegroundService(intent)
        }
    }
}
