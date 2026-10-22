package com.carwash.owner.net

import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/** HMAC-SHA256 of `${timestampMs}.${body}` as lowercase hex — the exact scheme
 *  the API verifies (see packages/shared/src/hmac.ts). */
object Hmac {
    fun sign(key: String, timestampMs: Long, body: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(key.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        val bytes = mac.doFinal("$timestampMs.$body".toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }
}
