package com.carwash.owner.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import com.carwash.owner.admin.AdminApi
import com.carwash.owner.admin.DashboardShell
import com.carwash.owner.admin.screens.AdminLoginScreen
import com.carwash.owner.data.SecureStore
import com.carwash.owner.ui.screens.PermissionsScreen
import com.carwash.owner.ui.theme.CarWashTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { CarWashTheme { App() } }
    }
}

/** Login gates the whole owner app; once signed in, the dashboard (with the
 *  payment-listener controls as a tab) takes over. */
@Composable
private fun App() {
    val context = LocalContext.current
    val store = remember { SecureStore(context) }
    var loggedIn by remember { mutableStateOf(store.isLoggedIn) }
    // Gate the dashboard on notification permissions right after login.
    var permsOk by remember { mutableStateOf(hasRequiredPermissions(context)) }

    when {
        !loggedIn -> AdminLoginScreen(
            store = store,
            onLoggedIn = {
                permsOk = hasRequiredPermissions(context)
                loggedIn = true
            },
        )

        !permsOk -> PermissionsScreen(onContinue = { permsOk = true })

        else -> {
            val api = remember(store.adminApiUrl, store.adminToken) {
                AdminApi(store.adminApiUrl!!, store.adminToken!!)
            }
            DashboardShell(
                store = store,
                api = api,
                onSignOut = {
                    store.adminToken = null
                    loggedIn = false
                },
            )
        }
    }
}
