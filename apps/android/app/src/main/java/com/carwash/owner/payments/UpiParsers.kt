package com.carwash.owner.payments

/**
 * One credit seen in a UPI app notification on the owner's phone.
 * Money is always integer paise (₹1.00 = 100) to avoid floating-point errors.
 */
data class PaymentObservation(
    val sourcePackage: String,
    val amountPaise: Long,
    val senderName: String?,
    val upiReference: String?,   // FamPay notifications don't include one
    val postedAtMillis: Long,
    val dedupeKey: String,       // same notification re-posted → same key
    val rawTitle: String,
    val rawText: String,
)

/** One implementation per supported UPI app. The owner picks which one is active. */
interface UpiNotificationParser {
    val packageName: String
    val displayName: String

    /**
     * Returns an observation only for an incoming credit.
     * Returns null for anything else (debits, offers, reminders, unknown formats).
     */
    fun parse(
        title: String?,
        text: String?,
        postedAtMillis: Long,
        notificationKey: String,
        notificationWhenMillis: Long,
    ): PaymentObservation?
}

/** Shared helpers for all parsers. */
internal object Money {
    /** "1,250.5" → 125050. Rejects more than 2 decimals, zero and negatives. */
    fun toPaise(raw: String): Long? {
        val clean = raw.replace(",", "").trim()
        if (!Regex("""\d+(\.\d{1,2})?""").matches(clean)) return null
        val parts = clean.split(".")
        val rupees = parts[0].toLongOrNull() ?: return null
        val paise = if (parts.size == 2) parts[1].padEnd(2, '0').toLong() else 0L
        val total = rupees * 100 + paise
        return if (total > 0) total else null
    }
}

/**
 * FamPay / FamApp by Trio (package com.fampay.in).
 *
 * Observed format (Oct 2026):
 *   title: "You got #fampaid"
 *   text:  "NANDAKISHOR SUNIL UBALE sent ₹1.0"
 *
 * Note: the amount is printed like a decimal number ("₹1.0", "₹50.3"),
 * so ₹50.30 may appear as "₹50.3". Money.toPaise handles that.
 */
object FamPayParser : UpiNotificationParser {
    override val packageName = "com.fampay.in"
    override val displayName = "FamPay (FamApp)"

    private val CREDIT_TITLE = Regex("""^\s*you\s+got\s+#?fampaid\b.*$""", RegexOption.IGNORE_CASE)

    private val CREDIT_TEXT = Regex(
        """^\s*(.+?)\s+sent\s+(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*\.?\s*$""",
        RegexOption.IGNORE_CASE,
    )

    override fun parse(
        title: String?,
        text: String?,
        postedAtMillis: Long,
        notificationKey: String,
        notificationWhenMillis: Long,
    ): PaymentObservation? {
        val t = title?.trim().orEmpty()
        val body = text?.trim().orEmpty()

        if (!CREDIT_TITLE.matches(t)) return null
        val match = CREDIT_TEXT.matchEntire(body) ?: return null

        val sender = match.groupValues[1].trim().ifEmpty { null }
        val paise = Money.toPaise(match.groupValues[2]) ?: return null

        return PaymentObservation(
            sourcePackage = packageName,
            amountPaise = paise,
            senderName = sender,
            upiReference = null,
            postedAtMillis = postedAtMillis,
            dedupeKey = "$packageName|$notificationKey|$notificationWhenMillis|$paise",
            rawTitle = t,
            rawText = body,
        )
    }
}

/** All parsers the app knows about. Add a new app = add its parser here. */
object SupportedUpiApps {
    val all: List<UpiNotificationParser> = listOf(FamPayParser)

    fun forPackage(pkg: String): UpiNotificationParser? = all.firstOrNull { it.packageName == pkg }
}
