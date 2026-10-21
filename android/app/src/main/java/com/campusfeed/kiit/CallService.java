package com.campusfeed.kiit;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;

public class CallService extends Service {
    private static final String TAG = "CallService";
    public static final String CHANNEL_ID = "call_channel";
    public static final String ACTION_INCOMING_CALL = "INCOMING_CALL";
    public static final String ACTION_ANSWER = "ACTION_ANSWER";
    public static final String ACTION_DECLINE = "ACTION_DECLINE";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_INCOMING_CALL.equals(intent.getAction())) {
            showIncomingCallNotification(intent);
        }
        return START_STICKY;
    }

    private void showIncomingCallNotification(Intent intent) {
        String callerName = intent.getStringExtra("callerName");
        String callerAvatar = intent.getStringExtra("callerAvatar");
        String callType = intent.getStringExtra("callType");
        String callerId = intent.getStringExtra("callerId");

        // Create intent for Answer action
        Intent answerIntent = new Intent(this, MainActivity.class);
        answerIntent.setAction(ACTION_ANSWER);
        answerIntent.putExtra("callerId", callerId);
        PendingIntent answerPendingIntent = PendingIntent.getActivity(this, 0, answerIntent, PendingIntent.FLAG_IMMUTABLE);

        // Create intent for Decline action
        Intent declineIntent = new Intent(this, MainActivity.class);
        declineIntent.setAction(ACTION_DECLINE);
        declineIntent.putExtra("callerId", callerId);
        PendingIntent declinePendingIntent = PendingIntent.getActivity(this, 0, declineIntent, PendingIntent.FLAG_IMMUTABLE);

        // Create full-screen intent (shows on lock screen)
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(this, 0, answerIntent, PendingIntent.FLAG_IMMUTABLE);

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Incoming " + (callType != null ? callType : "Video") + " Call")
                .setContentText(callerName != null ? callerName : "Incoming call")
                .setSmallIcon(android.R.drawable.ic_menu_call)
                .setVibrate(new long[]{1000, 500, 1000, 500})
                .setOngoing(true)
                .addAction(android.R.drawable.ic_menu_call, "Answer", answerPendingIntent)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Decline", declinePendingIntent)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .build();

        startForeground(1001, notification);
        vibrate();
    }

    private void vibrate() {
        try {
            android.os.Vibrator vibrator = (android.os.Vibrator) getSystemService(VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                vibrator.vibrate(android.os.VibrationEffect.createWaveform(new long[]{0, 500, 200, 500}, -1));
            }
        } catch (Exception e) {
            Log.e(TAG, "Vibrate error", e);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Incoming Calls", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Incoming call notifications");
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.enableVibration(true);
            channel.setBypassDnd(true);
            channel.setSound(null, null);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopForeground(true);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}