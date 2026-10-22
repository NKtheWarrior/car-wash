package com.carwash.owner.delivery

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.carwash.owner.data.SecureStore
import com.carwash.owner.model.Observation
import com.carwash.owner.work.DeliveryWorker
import java.util.concurrent.TimeUnit

/** Persist an observation and kick the delivery worker. Sending always goes
 *  through the queue so a weak network never loses a payment (PRD §Payments). */
object Delivery {
    fun record(context: Context, obs: Observation) {
        val store = SecureStore(context)
        store.enqueue(obs)
        store.lastPaymentText = "₹%.2f · %s".format(obs.amountPaise / 100.0, obs.senderVpa ?: obs.upiRef)
        schedule(context)
    }

    fun schedule(context: Context) {
        val request = OneTimeWorkRequestBuilder<DeliveryWorker>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
            .build()
        WorkManager.getInstance(context)
            .enqueueUniqueWork("payment-delivery", ExistingWorkPolicy.REPLACE, request)
    }
}
