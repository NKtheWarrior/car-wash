package com.carwash.owner.net

import com.carwash.owner.model.AppJson
import com.carwash.owner.model.Observation
import com.carwash.owner.model.Pairing
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

/** Posts signed observations + heartbeats to the API. Signing the exact body
 *  bytes we send keeps HMAC verification robust. */
class ApiClient(private val pairing: Pairing) {

    private val http = OkHttpClient.Builder()
        .callTimeout(20, TimeUnit.SECONDS)
        .build()

    private val jsonType = "application/json".toMediaType()

    /** @return true if the server accepted (2xx). Caller decides whether to retry. */
    fun postObservation(obs: Observation): Boolean {
        val body = AppJson.encodeToString(Observation.serializer(), obs)
        return signedPost("/observations", body)
    }

    fun postHeartbeat(): Boolean {
        val body = """{"ts":${System.currentTimeMillis()}}"""
        return signedPost("/listener/heartbeat", body)
    }

    private fun signedPost(path: String, body: String): Boolean {
        val ts = System.currentTimeMillis()
        val sig = Hmac.sign(pairing.signingKey, ts, body)
        val req = Request.Builder()
            .url(pairing.apiUrl.trimEnd('/') + path)
            .addHeader("X-Device-Id", pairing.deviceId)
            .addHeader("X-Timestamp", ts.toString())
            .addHeader("X-Signature", sig)
            .post(body.toRequestBody(jsonType))
            .build()
        return runCatching {
            http.newCall(req).execute().use { it.isSuccessful }
        }.getOrDefault(false)
    }
}
