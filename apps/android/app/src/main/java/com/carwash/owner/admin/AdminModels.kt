package com.carwash.owner.admin

import kotlinx.serialization.Serializable

/** DTOs mirroring the web admin JSON (apps/api/src/routes/admin.ts). Numbers are
 *  Long for integer paise/counts; motorRuntimeHours can be fractional (Double). */

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class LoginResponse(val token: String)

@Serializable
data class BaySession(val id: String, val planName: String, val state: String, val remainingSec: Long)

@Serializable
data class BayLive(
    val id: String,
    val name: String,
    val status: String,
    val online: Boolean,
    val scanUrl: String? = null,
    val mains: Boolean? = null,
    val session: BaySession? = null,
)

@Serializable
data class Payment(
    val id: String,
    val amountPaise: Long,
    val upiRef: String,
    val state: String,
    val createdAt: String,
    val checkoutId: String? = null,
)

@Serializable
data class NamedRef(val name: String)

@Serializable
data class Checkout(val id: String, val amountPaise: Long, val plan: NamedRef, val bay: NamedRef)

@Serializable
data class Issue(
    val id: String,
    val kind: String,
    val description: String,
    val contact: String? = null,
    val status: String,
    val createdAt: String,
)

@Serializable
data class Plan(
    val id: String,
    val name: String,
    val vehicleType: String,
    val durationSec: Long,
    val pricePaise: Long,
    val active: Boolean,
)

@Serializable
data class SettingsResponse(val values: Map<String, String> = emptyMap())

@Serializable
data class Station(val id: String, val name: String, val ownerVpa: String, val payeeName: String)

@Serializable
data class Device(
    val id: String,
    val name: String,
    val role: String,
    val revoked: Boolean,
    val lastHeartbeatAt: String? = null,
)

@Serializable
data class AdminPairing(val deviceId: String, val signingKey: String, val apiUrl: String)

@Serializable
data class PairingResponse(val pairing: AdminPairing)

@Serializable
data class Earnings(val today: Long, val week: Long, val month: Long)

@Serializable
data class EarnByPlan(val name: String, val paise: Long, val count: Long)

@Serializable
data class PopularPlan(val name: String, val count: Long)

@Serializable
data class Usage(
    val sessionCount: Long,
    val avgDurationSec: Long,
    val peakHours: List<Long> = emptyList(),
    val popularPlan: PopularPlan? = null,
)

@Serializable
data class Health(val baysOnline: Long, val baysTotal: Long, val motorRuntimeHours: Double, val outages24h: Long)

@Serializable
data class Stats(
    val earnings: Earnings,
    val earningsByPlan: List<EarnByPlan> = emptyList(),
    val usage: Usage,
    val health: Health,
)

/** Non-2xx responses surface as this so screens can show the API's error + detect 401. */
class AdminApiException(val code: Int, message: String) : Exception(message)
