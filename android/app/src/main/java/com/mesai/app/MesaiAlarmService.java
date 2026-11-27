package com.mesai.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.media.ToneGenerator;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class MesaiAlarmService extends Service {
    static final String ACTION_START_ALARM = "com.mesai.app.ACTION_START_ALARM";
    static final String ACTION_STOP_ALARM = "com.mesai.app.ACTION_STOP_ALARM";
    static final String ACTION_ALARM_STATE_CHANGED = "com.mesai.app.ALARM_STATE_CHANGED";
    static final String EXTRA_IS_TEST = "extra_is_test";

    private static final String CHANNEL_ID = "mesai_alarm_channel";
    private static final String FALLBACK_CHANNEL_ID = "mesai_alarm_fallback_channel";
    static final int NOTIFICATION_ID = 7402;
    private static final long ALARM_DURATION_MS = 5000L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private MediaPlayer mediaPlayer;
    private ToneGenerator toneGenerator;
    private Vibrator vibrator;
    private boolean currentIsTest = false;

    private final Runnable autoStopRunnable = () -> stopAlarmAndFinish(true);

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_START_ALARM;
        if (ACTION_STOP_ALARM.equals(action)) {
            stopAlarmAndFinish(false);
            return START_NOT_STICKY;
        }

        currentIsTest = intent != null && intent.getBooleanExtra(EXTRA_IS_TEST, false);
        ensureNotificationChannel(this);

        Notification notification = buildRingingNotification(this, currentIsTest);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            );
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        handler.removeCallbacks(autoStopRunnable);
        stopAudioAndVibration();
        MesaiAlarmPrefs.setIsRinging(this, true);
        notifyStateChanged();

        startAlarmSound();
        startShortVibration();
        handler.postDelayed(autoStopRunnable, ALARM_DURATION_MS);

        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(autoStopRunnable);
        stopAudioAndVibration();
        MesaiAlarmPrefs.setIsRinging(this, false);
        notifyStateChanged();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    static void ensureNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = context.getSystemService(NotificationManager.class);
            if (nm == null) return;
            if (nm.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Mesai Hatırlatma Alarmı",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Günlük mesai kaydı hatırlatma alarm bildirimleri");
                // Sound is controlled strictly by MesaiAlarmService for 5 seconds
                channel.setSound(null, null);
                channel.enableVibration(false);
                nm.createNotificationChannel(channel);
            }
            if (nm.getNotificationChannel(FALLBACK_CHANNEL_ID) == null) {
                NotificationChannel fallbackChannel = new NotificationChannel(
                    FALLBACK_CHANNEL_ID,
                    "Mesai Hatırlatma (Arka Plan)",
                    NotificationManager.IMPORTANCE_HIGH
                );
                fallbackChannel.setDescription("Arka plan kısıtlaması durumunda sesli mesai hatırlatmaları");
                Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (soundUri == null) {
                    soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                }
                AudioAttributes attrs = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
                fallbackChannel.setSound(soundUri, attrs);
                fallbackChannel.enableVibration(true);
                nm.createNotificationChannel(fallbackChannel);
            }
        }
    }

    static void postFallbackNotification(Context context, boolean isTest) {
        ensureNotificationChannel(context);
        try {
            NotificationManagerCompat.from(context)
                .notify(NOTIFICATION_ID, buildFallbackReminderNotification(context, isTest));
        } catch (SecurityException ignored) {
            // Notification permission not granted
        }
    }

    private static PendingIntent buildOpenAppIntent(Context context) {
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(
            context,
            7403,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static Notification buildRingingNotification(Context context, boolean isTest) {
        Intent stopIntent = new Intent(context, MesaiAlarmReceiver.class);
        stopIntent.setAction(ACTION_STOP_ALARM);
        PendingIntent stopPendingIntent = PendingIntent.getBroadcast(
            context,
            7404,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String title = isTest ? "MESAİ Alarm Testi" : "Mesai Kaydı Hatırlatması";
        String text = isTest
            ? "Alarm sesi çalıyor (5 saniye sonra otomatik durur)."
            : "Bugün için henüz mesai kaydı girilmedi. Kayıt girmek için dokunun.";

        return new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setSilent(true)
            .setContentIntent(buildOpenAppIntent(context))
            .addAction(0, "Durdur", stopPendingIntent)
            .build();
    }

    private static Notification buildQuietReminderNotification(Context context, boolean isTest) {
        String title = isTest ? "MESAİ Alarm Testi Tamamlandı" : "Mesai Kaydı Hatırlatması";
        String text = isTest
            ? "Alarm sesi 5 saniyenin ardından otomatik durduruldu."
            : "Bugün için henüz mesai kaydı bulunmuyor. Kayıt girmek için dokunun.";

        return new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setOngoing(false)
            .setAutoCancel(true)
            .setSilent(true)
            .setContentIntent(buildOpenAppIntent(context))
            .build();
    }

    private static Notification buildFallbackReminderNotification(Context context, boolean isTest) {
        String title = isTest ? "MESAİ Alarm Testi" : "Mesai Kaydı Hatırlatması";
        String text = isTest
            ? "Test hatırlatma bildirimi."
            : "Bugün için henüz mesai kaydı bulunmuyor. Kayıt girmek için dokunun.";

        Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (soundUri == null) {
            soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, FALLBACK_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(false)
            .setAutoCancel(true)
            .setContentIntent(buildOpenAppIntent(context));

        if (soundUri != null) {
            builder.setSound(soundUri, AudioManager.STREAM_ALARM);
        }
        return builder.build();
    }

    private void startAlarmSound() {
        Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (alarmUri == null) {
            alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }
        if (alarmUri == null) {
            alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        }

        if (alarmUri != null) {
            MediaPlayer mp = null;
            try {
                mp = new MediaPlayer();
                mp.setAudioAttributes(
                    new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                );
                mp.setOnErrorListener((player, what, extra) -> {
                    startFallbackToneGenerator();
                    return true;
                });
                mp.setDataSource(this, alarmUri);
                mp.setLooping(true);
                mp.prepare();
                mp.start();
                mediaPlayer = mp;
                return;
            } catch (Exception ignored) {
                if (mp != null) {
                    try {
                        mp.release();
                    } catch (Exception ignoredRelease) {
                    }
                }
            }
        }

        startFallbackToneGenerator();
    }

    private void startFallbackToneGenerator() {
        if (toneGenerator != null) return;
        try {
            ToneGenerator tg = new ToneGenerator(AudioManager.STREAM_ALARM, 90);
            tg.startTone(ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD, (int) ALARM_DURATION_MS);
            toneGenerator = tg;
        } catch (Exception ignored) {
            // Silent fallback if audio device is unavailable
        }
    }

    private void startShortVibration() {
        try {
            Vibrator v;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                v = vm != null ? vm.getDefaultVibrator() : null;
            } else {
                v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            }
            if (v == null || !v.hasVibrator()) return;
            vibrator = v;
            long[] pattern = new long[] { 0, 450, 350, 450, 350, 450 };
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createWaveform(pattern, -1));
            } else {
                v.vibrate(pattern, -1);
            }
        } catch (Exception ignored) {
            // Ignore vibration failures
        }
    }

    private void stopAudioAndVibration() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
            } catch (Exception ignored) {
            }
            try {
                mediaPlayer.release();
            } catch (Exception ignored) {
            }
            mediaPlayer = null;
        }

        if (toneGenerator != null) {
            try {
                toneGenerator.stopTone();
                toneGenerator.release();
            } catch (Exception ignored) {
            }
            toneGenerator = null;
        }

        if (vibrator != null) {
            try {
                vibrator.cancel();
            } catch (Exception ignored) {
            }
            vibrator = null;
        }
    }

    private void stopAlarmAndFinish(boolean keepReminderAfterAutoTimeout) {
        handler.removeCallbacks(autoStopRunnable);
        stopAudioAndVibration();
        MesaiAlarmPrefs.setIsRinging(this, false);
        notifyStateChanged();

        boolean shouldKeepQuietReminder = keepReminderAfterAutoTimeout && !currentIsTest;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            if (shouldKeepQuietReminder) {
                stopForeground(STOP_FOREGROUND_DETACH);
                try {
                    NotificationManagerCompat.from(this)
                        .notify(NOTIFICATION_ID, buildQuietReminderNotification(this, false));
                } catch (SecurityException ignored) {
                }
            } else {
                stopForeground(STOP_FOREGROUND_REMOVE);
                NotificationManagerCompat.from(this).cancel(NOTIFICATION_ID);
            }
        } else {
            stopForeground(!shouldKeepQuietReminder);
            if (!shouldKeepQuietReminder) {
                NotificationManagerCompat.from(this).cancel(NOTIFICATION_ID);
            }
        }
        stopSelf();
    }

    private void notifyStateChanged() {
        Intent stateIntent = new Intent(ACTION_ALARM_STATE_CHANGED);
        stateIntent.setPackage(getPackageName());
        sendBroadcast(stateIntent);
    }
}
