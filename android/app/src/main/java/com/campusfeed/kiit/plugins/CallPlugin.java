package com.campusfeed.kiit.plugins;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.campusfeed.kiit.CallService;
import com.campusfeed.kiit.CallReceiver;

@CapacitorPlugin(name = "CallPlugin")
public class CallPlugin extends Plugin {
    private static final String TAG = "CallPlugin";

    @PluginMethod
    public void showIncomingCall(PluginCall call) {
        String callerId = call.getString("callerId");
        String callerName = call.getString("callerName");
        String callType = call.getString("callType");

        Log.d(TAG, "showIncomingCall: " + callerId + " " + callerName + " " + callType);

        if (callerId == null) {
            call.reject("callerId is required");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }

        // Start the CallService foreground service
        Intent serviceIntent = new Intent(activity, CallService.class);
        serviceIntent.setAction(CallService.ACTION_INCOMING_CALL);
        serviceIntent.putExtra("callerId", callerId);
        serviceIntent.putExtra("callerName", callerName);
        serviceIntent.putExtra("callType", callType);
        activity.startForegroundService(serviceIntent);

        call.resolve(new JSObject().put("success", true));
    }

    @PluginMethod
    public void hideIncomingCall(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }

        Intent serviceIntent = new Intent(activity, CallService.class);
        activity.stopService(serviceIntent);

        call.resolve(new JSObject().put("success", true));
    }
}