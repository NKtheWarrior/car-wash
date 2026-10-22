package com.carwash.owner.admin

import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import com.google.zxing.BarcodeFormat
import com.journeyapps.barcodescanner.BarcodeEncoder

/** Encodes [content] as a QR ImageBitmap (reuses the zxing dep already used for scanning). */
fun encodeQr(content: String, sizePx: Int = 420): ImageBitmap? =
    runCatching { BarcodeEncoder().encodeBitmap(content, BarcodeFormat.QR_CODE, sizePx, sizePx).asImageBitmap() }
        .getOrNull()
