package com.carwash.owner.service

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.carwash.owner.data.SecureStore
import com.carwash.owner.delivery.Delivery
import com.carwash.owner.model.Observation
import com.carwash.owner.payments.PaymentObservation
import com.carwash.owner.payments.SupportedUpiApps
import java.time.Instant

/**
 * Reads notifications ONLY from the owner-selected UPI app and runs that app's
 * dedicated parser (see [SupportedUpiApps]). Credits become an [Observation] and
 * are handed to [Delivery]. The owner's phone is trusted, so there is no
 * certificate check (PRD edge case 20).
 */
class PaymentNotificationListener : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val store = SecureStore(applicationContext)
        if (!store.listenerEnabled) return

        // Only the selected app has an active parser; ignore everything else.
        val parser = SupportedUpiApps.forPackage(store.selectedPackage) ?: return
        if (sbn.packageName != parser.packageName) return

        val extras = sbn.notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
            ?: extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()

        val observation = parser.parse(
            title = title,
            text = text,
            postedAtMillis = sbn.postTime,
            notificationKey = sbn.key,
            notificationWhenMillis = sbn.notification.`when`,
        ) ?: return // not an incoming credit (debit, offer, unknown format, …)

        Delivery.record(applicationContext, observation.toApiObservation())
    }

    override fun onListenerConnected() {
        // Ensure the keep-alive service is running whenever access is granted.
        ListenerForegroundService.start(applicationContext)
    }
}

/** Maps a parsed credit to the signed body the API expects (observationSchema).
 *  `dedupeKey` doubles as the unique `upiRef` since FamPay has no reference. */
private fun PaymentObservation.toApiObservation(): Observation = Observation(
    amountPaise = amountPaise,
    upiRef = upiReference ?: dedupeKey,
    senderVpa = senderName,
    observedAt = Instant.ofEpochMilli(postedAtMillis).toString(),
    rawText = listOf(rawTitle, rawText).filter { it.isNotBlank() }.joinToString(" — ").ifBlank { null },
    packageName = sourcePackage,
)
