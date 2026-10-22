package com.carwash.owner.payments

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

/** Mirrors the acceptance cases for the FamPay credit-notification parser. */
class FamPayParserTest {

    private fun p(title: String?, text: String?) =
        FamPayParser.parse(title, text, 1_000L, "0|com.fampay.in|42|null|10123", 999L)

    @Test fun realNotificationIsParsed() {
        val real = p("You got #fampaid", "NANDAKISHOR SUNIL UBALE sent ₹1.0")
        assertEquals(100L, real?.amountPaise)
        assertEquals("NANDAKISHOR SUNIL UBALE", real?.senderName)
    }

    @Test fun uniquePaiseAmounts() {
        assertEquals(5003L, p("You got #fampaid", "A B sent ₹50.03")?.amountPaise)
        assertEquals(5030L, p("You got #fampaid", "A B sent ₹50.3")?.amountPaise)
        assertEquals(125000L, p("You got #fampaid", "A B sent ₹1,250")?.amountPaise)
        assertEquals(2005L, p("You got #fampaid", "A B sent Rs. 20.05")?.amountPaise)
        assertEquals(2005L, p("  You got #fampaid ", "  A B  sent ₹ 20.05. ")?.amountPaise)
    }

    @Test fun rejectsNonCredits() {
        assertNull(p("Payment successful", "You sent ₹50.03 to A B"))
        assertNull(p("You got #fampaid", "You paid ₹50.03 to A B"))
        assertNull(p("You got #fampaid", "A B sent ₹50.033"))
        assertNull(p("You got #fampaid", "A B sent ₹0.0"))
        assertNull(p("You got #fampaid", null))
        assertNull(p("You got #fampaid", "Get ₹50 cashback on your next payment"))
    }

    @Test fun dedupeKeyIsStable() {
        val a = p("You got #fampaid", "A B sent ₹50.03")
        val b = p("You got #fampaid", "A B sent ₹50.03")
        assertTrue(a != null && a.dedupeKey == b?.dedupeKey)
    }

    @Test fun registryLookup() {
        assertSame(FamPayParser, SupportedUpiApps.forPackage("com.fampay.in"))
        assertNull(SupportedUpiApps.forPackage("com.fake.pay"))
    }
}
