package com.carwash.owner.ui

import android.content.pm.PackageManager
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.core.graphics.drawable.toBitmap

/**
 * A UPI app we can show on the "choose payment app" screen. Only [supported]
 * apps are selectable; everything else is blacked-out ("coming soon") because
 * we currently only parse FamPay-style credit notifications.
 */
data class PaymentApp(
    val pkg: String,
    val name: String,
    val supported: Boolean,
)

const val FAMPAY_PACKAGE = "com.fampay.in"

/** Catalog of UPI apps we probe for (must be mirrored in AndroidManifest <queries>). */
val KNOWN_PAYMENT_APPS: List<PaymentApp> = listOf(
    PaymentApp(FAMPAY_PACKAGE, "FamPay", supported = true),
    PaymentApp("com.google.android.apps.nbu.paisa.user", "Google Pay", supported = false),
    PaymentApp("com.phonepe.app", "PhonePe", supported = false),
    PaymentApp("net.one97.paytm", "Paytm", supported = false),
    PaymentApp("in.org.npci.upiapp", "BHIM", supported = false),
    PaymentApp("com.dreamplug.androidapp", "CRED", supported = false),
    PaymentApp("in.amazon.mShop.android.shopping", "Amazon Pay", supported = false),
)

fun isAppInstalled(pm: PackageManager, pkg: String): Boolean =
    runCatching { pm.getApplicationInfo(pkg, 0); true }.getOrDefault(false)

fun loadAppIcon(pm: PackageManager, pkg: String): ImageBitmap? =
    runCatching { pm.getApplicationIcon(pkg).toBitmap(width = 96, height = 96).asImageBitmap() }.getOrNull()

/** Apps to show: every installed known app, plus FamPay always (so the owner can
 *  still select it and be told to install it). */
fun discoverPaymentApps(pm: PackageManager): List<PaymentApp> =
    KNOWN_PAYMENT_APPS.filter { it.pkg == FAMPAY_PACKAGE || isAppInstalled(pm, it.pkg) }
