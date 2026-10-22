package com.carwash.owner

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager

class CarWashApp : Application() {
    override fun onCreate() {
        super.onCreate()
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Payment listener",
            NotificationManager.IMPORTANCE_LOW,
        ).apply { description = "Keeps the UPI payment listener running" }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    companion object {
        const val CHANNEL_ID = "carwash_listener"
    }
}
