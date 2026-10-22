package com.carwash.owner.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.carwash.owner.data.SecureStore

/** Restarts the keep-alive service after a reboot so the listener survives
 *  power cycles (PRD §Payments "always on"). */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val store = SecureStore(context)
        if (store.isPaired && store.listenerEnabled) {
            ListenerForegroundService.start(context)
        }
    }
}
