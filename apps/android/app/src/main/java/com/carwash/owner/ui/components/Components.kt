package com.carwash.owner.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.carwash.owner.ui.theme.Cw

enum class CwVariant { Primary, Outline, Danger, Ghost }

/** Full-screen charcoal canvas with a scrolling, padded column. */
@Composable
fun CwScreen(content: @Composable ColumnScope.() -> Unit) {
    Box(Modifier.fillMaxSize().background(Cw.bg)) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(start = 20.dp, end = 20.dp, top = 28.dp, bottom = 40.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            content = content,
        )
    }
}

/** Mono uppercase micro-label (the ".cw-eyebrow"). */
@Composable
fun CwEyebrow(text: String, color: Color = Cw.text3, modifier: Modifier = Modifier) {
    Text(
        text = text.uppercase(),
        fontFamily = Cw.mono,
        fontSize = 11.sp,
        letterSpacing = 1.4.sp,
        color = color,
        modifier = modifier,
    )
}

/** Lowercase editorial page header with an eyebrow + optional sub-copy. */
@Composable
fun CwHeader(title: String, eyebrow: String? = null, subtitle: String? = null) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        if (eyebrow != null) CwEyebrow(eyebrow)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = title.lowercase(),
                fontFamily = Cw.display,
                fontSize = 30.sp,
                fontWeight = FontWeight.Normal,
                color = Cw.text,
            )
            Text("_", fontFamily = Cw.mono, fontSize = 30.sp, color = Cw.coral)
        }
        if (subtitle != null) {
            Text(subtitle, fontFamily = Cw.body, fontSize = 14.sp, color = Cw.text2)
        }
    }
}

@Composable
fun CwCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Cw.radiusLg))
            .background(Cw.surface)
            .border(1.dp, Cw.line, RoundedCornerShape(Cw.radiusLg))
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        content = content,
    )
}

@Composable
fun CwCardTitle(text: String) {
    Text(text.lowercase(), fontFamily = Cw.display, fontSize = 19.sp, color = Cw.text)
}

@Composable
fun CwButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: CwVariant = CwVariant.Primary,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    val fill = when (variant) {
        CwVariant.Primary -> Cw.coral
        else -> Color.Transparent
    }
    val fg = when (variant) {
        CwVariant.Primary -> Cw.onAccent
        CwVariant.Danger -> Cw.coral
        CwVariant.Outline -> Cw.text
        CwVariant.Ghost -> Cw.text2
    }
    val border = when (variant) {
        CwVariant.Primary -> Cw.coral
        CwVariant.Danger -> Cw.coral.copy(alpha = 0.5f)
        CwVariant.Outline -> Cw.text3
        CwVariant.Ghost -> Cw.line
    }
    val a = if (enabled) 1f else 0.4f
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(Cw.radiusSm))
            .background(fill.copy(alpha = fill.alpha * a))
            .border(1.dp, border.copy(alpha = border.alpha * a), RoundedCornerShape(Cw.radiusSm))
            .clickable(enabled = enabled && !loading) { onClick() }
            .padding(vertical = 13.dp, horizontal = 20.dp),
        contentAlignment = Alignment.Center,
    ) {
        if (loading) {
            CircularProgressIndicator(modifier = Modifier.size(18.dp), color = fg, strokeWidth = 2.dp)
        } else {
            Text(
                text = text,
                fontFamily = Cw.mono,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = fg.copy(alpha = a),
                textAlign = TextAlign.Center,
            )
        }
    }
}

/** Status pill with a leading dot (".cw-badge"). */
@Composable
fun CwBadge(text: String, tone: Color = Cw.text2) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(Cw.chip)
            .border(1.dp, tone.copy(alpha = 0.3f), RoundedCornerShape(999.dp))
            .padding(horizontal = 10.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(Modifier.size(6.dp).clip(CircleShape).background(tone))
        Text(text.uppercase(), fontFamily = Cw.mono, fontSize = 10.sp, letterSpacing = 0.8.sp, color = tone)
    }
}

/** Mono pill chip (URLs / tags). */
@Composable
fun CwChip(text: String) {
    Text(
        text = text,
        fontFamily = Cw.mono,
        fontSize = 12.sp,
        color = Cw.text2,
        modifier = Modifier
            .clip(RoundedCornerShape(Cw.radiusSm))
            .background(Cw.chip)
            .border(1.dp, Cw.line, RoundedCornerShape(Cw.radiusSm))
            .padding(horizontal = 10.dp, vertical = 5.dp),
    )
}

/** Key/value row with a hairline separator feel. */
@Composable
fun CwKeyValue(label: String, value: String, valueColor: Color = Cw.text) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, fontFamily = Cw.body, fontSize = 14.sp, color = Cw.text2)
        Text(value, fontFamily = Cw.mono, fontSize = 13.sp, color = valueColor)
    }
}

@Composable
fun CwDivider() {
    Box(Modifier.fillMaxWidth().padding(vertical = 2.dp).height(1.dp).background(Cw.line))
}

/** Dark text field with a mono eyebrow label, matching the web inputs. */
@Composable
fun CwTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String = "",
    keyboardType: KeyboardType = KeyboardType.Text,
    singleLine: Boolean = true,
    visualTransformation: VisualTransformation = VisualTransformation.None,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(7.dp)) {
        if (label != null) CwEyebrow(label)
        Box(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(Cw.radiusSm))
                .background(Cw.surfaceAlt)
                .border(1.dp, Cw.line, RoundedCornerShape(Cw.radiusSm))
                .padding(horizontal = 13.dp, vertical = 13.dp),
        ) {
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                singleLine = singleLine,
                textStyle = TextStyle(color = Cw.text, fontFamily = Cw.body, fontSize = 15.sp),
                cursorBrush = SolidColor(Cw.coral),
                keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
                visualTransformation = visualTransformation,
                modifier = Modifier.fillMaxWidth(),
                decorationBox = { inner ->
                    if (value.isEmpty() && placeholder.isNotEmpty()) {
                        Text(placeholder, color = Cw.text3, fontFamily = Cw.mono, fontSize = 14.sp)
                    }
                    inner()
                },
            )
        }
    }
}

/** Horizontally scrollable mono tab chips (the dashboard section switcher). */
@Composable
fun CwTabBar(tabs: List<String>, selected: Int, onSelect: (Int) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        tabs.forEachIndexed { i, t ->
            val active = i == selected
            Box(
                Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(if (active) Cw.coral else Cw.chip)
                    .border(1.dp, if (active) Cw.coral else Cw.line, RoundedCornerShape(999.dp))
                    .clickable { onSelect(i) }
                    .padding(horizontal = 14.dp, vertical = 8.dp),
            ) {
                Text(
                    t.uppercase(),
                    fontFamily = Cw.mono,
                    fontSize = 11.sp,
                    letterSpacing = 0.8.sp,
                    color = if (active) Cw.onAccent else Cw.text2,
                )
            }
        }
    }
}
