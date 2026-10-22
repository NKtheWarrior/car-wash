package com.carwash.owner.ui

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.service.notification.NotificationListenerService
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.carwash.owner.service.PaymentNotificationListener

/** True when the user has granted notification-listener access to this app. */
fun hasNotificationAccess(context: Context): Boolean {
    val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners") ?: return false
    return flat.split(":").any { ComponentName.unflattenFromString(it)?.packageName == context.packageName }
}

/** POST_NOTIFICATIONS is runtime-granted on 33+, implicit below. */
fun hasPostNotifications(context: Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

fun isIgnoringBatteryOptimizations(context: Context): Boolean {
    val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    return pm.isIgnoringBatteryOptimizations(context.packageName)
}

/** The two permissions the listener genuinely needs to capture + report payments. */
fun hasRequiredPermissions(context: Context): Boolean =
    hasNotificationAccess(context) && hasPostNotifications(context)

/**
 * Ask the system to (re)bind our NotificationListenerService. After install or a
 * settings toggle Android often leaves the service unbound, which is why
 * notifications "aren't captured" — this nudges it back to connected.
 */
fun requestListenerRebind(context: Context) {
    runCatching {
        NotificationListenerService.requestRebind(
            ComponentName(context, PaymentNotificationListener::class.java),
        )
    }
}

/**
 * Recomposes the caller whenever the activity resumes, so permission state read
 * right after returning from a Settings screen is always fresh.
 */
@Composable
fun rememberResumeTick(): Int {
    var tick by remember { mutableStateOf(0) }
    val owner = LocalLifecycleOwner.current
    DisposableEffect(owner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) tick++
        }
        owner.lifecycle.addObserver(observer)
        onDispose { owner.lifecycle.removeObserver(observer) }
    }
    return tick
}
