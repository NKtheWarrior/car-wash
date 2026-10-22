package com.carwash.owner.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.carwash.owner.data.SecureStore
import com.carwash.owner.model.AppJson
import com.carwash.owner.model.Pairing
import com.carwash.owner.ui.components.CwBadge
import com.carwash.owner.ui.components.CwButton
import com.carwash.owner.ui.components.CwCard
import com.carwash.owner.ui.components.CwCardTitle
import com.carwash.owner.ui.components.CwHeader
import com.carwash.owner.ui.components.CwScreen
import com.carwash.owner.ui.components.CwVariant
import com.carwash.owner.ui.theme.Cw
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions

@Composable
fun PairingScreen(store: SecureStore, onPaired: () -> Unit) {
    val context = LocalContext.current
    var paired by remember { mutableStateOf(store.isPaired) }
    var error by remember { mutableStateOf<String?>(null) }

    val scanLauncher = rememberLauncherForActivityResult(ScanContract()) { result ->
        val contents = result.contents ?: return@rememberLauncherForActivityResult
        val parsed = runCatching { AppJson.decodeFromString(Pairing.serializer(), contents) }.getOrNull()
        if (parsed == null) {
            error = "That QR didn't look like a pairing code. Try again."
        } else {
            store.pairing = parsed
            paired = true
            error = null
        }
    }

    fun scan() {
        scanLauncher.launch(
            ScanOptions().setBeepEnabled(false).setPrompt("Scan the admin pairing QR").setOrientationLocked(false),
        )
    }

    CwScreen {
        CwHeader(
            eyebrow = "~/carwash · link device",
            title = "pair this phone",
            subtitle = "in the web admin, open Devices → pair a new phone, then scan the QR it shows.",
        )

        CwCard {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                CwCardTitle("device")
                CwBadge(if (paired) "paired" else "not paired", if (paired) Cw.sage else Cw.text2)
            }
            Text(
                text = if (paired) "Device ${store.pairing?.deviceId?.take(10)}… linked." else "No device linked yet.",
                fontFamily = Cw.body,
                fontSize = 14.sp,
                color = Cw.text2,
            )
            if (paired) {
                Text(
                    "API · ${store.pairing?.apiUrl ?: "—"}",
                    fontFamily = Cw.mono,
                    fontSize = 12.sp,
                    color = Cw.text3,
                )
            }
        }

        error?.let {
            Text(it, fontFamily = Cw.body, fontSize = 13.sp, color = Cw.coral)
        }

        Text(
            "Tip: point the QR's apiUrl at a host the phone can reach (your PC's LAN IP or a tunnel), not localhost.",
            fontFamily = Cw.body,
            fontSize = 12.sp,
            color = Cw.text3,
        )

        Spacer(Modifier.height(4.dp))
        CwButton(
            text = if (paired) "re-scan pairing qr" else "scan pairing qr",
            onClick = { scan() },
            variant = if (paired) CwVariant.Outline else CwVariant.Primary,
            modifier = Modifier.fillMaxWidth(),
        )
        if (paired) {
            CwButton(
                text = "continue to dashboard",
                onClick = onPaired,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
