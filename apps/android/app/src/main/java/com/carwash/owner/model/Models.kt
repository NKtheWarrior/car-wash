package com.carwash.owner.model

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/** Shared JSON config. explicitNulls=false so optional fields are omitted (the
 *  API's zod schema treats them as optional, not nullable). */
val AppJson = Json {
    explicitNulls = false
    encodeDefaults = false
    ignoreUnknownKeys = true
}

/** The signed body posted to POST /observations. Mirrors the API's
 *  observationSchema exactly. */
@Serializable
data class Observation(
    val amountPaise: Long,
    val upiRef: String,
    val senderVpa: String? = null,
    val observedAt: String,
    val rawText: String? = null,
    val packageName: String,
)

/** Pairing payload scanned from the admin QR. */
@Serializable
data class Pairing(
    val deviceId: String,
    val signingKey: String,
    val apiUrl: String,
)
