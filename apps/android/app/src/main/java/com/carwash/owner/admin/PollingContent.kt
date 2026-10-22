package com.carwash.owner.admin

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.unit.sp
import com.carwash.owner.ui.components.CwCard
import com.carwash.owner.ui.components.CwScreen
import com.carwash.owner.ui.theme.Cw
import kotlinx.coroutines.delay

/**
 * Loads `load(api)` once, then every [intervalMs] (the web's 5s poll), exposing
 * the result to [content] along with a `reload` trigger for after an action.
 * On a 401 it calls [onUnauthorized] so the shell can drop back to login.
 */
@Composable
fun <T> PollingContent(
    api: AdminApi,
    onUnauthorized: () -> Unit,
    intervalMs: Long = 5000,
    load: suspend (AdminApi) -> T,
    content: @Composable (data: T, reload: () -> Unit) -> Unit,
) {
    var data by remember { mutableStateOf<T?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var refresh by remember { mutableIntStateOf(0) }

    LaunchedEffect(refresh) {
        runCatching { load(api) }
            .onSuccess { data = it; error = null }
            .onFailure {
                if (it is AdminApiException && it.code == 401) onUnauthorized()
                error = it.message ?: "error"
            }
    }
    LaunchedEffect(Unit) {
        while (true) {
            delay(intervalMs)
            refresh++
        }
    }

    val current = data
    when {
        current != null -> content(current) { refresh++ }
        error != null -> CwScreen {
            CwCard { Text("// $error", fontFamily = Cw.mono, fontSize = 13.sp, color = Cw.coral) }
        }
        else -> CwScreen {
            CwCard { Text("// loading…", fontFamily = Cw.mono, fontSize = 13.sp, color = Cw.text3) }
        }
    }
}
