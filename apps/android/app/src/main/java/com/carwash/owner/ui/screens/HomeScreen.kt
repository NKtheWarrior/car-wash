package com.carwash.owner.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.carwash.owner.data.SecureStore
import com.carwash.owner.service.ListenerForegroundService
import com.carwash.owner.ui.KNOWN_PAYMENT_APPS
import com.carwash.owner.ui.components.CwBadge
import com.carwash.owner.ui.components.CwButton
import com.carwash.owner.ui.components.CwCard
import com.carwash.owner.ui.components.CwCardTitle
import com.carwash.owner.ui.components.CwDivider
import com.carwash.owner.ui.components.CwEyebrow
import com.carwash.owner.ui.components.CwHeader
import com.carwash.owner.ui.components.CwKeyValue
import com.carwash.owner.ui.components.CwScreen
import com.carwash.owner.ui.components.CwVariant
import com.carwash.owner.ui.hasNotificationAccess
import com.carwash.owner.ui.rememberResumeTick
import com.carwash.owner.ui.requestListenerRebind
import com.carwash.owner.ui.theme.Cw
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun HomeScreen(
    store: SecureStore,
    onEditPermissions: () -> Unit,
    onChangeApp: () -> Unit,
    onRepair: () -> Unit,
) {
    val context = LocalContext.current
    val tick = rememberResumeTick()
    var enabled by remember { mutableStateOf(store.listenerEnabled) }
    var refresh by remember { mutableStateOf(0) }

    // Keyed on tick (resume) + refresh (button) so stored values re-read.
    val notifAccess = remember(tick) { hasNotificationAccess(context) }
    val paired = remember(tick, refresh) { store.isPaired }
    val lastPayment = remember(tick, refresh) { store.lastPaymentText }
    val lastHeartbeat = remember(tick, refresh) { store.lastHeartbeatAt }
    val appName = KNOWN_PAYMENT_APPS.firstOrNull { it.pkg == store.selectedPackage }?.name ?: store.selectedPackage
    val listening = enabled && paired && notifAccess

    // Keep the service bound/alive whenever we can actually listen. requestRebind
    // fixes the common "granted access but nothing is captured" case.
    LaunchedEffect(enabled, notifAccess, paired, tick) {
        if (listening) {
            requestListenerRebind(context)
            ListenerForegroundService.start(context)
        }
    }

    CwScreen {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom,
        ) {
            CwHeader(eyebrow = "~/carwash · payments", title = "listener")
            CwBadge(
                text = if (listening) "listening" else "paused",
                tone = if (listening) Cw.sage else Cw.coral,
            )
        }

        // ---- Listener -------------------------------------------------------
        CwCard {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    CwCardTitle("payment listener")
                    Text(
                        if (listening) "Active — watching $appName" else "Off",
                        fontFamily = Cw.body,
                        fontSize = 13.sp,
                        color = Cw.text2,
                    )
                }
                Switch(
                    checked = enabled,
                    onCheckedChange = {
                        enabled = it
                        store.listenerEnabled = it
                        if (it && paired) ListenerForegroundService.start(context)
                    },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Cw.onAccent,
                        checkedTrackColor = Cw.coral,
                        uncheckedThumbColor = Cw.text2,
                        uncheckedTrackColor = Cw.block,
                    ),
                )
            }
            CwDivider()
            CwKeyValue("Receiving app", appName)
            CwKeyValue(
                "Notification access",
                if (notifAccess) "granted" else "needed",
                if (notifAccess) Cw.sage else Cw.coral,
            )
            CwKeyValue("Last payment", lastPayment ?: "—")
            CwKeyValue("Last heartbeat", formatTime(lastHeartbeat))
            Spacer(Modifier.height(4.dp))
            CwButton("refresh", onClick = { refresh++ }, variant = CwVariant.Outline, modifier = Modifier.fillMaxWidth())
        }

        // ---- Pairing --------------------------------------------------------
        CwCard {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                CwCardTitle("device")
                CwBadge(if (paired) "paired" else "not paired", if (paired) Cw.sage else Cw.coral)
            }
            Text(
                if (paired) "Device ${store.pairing?.deviceId?.take(10)}…" else "No device linked.",
                fontFamily = Cw.body,
                fontSize = 13.sp,
                color = Cw.text2,
            )
            CwButton("re-pair", onClick = onRepair, variant = CwVariant.Outline, modifier = Modifier.fillMaxWidth())
        }

        // ---- Setup ----------------------------------------------------------
        CwCard {
            CwEyebrow("setup")
            CwButton("change payment app", onClick = onChangeApp, variant = CwVariant.Outline, modifier = Modifier.fillMaxWidth())
            CwButton("permissions", onClick = onEditPermissions, variant = CwVariant.Outline, modifier = Modifier.fillMaxWidth())
        }
    }
}

private fun formatTime(ms: Long): String =
    if (ms == 0L) "—" else SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date(ms))
