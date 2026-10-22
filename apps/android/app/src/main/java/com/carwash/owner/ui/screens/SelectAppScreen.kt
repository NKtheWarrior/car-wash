package com.carwash.owner.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.carwash.owner.ui.FAMPAY_PACKAGE
import com.carwash.owner.ui.PaymentApp
import com.carwash.owner.ui.components.CwBadge
import com.carwash.owner.ui.components.CwButton
import com.carwash.owner.ui.components.CwCard
import com.carwash.owner.ui.components.CwHeader
import com.carwash.owner.ui.components.CwScreen
import com.carwash.owner.ui.discoverPaymentApps
import com.carwash.owner.ui.isAppInstalled
import com.carwash.owner.ui.loadAppIcon
import com.carwash.owner.ui.theme.Cw

@Composable
fun SelectAppScreen(onContinue: (pkg: String) -> Unit) {
    val context = LocalContext.current
    val pm = remember { context.packageManager }
    val apps = remember { discoverPaymentApps(pm) }
    val famInstalled = remember { isAppInstalled(pm, FAMPAY_PACKAGE) }
    var selected by remember { mutableStateOf<String?>(if (famInstalled) FAMPAY_PACKAGE else null) }

    CwScreen {
        CwHeader(
            eyebrow = "~/carwash · payment source",
            title = "choose your upi app",
            subtitle = "we read payment alerts from one app. only FamPay is supported right now — the rest are coming soon.",
        )

        apps.forEach { app ->
            val icon = remember(app.pkg) { loadAppIcon(pm, app.pkg) }
            PaymentAppRow(
                app = app,
                icon = icon,
                notInstalled = app.pkg == FAMPAY_PACKAGE && !famInstalled,
                selected = selected == app.pkg,
                onClick = { if (app.supported) selected = app.pkg },
            )
        }

        if (!famInstalled) {
            Text(
                "FamPay isn't installed. Install it from the Play Store, then come back — payments only arrive while it's on this phone.",
                fontFamily = Cw.body,
                fontSize = 13.sp,
                color = Cw.coral,
            )
        }

        Spacer(Modifier.height(4.dp))
        CwButton(
            text = "continue",
            onClick = { selected?.let(onContinue) },
            enabled = selected != null,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun PaymentAppRow(
    app: PaymentApp,
    icon: androidx.compose.ui.graphics.ImageBitmap?,
    notInstalled: Boolean,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val blackedOut = !app.supported
    val borderColor = when {
        selected -> Cw.coral
        else -> Cw.line
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Cw.radiusLg))
            .background(if (selected) Cw.coral.copy(alpha = 0.06f) else Cw.surface)
            .border(1.dp, borderColor, RoundedCornerShape(Cw.radiusLg))
            .clickable(enabled = app.supported) { onClick() }
            .padding(16.dp)
            .alpha(if (blackedOut) 0.4f else 1f),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        // Icon tile (scrimmed to near-black when blacked out).
        Box(
            Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(Cw.block),
            contentAlignment = Alignment.Center,
        ) {
            if (icon != null) {
                Image(bitmap = icon, contentDescription = app.name, modifier = Modifier.size(34.dp))
            } else {
                Text(app.name.take(1), fontFamily = Cw.display, fontSize = 18.sp, color = Cw.text)
            }
            if (blackedOut) {
                Box(Modifier.size(44.dp).background(Color(0xFF0F1012).copy(alpha = 0.55f)))
            }
        }

        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(app.name, fontFamily = Cw.body, fontSize = 16.sp, fontWeight = FontWeight.Medium, color = Cw.text)
            Text(
                text = when {
                    blackedOut -> "coming soon"
                    notInstalled -> "supported · not installed"
                    else -> "supported · tap to select"
                },
                fontFamily = Cw.mono,
                fontSize = 11.sp,
                color = if (blackedOut) Cw.text3 else Cw.text2,
            )
        }

        when {
            blackedOut -> CwBadge("soon", Cw.text3)
            selected -> CwBadge("selected", Cw.coral)
            else -> CwBadge("ready", Cw.sage)
        }
    }
}
