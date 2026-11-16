// Add your existing app's package declaration before these imports.
import android.graphics.Color
import android.view.View
import android.webkit.WebView
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

/**
 * Install once, after setContentView, with the outer layout containing the WebView.
 * The outer layout owns system bar and keyboard insets.
 */
fun AppCompatActivity.installJoyvelopeWindow(root: View, webView: WebView) {
    WindowCompat.setDecorFitsSystemWindows(window, false)
    val baseLeft = root.paddingLeft
    val baseTop = root.paddingTop
    val baseRight = root.paddingRight
    val baseBottom = root.paddingBottom

    root.setBackgroundColor(Color.rgb(29, 20, 41))
    WindowInsetsControllerCompat(window, root).apply {
        isAppearanceLightStatusBars = false
        isAppearanceLightNavigationBars = false
    }
    ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
        val system = insets.getInsets(
            WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
        )
        val keyboard = insets.getInsets(WindowInsetsCompat.Type.ime())
        view.setPadding(
            baseLeft + system.left,
            baseTop + system.top,
            baseRight + system.right,
            baseBottom + maxOf(system.bottom, keyboard.bottom)
        )
        WindowInsetsCompat.CONSUMED
    }
    ViewCompat.requestApplyInsets(root)

    onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
            webView.evaluateJavascript(
                "Boolean(window.JoyHandleAndroidBack && window.JoyHandleAndroidBack())"
            ) { handled ->
                if (handled != "true" && webView.canGoBack()) {
                    val current = webView.url.orEmpty()
                    if (!current.endsWith("#home") && !current.endsWith("index.html")) {
                        webView.goBack()
                    }
                }
            }
        }
    })
}
