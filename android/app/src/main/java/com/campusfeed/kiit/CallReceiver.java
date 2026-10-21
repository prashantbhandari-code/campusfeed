package com.campusfeed.kiit;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class CallReceiver extends BroadcastReceiver {
    private static final String TAG = "CallReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        String action = intent.getAction();
        String callerId = intent.getStringExtra("callerId");
        String callerName = intent.getStringExtra("callerName");
        String callType = intent.getStringExtra("callType");

        Log.d(TAG, "CallReceiver received action: " + action + " callerId: " + callerId);

        // Start the foreground service with the call action
        Intent serviceIntent = new Intent(context, CallService.class);
        serviceIntent.setAction(CallService.ACTION_INCOMING_CALL);
        serviceIntent.putExtra("callerId", callerId);
        serviceIntent.putExtra("callerName", callerName);
        serviceIntent.putExtra("callType", callType);
        context.startForegroundService(serviceIntent);
    }
}