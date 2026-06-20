package com.mian.omnichannel

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(com.getcapacitor.plugin.WebViewPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
