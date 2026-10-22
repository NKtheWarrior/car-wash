package com.carwash.owner.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp

/**
 * "Terminal Ember" design tokens, ported from the web (globals.css / admin.css).
 * Near-black charcoal, warm off-white text, a single coral accent, pastel
 * highlights, hairline borders and no shadows.
 *
 * Fonts: Android has no bundled Funnel Display / DM Sans, so we approximate the
 * brand with Monospace for the "code" accents (labels, buttons, numbers) and the
 * platform sans for display/body. Drop the real TTFs into res/font and swap
 * [Cw.display] / [Cw.body] to match the web exactly.
 */
object Cw {
    val bg = Color(0xFF0F1012)
    val surface = Color(0xFF16181C)
    val surfaceAlt = Color(0xFF151618)
    val block = Color(0xFF262C32)

    val text = Color(0xFFF0ECE6)
    val text2 = Color(0xFF79838C)
    val text3 = Color(0xFF52585F)
    val onAccent = Color(0xFF0F1012)

    val coral = Color(0xFFFC8A7D)
    val coralHover = Color(0xFFFB6655)
    val sage = Color(0xFFBDCEB4)
    val mist = Color(0xFF9CC4CD)
    val lavender = Color(0xFFCAB8EC)

    val line = Color(0xFFF0ECE6).copy(alpha = 0.075f)
    val lineFaint = Color(0xFFF0ECE6).copy(alpha = 0.05f)
    val chip = Color(0xFF262C32).copy(alpha = 0.30f)

    val radiusSm = 6.dp
    val radiusLg = 22.dp

    val mono = FontFamily.Monospace
    val display = FontFamily.SansSerif
    val body = FontFamily.SansSerif
}

@Composable
fun CarWashTheme(content: @Composable () -> Unit) {
    val scheme = darkColorScheme(
        primary = Cw.coral,
        onPrimary = Cw.onAccent,
        secondary = Cw.mist,
        background = Cw.bg,
        onBackground = Cw.text,
        surface = Cw.surface,
        onSurface = Cw.text,
        surfaceVariant = Cw.surfaceAlt,
        onSurfaceVariant = Cw.text2,
        outline = Cw.text3,
        error = Cw.coralHover,
    )
    MaterialTheme(colorScheme = scheme, content = content)
}
