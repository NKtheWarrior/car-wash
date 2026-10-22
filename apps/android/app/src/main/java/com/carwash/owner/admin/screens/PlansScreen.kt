package com.carwash.owner.admin.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
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
import com.carwash.owner.admin.Plan
import com.carwash.owner.admin.PollingContent
import com.carwash.owner.ui.components.CwButton
import com.carwash.owner.ui.components.CwCard
import com.carwash.owner.ui.components.CwCardTitle
import com.carwash.owner.ui.components.CwDivider
import com.carwash.owner.ui.components.CwScreen
import com.carwash.owner.ui.components.CwTextField
import com.carwash.owner.ui.components.CwVariant
import com.carwash.owner.ui.theme.Cw
import kotlinx.coroutines.launch
import kotlin.math.roundToLong

@Composable
fun PlansScreen(api: AdminApi, onUnauthorized: () -> Unit) {
    PollingContent(api, onUnauthorized, load = { it.plans() }) { plans, reload ->
        val scope = rememberCoroutineScope()
        CwScreen {
            CwCard {
                CwCardTitle("plans & prices")
                if (plans.isEmpty()) {
                    Text("// no plans configured", fontFamily = Cw.mono, fontSize = 13.sp, color = Cw.text3)
                }
                plans.forEach { p ->
                    key(p.id) {
                        CwDivider()
                        PlanRow(p, api, scope, reload)
                    }
                }
            }
        }
    }
}

@Composable
private fun PlanRow(p: Plan, api: AdminApi, scope: kotlinx.coroutines.CoroutineScope, reload: () -> Unit) {
    var price by remember(p.id) { mutableStateOf("%.2f".format(p.pricePaise / 100.0)) }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text(p.name, fontFamily = Cw.body, fontSize = 15.sp, color = Cw.text)
                Text("${p.vehicleType} · ${p.durationSec / 60} min", fontFamily = Cw.mono, fontSize = 11.sp, color = Cw.text3)
            }
            CwButton(
                text = if (p.active) "on" else "off",
                variant = if (p.active) CwVariant.Primary else CwVariant.Ghost,
                onClick = { scope.launch { runCatching { api.setPlanActive(p.id, !p.active) }; reload() } },
            )
        }
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            CwTextField(
                value = price,
                onValueChange = { price = it },
                label = "price ₹",
                keyboardType = KeyboardType.Decimal,
                modifier = Modifier.width(130.dp),
            )
            CwButton("save", variant = CwVariant.Outline, onClick = {
                val paise = price.trim().toDoubleOrNull()?.let { (it * 100).roundToLong() }
                if (paise != null && paise > 0) {
                    scope.launch { runCatching { api.setPlanPrice(p.id, paise) }; reload() }
                }
            })
        }
    }
}
