package com.carwash.owner.admin.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.carwash.owner.admin.AdminApi
import com.carwash.owner.admin.AdminApiException
import com.carwash.owner.ui.components.CwButton
import com.carwash.owner.ui.components.CwCard
import com.carwash.owner.ui.components.CwCardTitle
import com.carwash.owner.ui.components.CwDivider
import com.carwash.owner.ui.components.CwScreen
import com.carwash.owner.ui.components.CwTextField
import com.carwash.owner.ui.components.CwVariant
import com.carwash.owner.ui.theme.Cw
import kotlinx.coroutines.launch

@Composable
fun AdminSettingsScreen(api: AdminApi, onUnauthorized: () -> Unit) {
    val scope = rememberCoroutineScope()

    var vpa by remember { mutableStateOf("") }
    var payee by remember { mutableStateOf("") }
    var payoutMsg by remember { mutableStateOf<String?>(null) }
    var payoutErr by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    val settings = remember { mutableStateMapOf<String, String>() }
    var settingsOrder by remember { mutableStateOf<List<String>>(emptyList()) }

    suspend fun loadAll() {
        runCatching { api.station() }
            .onSuccess { vpa = it.ownerVpa; payee = it.payeeName }
            .onFailure { if (it is AdminApiException && it.code == 401) onUnauthorized() }
        runCatching { api.settings() }.onSuccess { r ->
            settings.clear(); settings.putAll(r.values); settingsOrder = r.values.keys.sorted()
        }
    }

    LaunchedEffect(Unit) { loadAll() }

    CwScreen {
        // ---- Payout ----
        CwCard {
            CwCardTitle("payout account")
            Text(
                "every customer's UPI QR pays into this account — make sure the VPA is yours.",
                fontFamily = Cw.body, fontSize = 13.sp, color = Cw.text2,
            )
            CwTextField(vpa, { vpa = it; payoutMsg = null }, label = "upi id (vpa)", placeholder = "owner@okhdfcbank", keyboardType = KeyboardType.Email)
            CwTextField(payee, { payee = it; payoutMsg = null }, label = "payee name", placeholder = "My Car Wash")
            payoutErr?.let { Text(it, fontFamily = Cw.body, fontSize = 13.sp, color = Cw.coral) }
            payoutMsg?.let { Text(it, fontFamily = Cw.body, fontSize = 13.sp, color = Cw.sage) }
            CwButton(
                text = "save payout account",
                loading = busy,
                enabled = vpa.isNotBlank() && payee.isNotBlank(),
                onClick = {
                    scope.launch {
                        busy = true; payoutErr = null; payoutMsg = null
                        runCatching { api.setStation(vpa.trim(), payee.trim()) }
                            .onSuccess { vpa = it.ownerVpa; payee = it.payeeName; payoutMsg = "saved ✓ — new checkouts use this account." }
                            .onFailure {
                                if (it is AdminApiException && it.code == 401) onUnauthorized()
                                payoutErr = if (it.message == "invalid_vpa") "That doesn't look like a valid UPI id (e.g. name@okhdfcbank)." else (it.message ?: "save failed")
                            }
                        busy = false
                    }
                },
            )
        }

        // ---- Generic settings ----
        CwCard {
            CwCardTitle("settings")
            if (settingsOrder.isEmpty()) {
                Text("// no settings", fontFamily = Cw.mono, fontSize = 13.sp, color = Cw.text3)
            }
            settingsOrder.forEach { key ->
                CwDivider()
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Bottom) {
                    CwTextField(
                        value = settings[key] ?: "",
                        onValueChange = { settings[key] = it },
                        label = key,
                        modifier = Modifier.weight(1f),
                    )
                    CwButton("save", variant = CwVariant.Outline, onClick = {
                        val value = settings[key] ?: ""
                        scope.launch { runCatching { api.setSetting(key, value) } }
                    })
                }
            }
            Text("applies within ~15s.", fontFamily = Cw.body, fontSize = 12.sp, color = Cw.text3)
        }
    }
}
