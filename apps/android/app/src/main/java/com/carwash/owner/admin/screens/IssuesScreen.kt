package com.carwash.owner.admin.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.carwash.owner.admin.AdminApi
import com.carwash.owner.admin.PollingContent
import com.carwash.owner.ui.components.CwBadge
import com.carwash.owner.ui.components.CwButton
import com.carwash.owner.ui.components.CwCard
import com.carwash.owner.ui.components.CwCardTitle
import com.carwash.owner.ui.components.CwDivider
import com.carwash.owner.ui.components.CwScreen
import com.carwash.owner.ui.components.CwVariant
import com.carwash.owner.ui.theme.Cw
import kotlinx.coroutines.launch

@Composable
fun IssuesScreen(api: AdminApi, onUnauthorized: () -> Unit) {
    PollingContent(api, onUnauthorized, load = { it.issues() }) { issues, reload ->
        val scope = rememberCoroutineScope()
        val open = issues.count { it.status == "open" }

        CwScreen {
            CwCard {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    CwCardTitle("issues · $open open")
                    Text("${issues.size} total", fontFamily = Cw.mono, fontSize = 10.sp, color = Cw.text3)
                }
                if (issues.isEmpty()) {
                    Text("// no issues reported", fontFamily = Cw.mono, fontSize = 13.sp, color = Cw.text3)
                }
                issues.forEach { i ->
                    CwDivider()
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text(i.kind.uppercase(), fontFamily = Cw.mono, fontSize = 11.sp, color = Cw.coral)
                            CwBadge(i.status, if (i.status == "open") Cw.coral else Cw.sage)
                        }
                        Text(i.description, fontFamily = Cw.body, fontSize = 14.sp, color = Cw.text)
                        Text(i.contact ?: "no contact", fontFamily = Cw.body, fontSize = 12.sp, color = Cw.text3)
                        if (i.status == "open") {
                            CwButton("resolve", variant = CwVariant.Outline, onClick = {
                                scope.launch { runCatching { api.resolveIssue(i.id) }; reload() }
                            })
                        }
                    }
                }
            }
        }
    }
}
