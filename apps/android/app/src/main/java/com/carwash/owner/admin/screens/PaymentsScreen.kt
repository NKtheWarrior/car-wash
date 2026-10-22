package com.carwash.owner.admin.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.carwash.owner.admin.AdminApi
import com.carwash.owner.admin.Checkout
import com.carwash.owner.admin.Payment
import com.carwash.owner.admin.PollingContent
import com.carwash.owner.admin.formatPaise
import com.carwash.owner.ui.components.CwBadge
import com.carwash.owner.ui.components.CwButton
import com.carwash.owner.ui.components.CwCard
import com.carwash.owner.ui.components.CwCardTitle
import com.carwash.owner.ui.components.CwChip
import com.carwash.owner.ui.components.CwDivider
import com.carwash.owner.ui.components.CwScreen
import com.carwash.owner.ui.components.CwVariant
import com.carwash.owner.ui.theme.Cw
import kotlinx.coroutines.launch

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PaymentsScreen(api: AdminApi, onUnauthorized: () -> Unit) {
    PollingContent(
        api, onUnauthorized,
        load = { Pair(it.payments(), it.checkouts()) },
    ) { (payments, checkouts), reload ->
        val scope = rememberCoroutineScope()
        var picker by remember { mutableStateOf<Payment?>(null) }

        fun confirm(paymentId: String, checkoutId: String) {
            scope.launch { runCatching { api.confirmPayment(paymentId, checkoutId) }; reload() }
        }

        // Checkout picker for pending payments with no linked checkout.
        picker?.let { p ->
            AlertDialog(
                onDismissRequest = { picker = null },
                containerColor = Cw.surface,
                titleContentColor = Cw.text,
                textContentColor = Cw.text2,
                title = { Text("Link to checkout", fontFamily = Cw.display) },
                text = {
                    if (checkouts.isEmpty()) {
                        Text("No awaiting checkout to link right now. Reject if this wasn't a wash payment.", fontFamily = Cw.body)
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            checkouts.forEach { c ->
                                CwButton(
                                    "${c.bay.name} · ${formatPaise(c.amountPaise)}",
                                    variant = CwVariant.Outline,
                                    modifier = Modifier.fillMaxWidth(),
                                    onClick = { picker = null; confirm(p.id, c.id) },
                                )
                            }
                        }
                    }
                },
                confirmButton = {},
                dismissButton = { TextButton(onClick = { picker = null }) { Text("Close", color = Cw.text2, fontFamily = Cw.mono) } },
            )
        }

        CwScreen {
            if (checkouts.isNotEmpty()) {
                CwCard {
                    CwCardTitle("awaiting")
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        checkouts.forEach { c -> CwChip("${c.bay.name} · ${formatPaise(c.amountPaise)}") }
                    }
                }
            }

            CwCard {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    CwCardTitle("payments")
                    Text("${payments.size} records", fontFamily = Cw.mono, fontSize = 10.sp, color = Cw.text3)
                }
                if (payments.isEmpty()) {
                    Text("// no payments yet", fontFamily = Cw.mono, fontSize = 13.sp, color = Cw.text3)
                }
                payments.forEach { p ->
                    CwDivider()
                    PaymentRow(
                        p = p,
                        onConfirm = {
                            val linked = p.checkoutId
                            when {
                                linked != null -> confirm(p.id, linked)
                                checkouts.size == 1 -> confirm(p.id, checkouts.first().id)
                                else -> picker = p
                            }
                        },
                        onReject = { scope.launch { runCatching { api.rejectPayment(p.id) }; reload() } },
                    )
                }
            }
        }
    }
}

@Composable
private fun PaymentRow(p: Payment, onConfirm: () -> Unit, onReject: () -> Unit) {
    val tone = when (p.state) {
        "pending" -> Cw.coral
        "confirmed", "matched" -> Cw.sage
        else -> Cw.text2
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text(formatPaise(p.amountPaise), fontFamily = Cw.mono, fontSize = 15.sp, color = Cw.text)
                Text(p.upiRef, fontFamily = Cw.mono, fontSize = 11.sp, color = Cw.text3, maxLines = 1)
            }
            CwBadge(p.state, tone)
        }
        if (p.state == "pending") {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                CwButton("confirm", variant = CwVariant.Primary, onClick = onConfirm)
                CwButton("reject", variant = CwVariant.Danger, onClick = onReject)
            }
        }
    }
}
