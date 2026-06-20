package com.getcapacitor

import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

open class BridgeActivity : AppCompatActivity() {

    private val registeredPlugins = mutableListOf<Class<out Plugin>>()

    protected fun registerPlugin(plugin: Class<out Plugin>) {
        registeredPlugins.add(plugin)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)

        val webView = WebView(this)
        setContentView(webView)
        configureWebView(webView)
        loadApp(webView)

        splashScreen.setKeepOnScreenCondition { false }
    }

    private fun configureWebView(webView: WebView) {
        with(webView.settings) {
            javaScriptEnabled = true
            javaScriptCanOpenWindowsAutomatically = true
            domStorageEnabled = true
            databaseEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            allowFileAccess = true
            allowContentAccess = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
        }
        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()
        webView.setBackgroundColor(android.graphics.Color.parseColor("#0F172A"))
    }

    private fun loadApp(webView: WebView) {
        // Loads the Vite-built React app from android assets.
        // Appflow copies dist/ → android/app/src/main/assets/public/ before Gradle runs.
        webView.loadUrl("file:///android_asset/public/index.html")
    }
}
