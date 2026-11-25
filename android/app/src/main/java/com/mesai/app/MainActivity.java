package com.mesai.app;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MesaiUpdaterPlugin.class);
        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView == null) {
                    finish();
                    return;
                }

                webView.evaluateJavascript(
                    "(function(){try{return window.__mesaiHandleAndroidBack ? window.__mesaiHandleAndroidBack() : 'exit';}catch(e){return 'exit';}})()",
                    value -> {
                        if (value != null && value.contains("handled")) {
                            return;
                        }
                        if (value != null && value.contains("blocked")) {
                            return;
                        }
                        if (webView.canGoBack()) {
                            webView.goBack();
                        } else {
                            finish();
                        }
                    }
                );
            }
        });
    }
}
