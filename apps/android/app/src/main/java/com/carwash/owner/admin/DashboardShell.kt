package com.carwash.owner.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.carwash.owner.admin.screens.AdminSettingsScreen
import com.carwash.owner.admin.screens.InsightsScreen
import com.carwash.owner.admin.screens.IssuesScreen
import com.carwash.owner.admin.screens.LiveScreen
import com.carwash.owner.admin.screens.OverviewScreen
import com.carwash.owner.admin.screens.PaymentsScreen
import com.carwash.owner.admin.screens.PlansScreen
import com.carwash.owner.data.SecureStore
import com.carwash.owner.ui.components.CwButton
import com.carwash.owner.ui.components.CwVariant
import com.carwash.owner.ui.screens.HomeScreen
import com.carwash.owner.ui.screens.PairingScreen
import com.carwash.owner.ui.screens.PermissionsScreen
import com.carwash.owner.ui.screens.SelectAppScreen
import com.carwash.owner.ui.theme.Cw
import kotlinx.coroutines.launch

private data class NavItem(val route: String, val label: String)

private val NAV = listOf(
    NavItem("overview", "overview"),
    NavItem("live", "live bays"),
    NavItem("payments", "payments"),
    NavItem("issues", "issues"),
    NavItem("plans", "plans & prices"),
    NavItem("insights", "insights"),
    NavItem("settings", "settings"),
    NavItem("listener", "listener"),
)

private fun titleFor(route: String?): String = when (route) {
    "live" -> "live bays"
    "plans" -> "plans & prices"
    "listener/permissions" -> "permissions"
    "listener/selectapp" -> "payment app"
    "listener/pairing" -> "pair device"
    null -> "overview"
    else -> route
}

@Composable
fun DashboardShell(store: SecureStore, api: AdminApi, onSignOut: () -> Unit) {
    val nav = rememberNavController()
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    val entry by nav.currentBackStackEntryAsState()
    val route = entry?.destination?.route
    val isSub = route?.contains("/") == true

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            DrawerBody(current = route) { dest ->
                scope.launch { drawerState.close() }
                nav.navigate(dest) {
                    popUpTo(nav.graph.startDestinationId) { saveState = true }
                    launchSingleTop = true
                    restoreState = true
                }
            }
        },
    ) {
        Column(Modifier.fillMaxSize().background(Cw.bg)) {
            TopBar(
                title = titleFor(route),
                isSub = isSub,
                onMenu = { scope.launch { drawerState.open() } },
                onBack = { nav.popBackStack() },
                onSignOut = onSignOut,
            )
            NavHost(navController = nav, startDestination = "overview", modifier = Modifier.weight(1f)) {
                composable("overview") { OverviewScreen(api, onSignOut) }
                composable("live") { LiveScreen(api, onSignOut) }
                composable("payments") { PaymentsScreen(api, onSignOut) }
                composable("issues") { IssuesScreen(api, onSignOut) }
                composable("plans") { PlansScreen(api, onSignOut) }
                composable("insights") { InsightsScreen(api, onSignOut) }
                composable("settings") { AdminSettingsScreen(api, onSignOut) }
                composable("listener") { ListenerHome(store, nav) }
                composable("listener/permissions") { PermissionsScreen(onContinue = { nav.popBackStack() }) }
                composable("listener/selectapp") {
                    SelectAppScreen(onContinue = { pkg ->
                        store.selectedPackage = pkg
                        store.appChosen = true
                        nav.popBackStack()
                    })
                }
                composable("listener/pairing") { PairingScreen(store, onPaired = { nav.popBackStack() }) }
            }
        }
    }
}

@Composable
private fun ListenerHome(store: SecureStore, nav: NavHostController) {
    HomeScreen(
        store = store,
        onEditPermissions = { nav.navigate("listener/permissions") },
        onChangeApp = { nav.navigate("listener/selectapp") },
        onRepair = { nav.navigate("listener/pairing") },
    )
}

@Composable
private fun TopBar(title: String, isSub: Boolean, onMenu: () -> Unit, onBack: () -> Unit, onSignOut: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().border(1.dp, Cw.line).padding(horizontal = 12.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(
                Modifier.clip(RoundedCornerShape(Cw.radiusSm)).clickable { if (isSub) onBack() else onMenu() }
                    .padding(horizontal = 10.dp, vertical = 6.dp),
            ) { Text(if (isSub) "←" else "☰", fontFamily = Cw.mono, fontSize = 20.sp, color = Cw.text) }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(title, fontFamily = Cw.display, fontSize = 22.sp, color = Cw.text)
                Text("_", fontFamily = Cw.mono, fontSize = 22.sp, color = Cw.coral)
            }
        }
        CwButton("sign out", variant = CwVariant.Outline, onClick = onSignOut)
    }
}

@Composable
private fun DrawerBody(current: String?, onSelect: (String) -> Unit) {
    ModalDrawerSheet(
        drawerContainerColor = Cw.surface,
        drawerContentColor = Cw.text,
        modifier = Modifier.width(272.dp),
    ) {
        Column(Modifier.fillMaxHeight().padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(Modifier.padding(start = 8.dp, top = 8.dp, bottom = 20.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("~/carwash", fontFamily = Cw.mono, fontSize = 16.sp, color = Cw.text)
                Text("_", fontFamily = Cw.mono, fontSize = 16.sp, color = Cw.coral)
            }
            Text("CONSOLE", fontFamily = Cw.mono, fontSize = 10.sp, letterSpacing = 1.4.sp, color = Cw.text3, modifier = Modifier.padding(start = 8.dp, bottom = 6.dp))
            NAV.forEach { item ->
                val active = current == item.route || (item.route == "listener" && current?.startsWith("listener") == true)
                Row(
                    Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(Cw.radiusSm))
                        .background(if (active) Cw.coral.copy(alpha = 0.10f) else androidx.compose.ui.graphics.Color.Transparent)
                        .clickable { onSelect(item.route) }
                        .padding(horizontal = 12.dp, vertical = 13.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(Modifier.width(3.dp).height(16.dp).clip(RoundedCornerShape(2.dp)).background(if (active) Cw.coral else androidx.compose.ui.graphics.Color.Transparent))
                    Spacer(Modifier.width(12.dp))
                    Text(
                        item.label,
                        fontFamily = Cw.body,
                        fontSize = 15.sp,
                        fontWeight = if (active) FontWeight.Medium else FontWeight.Normal,
                        color = if (active) Cw.text else Cw.text2,
                    )
                }
            }
        }
    }
}
