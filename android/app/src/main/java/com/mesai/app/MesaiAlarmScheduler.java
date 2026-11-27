package com.mesai.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import java.util.Calendar;
import java.util.Set;
import java.util.TimeZone;

final class MesaiAlarmScheduler {
    static final String ACTION_TRIGGER_ALARM = "com.mesai.app.ACTION_MESAI_ALARM";
    private static final int ALARM_REQUEST_CODE = 7401;

    private MesaiAlarmScheduler() {
    }

    static PendingIntent getAlarmPendingIntent(Context context) {
        Intent intent = new Intent(context.getApplicationContext(), MesaiAlarmReceiver.class);
        intent.setAction(ACTION_TRIGGER_ALARM);
        return PendingIntent.getBroadcast(
            context.getApplicationContext(),
            ALARM_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    static boolean canScheduleExactAlarms(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return true;
        }
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        return am != null && am.canScheduleExactAlarms();
    }

    static long computeNextTriggerMillis(Context context) {
        if (!MesaiAlarmPrefs.isEnabled(context)) {
            return 0L;
        }
        Set<Integer> selectedDays = MesaiAlarmPrefs.getDaysOfWeek(context);
        if (selectedDays.isEmpty()) {
            return 0L;
        }

        int hour = MesaiAlarmPrefs.getHour(context);
        int minute = MesaiAlarmPrefs.getMinute(context);
        Set<String> recordedDates = MesaiAlarmPrefs.getRecordedDates(context);
        String lastTriggeredDate = MesaiAlarmPrefs.getLastTriggeredDate(context);
        long nowMillis = System.currentTimeMillis();
        TimeZone tz = TimeZone.getDefault();

        for (int dayOffset = 0; dayOffset <= 21; dayOffset++) {
            Calendar candidate = Calendar.getInstance(tz);
            candidate.add(Calendar.DAY_OF_YEAR, dayOffset);
            candidate.set(Calendar.HOUR_OF_DAY, hour);
            candidate.set(Calendar.MINUTE, minute);
            candidate.set(Calendar.SECOND, 0);
            candidate.set(Calendar.MILLISECOND, 0);

            if (candidate.getTimeInMillis() <= nowMillis + 1000L) {
                continue;
            }

            int isoDay = MesaiAlarmPrefs.getIsoDayOfWeek(candidate);
            if (!selectedDays.contains(isoDay)) {
                continue;
            }

            String dateStr = MesaiAlarmPrefs.formatDate(candidate);
            if (recordedDates.contains(dateStr)) {
                continue;
            }
            if (dateStr.equals(lastTriggeredDate)) {
                continue;
            }

            return candidate.getTimeInMillis();
        }

        return 0L;
    }

    static void cancelScheduledAlarm(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pi = getAlarmPendingIntent(context);
        if (am != null) {
            am.cancel(pi);
        }
        MesaiAlarmPrefs.setNextTriggerAt(context, 0L);
    }

    static long rescheduleNextAlarm(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pi = getAlarmPendingIntent(context);
        if (am != null) {
            am.cancel(pi);
        }

        long nextTriggerAt = computeNextTriggerMillis(context);
        MesaiAlarmPrefs.setNextTriggerAt(context, nextTriggerAt);

        if (nextTriggerAt <= 0L || am == null) {
            return 0L;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (am.canScheduleExactAlarms()) {
                try {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextTriggerAt, pi);
                } catch (SecurityException se) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextTriggerAt, pi);
                }
            } else {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextTriggerAt, pi);
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextTriggerAt, pi);
        } else {
            am.setExact(AlarmManager.RTC_WAKEUP, nextTriggerAt, pi);
        }

        return nextTriggerAt;
    }
}
