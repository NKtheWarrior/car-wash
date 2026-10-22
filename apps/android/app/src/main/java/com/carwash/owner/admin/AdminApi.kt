package com.carwash.owner.admin

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

private val JSON_MEDIA = "application/json".toMediaType()
private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }
private val http = OkHttpClient.Builder().callTimeout(20, TimeUnit.SECONDS).build()

/** Reads the API's `{ "error": "..." }` body, falling back to the status line. */
private fun errorMessage(code: Int, body: String): String =
    runCatching { json.parseToJsonElement(body).jsonObject["error"]?.jsonPrimitive?.content }.getOrNull()
        ?: "HTTP $code"

/**
 * Thin JWT-authed client for the admin dashboard API — the native twin of
 * the web's lib/admin.ts. Each call runs on IO and throws [AdminApiException]
 * (code 401 ⇒ token invalid) on non-2xx.
 */
class AdminApi(baseUrl: String, private val token: String) {

    private val base = baseUrl.trimEnd('/')

    private suspend fun request(method: String, path: String, body: String?): String =
        withContext(Dispatchers.IO) {
            val builder = Request.Builder()
                .url(base + path)
                .addHeader("Authorization", "Bearer $token")
            when (method) {
                "POST" -> builder.post((body ?: "{}").toRequestBody(JSON_MEDIA))
                "PUT" -> builder.put((body ?: "{}").toRequestBody(JSON_MEDIA))
                else -> builder.get()
            }
            http.newCall(builder.build()).execute().use { resp ->
                val text = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw AdminApiException(resp.code, errorMessage(resp.code, text))
                text
            }
        }

    // ---- Reads ---------------------------------------------------------------
    suspend fun bays() = json.decodeFromString(ListSerializer(BayLive.serializer()), request("GET", "/admin/bays", null))
    suspend fun payments() = json.decodeFromString(ListSerializer(Payment.serializer()), request("GET", "/admin/payments", null))
    suspend fun checkouts() = json.decodeFromString(ListSerializer(Checkout.serializer()), request("GET", "/admin/checkouts", null))
    suspend fun issues() = json.decodeFromString(ListSerializer(Issue.serializer()), request("GET", "/admin/issues", null))
    suspend fun plans() = json.decodeFromString(ListSerializer(Plan.serializer()), request("GET", "/admin/plans", null))
    suspend fun devices() = json.decodeFromString(ListSerializer(Device.serializer()), request("GET", "/admin/devices", null))
    suspend fun settings() = json.decodeFromString(SettingsResponse.serializer(), request("GET", "/admin/settings", null))
    suspend fun station() = json.decodeFromString(Station.serializer(), request("GET", "/admin/station", null))
    suspend fun stats() = json.decodeFromString(Stats.serializer(), request("GET", "/admin/stats", null))

    // ---- Actions -------------------------------------------------------------
    suspend fun stopBay(id: String) { request("POST", "/admin/bays/$id/stop", null) }
    suspend fun confirmPayment(id: String, checkoutId: String) {
        request("POST", "/admin/payments/$id/confirm", """{"checkoutId":${quote(checkoutId)}}""")
    }
    suspend fun rejectPayment(id: String) { request("POST", "/admin/payments/$id/reject", null) }
    suspend fun resolveIssue(id: String) { request("POST", "/admin/issues/$id/resolve", null) }
    suspend fun setPlanPrice(id: String, pricePaise: Long) { request("PUT", "/admin/plans/$id", """{"pricePaise":$pricePaise}""") }
    suspend fun setPlanActive(id: String, active: Boolean) { request("PUT", "/admin/plans/$id", """{"active":$active}""") }
    suspend fun setSetting(key: String, value: String) {
        request("PUT", "/admin/settings", """{"key":${quote(key)},"value":${quote(value)}}""")
    }
    suspend fun setStation(ownerVpa: String, payeeName: String): Station = json.decodeFromString(
        Station.serializer(),
        request("PUT", "/admin/station", """{"ownerVpa":${quote(ownerVpa)},"payeeName":${quote(payeeName)}}"""),
    )
    suspend fun createPairing(name: String): AdminPairing = json.decodeFromString(
        PairingResponse.serializer(),
        request("POST", "/admin/pairing", """{"name":${quote(name)}}"""),
    ).pairing
    suspend fun revokeDevice(id: String) { request("POST", "/admin/devices/$id/revoke", null) }

    companion object {
        /** Logs in (no token needed) and returns the JWT. */
        suspend fun login(baseUrl: String, email: String, password: String): String = withContext(Dispatchers.IO) {
            val body = json.encodeToString(LoginRequest.serializer(), LoginRequest(email, password))
            val req = Request.Builder()
                .url(baseUrl.trimEnd('/') + "/auth/login")
                .post(body.toRequestBody(JSON_MEDIA))
                .build()
            http.newCall(req).execute().use { resp ->
                val text = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw AdminApiException(resp.code, errorMessage(resp.code, text))
                json.decodeFromString(LoginResponse.serializer(), text).token
            }
        }
    }
}

/** JSON-escapes a string (with surrounding quotes) for building tiny request bodies. */
private fun quote(s: String): String = json.encodeToString(String.serializer(), s)
