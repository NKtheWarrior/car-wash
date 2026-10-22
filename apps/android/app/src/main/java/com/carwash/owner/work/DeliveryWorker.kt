package com.carwash.owner.work

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.carwash.owner.data.SecureStore
import com.carwash.owner.net.ApiClient

/** Drains the offline queue of payment observations, retrying failures with the
 *  backoff configured by [com.carwash.owner.delivery.Delivery]. */
class DeliveryWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val store = SecureStore(applicationContext)
        val pairing = store.pairing ?: return Result.success() // not paired yet
        val api = ApiClient(pairing)

        val pending = store.queue()
        if (pending.isEmpty()) return Result.success()

        val stillPending = pending.filterNot { api.postObservation(it) }
        store.saveQueue(stillPending)

        return if (stillPending.isEmpty()) Result.success() else Result.retry()
    }
}
