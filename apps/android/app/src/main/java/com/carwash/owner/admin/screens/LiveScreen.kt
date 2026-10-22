package com.carwash.owner.admin.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.carwash.owner.admin.AdminApi
import com.carwash.owner.admin.BayLive
import com.carwash.owner.admin.PollingContent
import com.carwash.owner.admin.encodeQr
import com.carwash.owner.admin.formatClock
import com.carwash.owner.ui.components.CwBadge
import com.carwash.owner.ui.components.CwButton
import com.carwash.owner.ui.components.CwCard
import com.carwash.owner.ui.components.CwCardTitle
import com.carwash.owner.ui.components.CwScreen
import com.carwash.owner.ui.components.CwVariant
import com.carwash.owner.ui.theme.Cw
import kotlinx.coroutines.launch

@Composable
fun LiveScreen(api: AdminApi, onUnauthorized: () -> Unit) {
    PollingContent(api, onUnauthorized, load = { it.bays() }) { bays, reload ->
        val scope = rememberCoroutineScope()
        var confirmStop by remember { mutableStateOf<BayLive?>(null) }

        confirmStop?.let { bay ->
            AlertDialog(
                onDismissRequest = { confirmStop = null },
                containerColor = Cw.surface,
                titleContentColor = Cw.text,
                textContentColor = Cw.text2,
                title = { Text("Remote stop", fontFamily = Cw.display) },
                text = { Text("Stop the active session on ${bay.name}?", fontFamily = Cw.body) },
                confirmButton = {
                    TextButton(onClick = {
                        confirmStop = null
                        scope.launch { runCatching { api.stopBay(bay.id) }; reload() }
                    }) { Text("Stop", color = Cw.coral, fontFamily = Cw.mono) }
                },
                dismissButton = {
                    TextButton(onClick = { confirmStop = null }) { Text("Cancel", color = Cw.text2, fontFamily = Cw.mono) }
                },
            )
        }

        CwScreen {
            if (bays.isEmpty()) {
                CwCard { Text("// no bays registered", fontFamily = Cw.mono, fontSize = 13.sp, color = Cw.text3) }
            }
            bays.forEach { b ->
                val tone = when {
                    !b.online -> Cw.coral
                    b.status == "ready" -> Cw.sage
                    else -> Cw.mist
                }
                CwCard {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        CwCardTitle(b.name)
                        CwBadge(if (b.online) b.status else "offline", tone)
                    }
                    if (b.session != null) {
                        Text(
                            "${b.session.planName} · ${b.session.state} · ${formatClock(b.session.remainingSec)} left",
                            fontFamily = Cw.body, fontSize = 14.sp, color = Cw.text2,
                        )
                    } else {
                        Text(
                            "no active session · mains ${if (b.mains == true) "on" else "—"}",
                            fontFamily = Cw.body, fontSize = 14.sp, color = Cw.text2,
                        )
                    }
                    if (b.session != null) {
                        CwButton("remote stop", onClick = { confirmStop = b }, variant = CwVariant.Danger)
                    }
                    if (b.scanUrl != null) {
                        val qr = remember(b.scanUrl) { encodeQr(b.scanUrl) }
                        if (qr != null) {
                            Box(
                                Modifier.padding(top = 6.dp).clip(RoundedCornerShape(6.dp)).background(Cw.text).padding(10.dp),
                            ) { Image(bitmap = qr, contentDescription = "scan QR", modifier = Modifier.size(150.dp)) }
                        }
                    }
                }
            }
        }
    }
}
