package com.carwash.owner.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.carwash.owner.model.AppJson
import com.carwash.owner.model.Observation
import com.carwash.owner.model.Pairing
import kotlinx.serialization.builtins.ListSerializer

/** Encrypted storage for the pairing (device id + signing key), the selected
 *  UPI app package, and the offline delivery queue. */
class SecureStore(context: Context) {

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "carwash_secure",
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    var pairing: Pairing?
        get() {
            val raw = prefs.getString(KEY_PAIRING, null) ?: return null
            return runCatching { AppJson.decodeFromString(Pairing.serializer(), raw) }.getOrNull()
        }
        set(value) {
            prefs.edit().apply {
                if (value == null) remove(KEY_PAIRING)
                else putString(KEY_PAIRING, AppJson.encodeToString(Pairing.serializer(), value))
            }.apply()
        }

    val isPaired: Boolean get() = pairing != null

    /** Package name of the UPI app whose notifications we read (e.g. com.fampay.in). */
    var selectedPackage: String
        get() = prefs.getString(KEY_PACKAGE, DEFAULT_PACKAGE) ?: DEFAULT_PACKAGE
        set(value) = prefs.edit().putString(KEY_PACKAGE, value).apply()

    var listenerEnabled: Boolean
        get() = prefs.getBoolean(KEY_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_ENABLED, value).apply()

    /** True once the owner has picked a UPI app in onboarding. */
    var appChosen: Boolean
        get() = prefs.getBoolean(KEY_APP_CHOSEN, false)
        set(value) = prefs.edit().putBoolean(KEY_APP_CHOSEN, value).apply()

    /** Owner JWT for the admin dashboard API (from POST /auth/login). */
    var adminToken: String?
        get() = prefs.getString(KEY_ADMIN_TOKEN, null)
        set(value) = prefs.edit().apply {
            if (value == null) remove(KEY_ADMIN_TOKEN) else putString(KEY_ADMIN_TOKEN, value)
        }.apply()

    /** Base URL of the API the dashboard talks to (e.g. http://192.168.1.5:4000). */
    var adminApiUrl: String?
        get() = prefs.getString(KEY_ADMIN_URL, null)
        set(value) = prefs.edit().apply {
            if (value == null) remove(KEY_ADMIN_URL) else putString(KEY_ADMIN_URL, value)
        }.apply()

    val isLoggedIn: Boolean get() = !adminToken.isNullOrBlank() && !adminApiUrl.isNullOrBlank()

    var lastPaymentText: String?
        get() = prefs.getString(KEY_LAST_PAYMENT, null)
        set(value) = prefs.edit().putString(KEY_LAST_PAYMENT, value).apply()

    var lastHeartbeatAt: Long
        get() = prefs.getLong(KEY_LAST_HEARTBEAT, 0)
        set(value) = prefs.edit().putLong(KEY_LAST_HEARTBEAT, value).apply()

    // ---- Offline queue -------------------------------------------------------

    private val listSerializer = ListSerializer(Observation.serializer())

    @Synchronized
    fun queue(): MutableList<Observation> {
        val raw = prefs.getString(KEY_QUEUE, null) ?: return mutableListOf()
        return runCatching { AppJson.decodeFromString(listSerializer, raw).toMutableList() }
            .getOrDefault(mutableListOf())
    }

    @Synchronized
    fun enqueue(obs: Observation) {
        val q = queue().apply { add(obs) }
        saveQueue(q)
    }

    @Synchronized
    fun saveQueue(q: List<Observation>) {
        prefs.edit().putString(KEY_QUEUE, AppJson.encodeToString(listSerializer, q)).apply()
    }

    companion object {
        private const val KEY_PAIRING = "pairing"
        private const val KEY_PACKAGE = "selected_package"
        private const val KEY_ENABLED = "listener_enabled"
        private const val KEY_APP_CHOSEN = "app_chosen"
        private const val KEY_ADMIN_TOKEN = "admin_token"
        private const val KEY_ADMIN_URL = "admin_url"
        private const val KEY_LAST_PAYMENT = "last_payment"
        private const val KEY_LAST_HEARTBEAT = "last_heartbeat"
        private const val KEY_QUEUE = "obs_queue"
        const val DEFAULT_PACKAGE = "com.fampay.in"
    }
}
