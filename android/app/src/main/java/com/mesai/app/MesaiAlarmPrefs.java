package com.mesai.app;

import android.content.Context;
import android.content.SharedPreferences;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TimeZone;

final class MesaiAlarmPrefs {
    private static final String PREFS_NAME = "mesai_alarm_prefs";
    private static final String KEY_ENABLED = "alarm_enabled";
    private static final String KEY_HOUR = "alarm_hour";
    private static final String KEY_MINUTE = "alarm_minute";
    private static final String KEY_DAYS_CSV = "alarm_days_csv";
    private static final String KEY_RECORDED_DATES = "recorded_entry_dates";
    private static final String KEY_LAST_TRIGGERED_DATE = "last_triggered_date";
    private static final String KEY_NEXT_TRIGGER_AT = "next_trigger_at";
    private static final String KEY_IS_RINGING = "is_ringing";

    private static final String DEFAULT_DAYS_CSV = "1,2,3,4,5";

    private MesaiAlarmPrefs() {
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    static boolean isEnabled(Context context) {
        return prefs(context).getBoolean(KEY_ENABLED, false);
    }

    static int getHour(Context context) {
        int h = prefs(context).getInt(KEY_HOUR, 18);
        return Math.max(0, Math.min(23, h));
    }

    static int getMinute(Context context) {
        int m = prefs(context).getInt(KEY_MINUTE, 0);
        return Math.max(0, Math.min(59, m));
    }

    static Set<Integer> getDaysOfWeek(Context context) {
        String csv = prefs(context).getString(KEY_DAYS_CSV, DEFAULT_DAYS_CSV);
        Set<Integer> result = new LinkedHashSet<>();
        if (csv != null && !csv.trim().isEmpty()) {
            String[] parts = csv.split(",");
            for (String p : parts) {
                try {
                    int day = Integer.parseInt(p.trim());
                    if (day >= 1 && day <= 7) {
                        result.add(day);
                    }
                } catch (NumberFormatException ignored) {
                    // Ignore malformed token
                }
            }
        }
        return result;
    }

    static void saveConfig(Context context, boolean enabled, int hour, int minute, List<Integer> days) {
        int safeHour = Math.max(0, Math.min(23, hour));
        int safeMinute = Math.max(0, Math.min(59, minute));
        Set<Integer> cleanDays = new LinkedHashSet<>();
        if (days != null) {
            for (Integer d : days) {
                if (d != null && d >= 1 && d <= 7) {
                    cleanDays.add(d);
                }
            }
        }
        StringBuilder sb = new StringBuilder();
        for (int d = 1; d <= 7; d++) {
            if (cleanDays.contains(d)) {
                if (sb.length() > 0) sb.append(",");
                sb.append(d);
            }
        }
        prefs(context).edit()
            .putBoolean(KEY_ENABLED, enabled)
            .putInt(KEY_HOUR, safeHour)
            .putInt(KEY_MINUTE, safeMinute)
            .putString(KEY_DAYS_CSV, sb.toString())
            .commit();
    }

    static void setRecordedDates(Context context, List<String> dates) {
        Set<String> clean = new HashSet<>();
        if (dates != null) {
            for (String d : dates) {
                if (d != null) {
                    String trimmed = d.trim();
                    if (trimmed.matches("^\\d{4}-\\d{2}-\\d{2}$")) {
                        clean.add(trimmed);
                    }
                }
            }
        }
        prefs(context).edit()
            .putStringSet(KEY_RECORDED_DATES, clean)
            .commit();
    }

    static Set<String> getRecordedDates(Context context) {
        Set<String> stored = prefs(context).getStringSet(KEY_RECORDED_DATES, Collections.emptySet());
        return stored == null ? Collections.emptySet() : new HashSet<>(stored);
    }

    static boolean hasWorkEntryForDate(Context context, String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return false;
        return getRecordedDates(context).contains(dateStr);
    }

    static String getLastTriggeredDate(Context context) {
        String value = prefs(context).getString(KEY_LAST_TRIGGERED_DATE, "");
        return value != null ? value : "";
    }

    static void setLastTriggeredDate(Context context, String dateStr) {
        prefs(context).edit()
            .putString(KEY_LAST_TRIGGERED_DATE, dateStr != null ? dateStr : "")
            .commit();
    }

    static long getNextTriggerAt(Context context) {
        return prefs(context).getLong(KEY_NEXT_TRIGGER_AT, 0L);
    }

    static void setNextTriggerAt(Context context, long triggerAtMillis) {
        prefs(context).edit()
            .putLong(KEY_NEXT_TRIGGER_AT, Math.max(0L, triggerAtMillis))
            .commit();
    }

    static boolean isRinging(Context context) {
        return prefs(context).getBoolean(KEY_IS_RINGING, false);
    }

    static void setIsRinging(Context context, boolean ringing) {
        prefs(context).edit()
            .putBoolean(KEY_IS_RINGING, ringing)
            .commit();
    }

    static String formatDate(Calendar cal) {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        sdf.setTimeZone(TimeZone.getDefault());
        return sdf.format(cal.getTime());
    }

    static String getTodayDateString() {
        Calendar now = Calendar.getInstance(TimeZone.getDefault());
        return formatDate(now);
    }

    /**
     * Converts Calendar.DAY_OF_WEEK into ISO-8601 weekday (1 = Monday ... 7 = Sunday).
     */
    static int getIsoDayOfWeek(Calendar cal) {
        int calDay = cal.get(Calendar.DAY_OF_WEEK);
        return calDay == Calendar.SUNDAY ? 7 : (calDay - 1);
    }
}
