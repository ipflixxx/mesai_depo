package com.mesai.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;

import androidx.core.content.ContextCompat;

import java.util.Calendar;
import java.util.Set;
import java.util.TimeZone;

public class MesaiAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        if (MesaiAlarmService.ACTION_STOP_ALARM.equals(action)) {
            Intent stopIntent = new Intent(context, MesaiAlarmService.class);
            stopIntent.setAction(MesaiAlarmService.ACTION_STOP_ALARM);
            try {
                context.startService(stopIntent);
            } catch (Exception ignored) {
            }
            androidx.core.app.NotificationManagerCompat.from(context).cancel(MesaiAlarmService.NOTIFICATION_ID);
            MesaiAlarmPrefs.setIsRinging(context, false);
            return;
        }

        if (!MesaiAlarmScheduler.ACTION_TRIGGER_ALARM.equals(action)) {
            return;
        }

        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "com.mesai.app:MesaiAlarmWake");
            wakeLock.acquire(15000L);
        }

        try {
            if (!MesaiAlarmPrefs.isEnabled(context)) {
                MesaiAlarmScheduler.cancelScheduledAlarm(context);
                return;
            }

            Calendar now = Calendar.getInstance(TimeZone.getDefault());
            int todayIsoDay = MesaiAlarmPrefs.getIsoDayOfWeek(now);
            Set<Integer> selectedDays = MesaiAlarmPrefs.getDaysOfWeek(context);
            String todayStr = MesaiAlarmPrefs.formatDate(now);

            // Check weekday rule in local timezone
            if (!selectedDays.contains(todayIsoDay)) {
                MesaiAlarmScheduler.rescheduleNextAlarm(context);
                return;
            }

            // Skip ringing if a work entry exists for today
            if (MesaiAlarmPrefs.hasWorkEntryForDate(context, todayStr)) {
                MesaiAlarmScheduler.rescheduleNextAlarm(context);
                return;
            }

            // Guard against triggering more than once on the same local date
            if (todayStr.equals(MesaiAlarmPrefs.getLastTriggeredDate(context))) {
                MesaiAlarmScheduler.rescheduleNextAlarm(context);
                return;
            }

            MesaiAlarmPrefs.setLastTriggeredDate(context, todayStr);
            MesaiAlarmScheduler.rescheduleNextAlarm(context);

            Intent serviceIntent = new Intent(context, MesaiAlarmService.class);
            serviceIntent.setAction(MesaiAlarmService.ACTION_START_ALARM);
            serviceIntent.putExtra(MesaiAlarmService.EXTRA_IS_TEST, false);
            try {
                ContextCompat.startForegroundService(context, serviceIntent);
            } catch (Exception e) {
                MesaiAlarmService.postFallbackNotification(context, false);
            }
        } finally {
            if (wakeLock != null && wakeLock.isHeld()) {
                try {
                    wakeLock.release();
                } catch (Exception ignored) {
                }
            }
        }
    }
}
