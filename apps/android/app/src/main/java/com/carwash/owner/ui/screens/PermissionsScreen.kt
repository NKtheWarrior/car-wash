package com.carwash.owner.ui.screens

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.carwash.owner.ui.components.CwBadge
import com.carwash.owner.ui.components.CwButton
import com.carwash.owner.ui.components.CwCard
import com.carwash.owner.ui.components.CwHeader
import com.carwash.owner.ui.components.CwScreen
import com.carwash.owner.ui.components.CwVariant
import com.carwash.owner.ui.hasNotificationAccess
import com.carwash.owner.ui.hasPostNotifications
import com.carwash.owner.ui.isIgnoringBatteryOptimizations
import com.carwash.owner.ui.rememberResumeTick
import com.carwash.owner.ui.theme.Cw

@Composable
fun PermissionsScreen(onContinue: () -> Unit) {
    val context = LocalContext.current
    val tick = rememberResumeTick()

    val notifPermLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { }

    // Ask for POST_NOTIFICATIONS straight away on first open.
    LaunchedEffect(Unit) {
        if (!hasPostNotifications(context)) {
            notifPermLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    // Keyed on `tick` so they re-read after returning from a Settings screen.
    val notifAccess = remember(tick) { hasNotificationAccess(context) }
    val postNotif = remember(tick) { hasPostNotifications(context) }
    val battery = remember(tick) { isIgnoringBatteryOptimizations(context) }
    val ready = notifAccess && postNotif

    CwScreen {
        CwHeader(
            eyebrow = "~/carwash · access",
            title = "grant access",
            subtitle = "the app needs these to read UPI payment alerts and keep watching in the background.",
        )

        PermissionRow(
            index = "01",
            title = "Notification access",
            detail = "Lets the app read your UPI app's payment notifications. This is the core permission.",
            granted = notifAccess,
            required = true,
            buttonText = if (notifAccess) "Open settings" else "Grant access",
        ) {
            context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }

        PermissionRow(
            index = "02",
            title = "Show notifications",
            detail = "Allows the always-on listener status notification.",
            granted = postNotif,
            required = true,
            buttonText = "Allow",
        ) {
            notifPermLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
        }

        PermissionRow(
            index = "03",
            title = "Ignore battery optimisation",
            detail = "Stops Android from killing the listener. Recommended.",
            granted = battery,
            required = false,
            buttonText = "Allow",
        ) {
            context.startActivity(
                Intent(
                    Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                    Uri.parse("package:${context.packageName}"),
                ),
            )
        }

        Spacer(Modifier.height(4.dp))
        CwButton(
            text = if (ready) "continue" else "grant required permissions",
            onClick = onContinue,
            enabled = ready,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun PermissionRow(
    index: String,
    title: String,
    detail: String,
    granted: Boolean,
    required: Boolean,
    buttonText: String,
    onClick: () -> Unit,
) {
    CwCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(index, fontFamily = Cw.mono, fontSize = 12.sp, color = Cw.text3)
                Text(title, fontFamily = Cw.body, fontSize = 16.sp, fontWeight = FontWeight.Medium, color = Cw.text)
            }
            if (granted) {
                CwBadge("granted", Cw.sage)
            } else {
                CwBadge(if (required) "needed" else "optional", if (required) Cw.coral else Cw.text2)
            }
        }
        Text(detail, fontFamily = Cw.body, fontSize = 13.sp, color = Cw.text2)
        if (!granted) {
            CwButton(
                text = buttonText,
                onClick = onClick,
                variant = CwVariant.Outline,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
    }
}
