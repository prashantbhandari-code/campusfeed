package com.campusfeed.kiit;

import android.content.Intent;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;

public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
  }

  @Override
  public boolean onKeyDown(int keyCode, KeyEvent event) {
    if (keyCode == KeyEvent.KEYCODE_BACK) {
      WebView webView = getBridge() != null ? getBridge().getWebView() : null;
      if (webView != null && webView.canGoBack()) {
        webView.goBack();
        return true;
      }
      finishAndRemoveTask();
      return true;
    }
    return super.onKeyDown(keyCode, event);
  }

  @Override
  public void onBackPressed() {
    WebView webView = getBridge() != null ? getBridge().getWebView() : null;
    if (webView != null && webView.canGoBack()) {
      webView.goBack();
    } else {
      finishAndRemoveTask();
    }
  }

  @Override
  public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    if (intent != null) {
      String action = intent.getAction();
      if ("ACTION_ANSWER".equals(action) || "ACTION_DECLINE".equals(action)) {
        if (getBridge() != null && getBridge().getWebView() != null) {
          String callerId = intent.getStringExtra("callerId");
          String js = String.format("window.dispatchEvent(new CustomEvent('capacitor:callAction', {detail: {action: '%s', callerId: '%s'}}));",
            action, callerId);
          getBridge().getWebView().evaluateJavascript(js, null);
        }
      }
    }
  }
}