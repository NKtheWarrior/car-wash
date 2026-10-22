package com.carwash.owner.admin

/** "₹12.50" from paise, mirroring the web lib/format.ts. */
fun formatPaise(paise: Long): String {
    val rupees = paise / 100
    val rem = (paise % 100).coerceAtLeast(0)
    return "₹$rupees.${rem.toString().padStart(2, '0')}"
}

/** Seconds → "mm:ss" (or "h:mm:ss" past an hour). */
fun formatClock(totalSec: Long): String {
    val s = totalSec.coerceAtLeast(0)
    val h = s / 3600
    val m = (s % 3600) / 60
    val sec = s % 60
    val mm = m.toString().padStart(2, '0')
    val ss = sec.toString().padStart(2, '0')
    return if (h > 0) "$h:$mm:$ss" else "$mm:$ss"
}
