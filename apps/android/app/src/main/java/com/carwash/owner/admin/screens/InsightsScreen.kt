package com.carwash.owner.admin.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.carwash.owner.admin.AdminApi
import com.carwash.owner.admin.PollingContent
import com.carwash.owner.admin.formatPaise
import com.carwash.owner.ui.components.CwCard
import com.carwash.owner.ui.components.CwCardTitle
import com.carwash.owner.ui.components.CwKeyValue
import com.carwash.owner.ui.components.CwScreen
import com.carwash.owner.ui.theme.Cw

@Composable
fun InsightsScreen(api: AdminApi, onUnauthorized: () -> Unit) {
    PollingContent(api, onUnauthorized, load = { it.stats() }) { s, _ ->
        val maxPlan = (s.earningsByPlan.maxOfOrNull { it.paise } ?: 1L).coerceAtLeast(1L)
        val peak = s.usage.peakHours.indexOf(s.usage.peakHours.maxOrNull() ?: 0L)

        CwScreen {
            CwCard {
                CwCardTitle("earnings")
                MetricLine("today", formatPaise(s.earnings.today), Cw.coral)
                MetricLine("this week", formatPaise(s.earnings.week), Cw.sage)
                MetricLine("this month", formatPaise(s.earnings.month), Cw.lavender)
            }

            CwCard {
                CwCardTitle("earnings by plan")
                if (s.earningsByPlan.isEmpty()) {
                    Text("// no earnings yet", fontFamily = Cw.mono, fontSize = 13.sp, color = Cw.text3)
                }
                s.earningsByPlan.forEach { e ->
                    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(e.name, fontFamily = Cw.body, fontSize = 14.sp, color = Cw.text)
                            Text("${formatPaise(e.paise)} · ${e.count}", fontFamily = Cw.mono, fontSize = 12.sp, color = Cw.text2)
                        }
                        Box(Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(999.dp)).background(Cw.chip)) {
                            Box(
                                Modifier
                                    .fillMaxHeight()
                                    .fillMaxWidth(e.paise.toFloat() / maxPlan.toFloat())
                                    .clip(RoundedCornerShape(999.dp))
                                    .background(Cw.coral),
                            )
                        }
                    }
                }
            }

            CwCard {
                CwCardTitle("usage")
                CwKeyValue("washes", s.usage.sessionCount.toString())
                CwKeyValue("avg duration", "${s.usage.avgDurationSec / 60} min")
                CwKeyValue("most popular", s.usage.popularPlan?.name ?: "—")
                CwKeyValue("peak hour", if (s.usage.sessionCount > 0 && peak >= 0) "$peak:00" else "—")
            }

            CwCard {
                CwCardTitle("health")
                CwKeyValue("bays online", "${s.health.baysOnline}/${s.health.baysTotal}", Cw.sage)
                CwKeyValue("motor runtime", "${s.health.motorRuntimeHours} h")
                CwKeyValue("outages (24h)", s.health.outages24h.toString(), if (s.health.outages24h > 0) Cw.coral else Cw.text)
            }
        }
    }
}

@Composable
private fun MetricLine(label: String, value: String, color: Color) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontFamily = Cw.body, fontSize = 14.sp, color = Cw.text2)
        Text(value, fontFamily = Cw.display, fontSize = 22.sp, color = color)
    }
}
