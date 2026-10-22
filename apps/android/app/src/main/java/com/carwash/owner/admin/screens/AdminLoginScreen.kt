package com.carwash.owner.admin.screens

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.carwash.owner.admin.AdminApi
import com.carwash.owner.data.SecureStore
import com.carwash.owner.ui.components.CwButton
import com.carwash.owner.ui.components.CwCard
import com.carwash.owner.ui.components.CwHeader
import com.carwash.owner.ui.components.CwScreen
import com.carwash.owner.ui.components.CwTextField
import com.carwash.owner.ui.theme.Cw
import kotlinx.coroutines.launch

@Composable
fun AdminLoginScreen(store: SecureStore, onLoggedIn: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    // Prefill the server URL from a prior login or the listener pairing.
    var url by remember { mutableStateOf(store.adminApiUrl ?: store.pairing?.apiUrl ?: "") }
    var email by remember { mutableStateOf("owner@carwash.local") }
    var password by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    fun signIn() {
        val server = url.trim()
        if (server.isEmpty()) { error = "Enter the server URL."; return }
        scope.launch {
            busy = true
            error = null
            runCatching { AdminApi.login(server, email.trim(), password) }
                .onSuccess { token ->
                    store.adminApiUrl = server
                    store.adminToken = token
                    onLoggedIn()
                }
                .onFailure {
                    error = when (val m = it.message) {
                        "invalid_credentials", "login_failed" -> "Wrong email or password."
                        else -> m ?: "Couldn't reach the server."
                    }
                }
            busy = false
        }
    }

    CwScreen {
        Spacer(Modifier.height(24.dp))
        CwHeader(
            eyebrow = "~/carwash · owner console",
            title = "sign in",
            subtitle = "log in with your owner account to manage bays, payments and devices.",
        )

        CwCard {
            CwTextField(
                value = url,
                onValueChange = { url = it },
                label = "server url",
                placeholder = "http://192.168.1.5:4000",
                keyboardType = KeyboardType.Uri,
            )
            CwTextField(
                value = email,
                onValueChange = { email = it },
                label = "email",
                placeholder = "owner@carwash.local",
                keyboardType = KeyboardType.Email,
            )
            CwTextField(
                value = password,
                onValueChange = { password = it },
                label = "password",
                placeholder = "••••••••",
                keyboardType = KeyboardType.Password,
                visualTransformation = PasswordVisualTransformation(),
            )
            error?.let { Text(it, fontFamily = Cw.body, fontSize = 13.sp, color = Cw.coral) }
            Spacer(Modifier.height(2.dp))
            CwButton(
                text = "sign in",
                onClick = { signIn() },
                loading = busy,
                enabled = password.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
            )
        }

        Text(
            "Point the server URL at a host the phone can reach (your PC's LAN IP or a tunnel), not localhost.",
            fontFamily = Cw.body,
            fontSize = 12.sp,
            color = Cw.text3,
        )
    }
}
