package com.carwash.owner.admin.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.carwash.owner.admin.AdminApi
import com.carwash.owner.admin.BayLive
import com.carwash.owner.admin.Issue
import com.carwash.owner.admin.Payment
import com.carwash.owner.admin.PollingContent
import com.carwash.owner.admin.Stats
import com.carwash.owner.admin.formatClock
import com.carwash.owner.admin.formatPaise
import com.carwash.owner.ui.components.CwBadge
import com.carwash.owner.ui.components.CwCard
import com.carwash.owner.ui.components.CwCardTitle
import com.carwash.owner.ui.components.CwDivider
import com.carwash.owner.ui.components.CwScreen
import com.carwash.owner.ui.theme.Cw

private data class OverviewData(
    val bays: List<BayLive>,
    val payments: List<Payment>,
    val issues: List<Issue>,
    val stats: Stats,
)

@Composable
fun OverviewScreen(api: AdminApi, onUnauthorized: () -> Unit) {
    PollingContent(
        api, onUnauthorized,
        load = { OverviewData(it.bays(), it.payments(), it.issues(), it.stats()) },
    ) { d, _ ->
        val pending = d.payments.count { it.state == "pending" }
        val open = d.issues.count { it.status == "open" }
        val online = d.bays.count { it.online }
        val active = d.bays.filter { it.session != null }

        CwScreen {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Metric("earnings today", formatPaise(d.stats.earnings.today), Cw.coral, Modifier.weight(1f))
                Metric("bays online", "$online/${d.bays.size}", Cw.sage, Modifier.weight(1f))
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Metric("pending payments", pending.toString(), if (pending > 0) Cw.coral else Cw.text, Modifier.weight(1f))
                Metric("open issues", open.toString(), if (open > 0) Cw.coral else Cw.text, Modifier.weight(1f))
            }

            CwCard {
                CwCardTitle("live bays")
                if (d.bays.isEmpty()) Text("// no bays", fontFamily = Cw.mono, fontSize = 13.sp, color = Cw.text3)
                d.bays.forEach { b ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(
                            b.name + (b.session?.let { " · ${it.planName} ${formatClock(it.remainingSec)}" } ?: ""),
                            fontFamily = Cw.body, fontSize = 14.sp, color = Cw.text2,
                        )
                        CwBadge(
                            if (b.online) b.status else "offline",
                            when { !b.online -> Cw.coral; b.status == "ready" -> Cw.sage; else -> Cw.mist },
                        )
                    }
                }
            }

            CwCard {
                CwCardTitle("${active.size} active washes")
                if (active.isEmpty()) {
                    Text("// no washes running right now", fontFamily = Cw.mono, fontSize = 13.sp, color = Cw.text3)
                }
                active.forEach { b ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(b.name, fontFamily = Cw.body, fontSize = 14.sp, color = Cw.text2)
                        Text(formatClock(b.session!!.remainingSec), fontFamily = Cw.mono, fontSize = 14.sp, color = Cw.mist)
                    }
                }
            }
        }
    }
}

@Composable
private fun Metric(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    CwCard(modifier) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(label.uppercase(), fontFamily = Cw.mono, fontSize = 10.sp, color = Cw.text3)
            Text(value, fontFamily = Cw.display, fontSize = 26.sp, color = color)
        }
    }
}
