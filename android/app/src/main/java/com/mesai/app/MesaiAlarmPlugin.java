package com.mesai.app;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TimeZone;

@CapacitorPlugin(
    name = "MesaiAlarm",
    permissions = {
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class MesaiAlarmPlugin extends Plugin {
    private final BroadcastReceiver stateReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            notifyListeners("alarmStateChanged", buildStatusPayload(context));
        }
    };
    private boolean receiverRegistered = false;

    @Override
    public void load() {
        super.load();
        if (!receiverRegistered && getContext() != null) {
            try {
                IntentFilter filter = new IntentFilter(MesaiAlarmService.ACTION_ALARM_STATE_CHANGED);
                ContextCompat.registerReceiver(
                    getContext().getApplicationContext(),
                    stateReceiver,
                    filter,
                    ContextCompat.RECEIVER_NOT_EXPORTED
                );
                receiverRegistered = true;
            } catch (Exception ignored) {
                receiverRegistered = false;
            }
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (receiverRegistered && getContext() != null) {
            try {
                getContext().getApplicationContext().unregisterReceiver(stateReceiver);
            } catch (Exception ignored) {
            }
            receiverRegistered = false;
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void getAlarmStatus(PluginCall call) {
        call.resolve(buildStatusPayload(getContext()));
    }

    @PluginMethod
    public void saveAlarmConfig(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        int hour = call.getInt("hour", 18);
        int minute = call.getInt("minute", 0);
        JSArray daysArr = call.getArray("daysOfWeek");
        List<Integer> days = new ArrayList<>();
        if (daysArr != null) {
            for (int i = 0; i < daysArr.length(); i++) {
                try {
                    days.add(daysArr.getInt(i));
                } catch (Exception ignored) {
                }
            }
        }

        MesaiAlarmPrefs.saveConfig(getContext(), enabled, hour, minute, days);
        MesaiAlarmScheduler.rescheduleNextAlarm(getContext());
        call.resolve(buildStatusPayload(getContext()));
    }

    @PluginMethod
    public void syncRecordedDates(PluginCall call) {
        JSArray datesArr = call.getArray("dates");
        List<String> dates = new ArrayList<>();
        if (datesArr != null) {
            for (int i = 0; i < datesArr.length(); i++) {
                try {
                    String value = datesArr.getString(i);
                    if (value != null && !value.trim().isEmpty()) {
                        dates.add(value.trim());
                    }
                } catch (Exception ignored) {
                }
            }
        }

        MesaiAlarmPrefs.setRecordedDates(getContext(), dates);
        if (MesaiAlarmPrefs.isEnabled(getContext())) {
            MesaiAlarmScheduler.rescheduleNextAlarm(getContext());
        }
        call.resolve(buildStatusPayload(getContext()));
    }

    @PluginMethod
    public void testAlarm(PluginCall call) {
        Intent serviceIntent = new Intent(getContext(), MesaiAlarmService.class);
        serviceIntent.setAction(MesaiAlarmService.ACTION_START_ALARM);
        serviceIntent.putExtra(MesaiAlarmService.EXTRA_IS_TEST, true);
        boolean started = false;
        try {
            ContextCompat.startForegroundService(getContext(), serviceIntent);
            started = true;
        } catch (Exception e) {
            MesaiAlarmService.postFallbackNotification(getContext(), true);
        }
        JSObject payload = buildStatusPayload(getContext());
        if (started) {
            payload.put("isRinging", true);
        }
        call.resolve(payload);
    }

    @PluginMethod
    public void stopAlarm(PluginCall call) {
        Intent stopIntent = new Intent(getContext(), MesaiAlarmService.class);
        stopIntent.setAction(MesaiAlarmService.ACTION_STOP_ALARM);
        try {
            getContext().startService(stopIntent);
        } catch (Exception ignored) {
        }
        NotificationManagerCompat.from(getContext()).cancel(MesaiAlarmService.NOTIFICATION_ID);
        MesaiAlarmPrefs.setIsRinging(getContext(), false);
        call.resolve(buildStatusPayload(getContext()));
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            call.resolve(buildStatusPayload(getContext()));
            return;
        }
        if (getPermissionState("notifications") == PermissionState.GRANTED
                && NotificationManagerCompat.from(getContext()).areNotificationsEnabled()) {
            call.resolve(buildStatusPayload(getContext()));
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationsPermissionCallback");
    }

    @PermissionCallback
    private void notificationsPermissionCallback(PluginCall call) {
        call.resolve(buildStatusPayload(getContext()));
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
        } catch (Exception e) {
            Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            fallback.setData(Uri.parse("package:" + getContext().getPackageName()));
            fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(fallback);
        }
        call.resolve();
    }

    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
        } catch (Exception e) {
            Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            fallback.setData(Uri.parse("package:" + getContext().getPackageName()));
            fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(fallback);
        }
        call.resolve();
    }

    private JSObject buildStatusPayload(Context context) {
        JSObject obj = new JSObject();
        obj.put("enabled", MesaiAlarmPrefs.isEnabled(context));
        obj.put("hour", MesaiAlarmPrefs.getHour(context));
        obj.put("minute", MesaiAlarmPrefs.getMinute(context));

        JSArray daysArr = new JSArray();
        Set<Integer> days = MesaiAlarmPrefs.getDaysOfWeek(context);
        for (Integer d : days) {
            daysArr.put(d);
        }
        obj.put("daysOfWeek", daysArr);

        obj.put("nextTriggerAt", MesaiAlarmPrefs.getNextTriggerAt(context));
        obj.put("lastTriggeredDate", MesaiAlarmPrefs.getLastTriggeredDate(context));
        obj.put("canScheduleExactAlarms", MesaiAlarmScheduler.canScheduleExactAlarms(context));

        boolean notifEnabled = NotificationManagerCompat.from(context).areNotificationsEnabled();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notifEnabled = notifEnabled && getPermissionState("notifications") == PermissionState.GRANTED;
        }
        obj.put("notificationsEnabled", notifEnabled);

        boolean batteryIgnored = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            batteryIgnored = pm == null || pm.isIgnoringBatteryOptimizations(context.getPackageName());
        }
        obj.put("batteryOptimizationIgnored", batteryIgnored);
        obj.put("isRinging", MesaiAlarmPrefs.isRinging(context));
        obj.put("sdkInt", Build.VERSION.SDK_INT);
        obj.put("timeZoneId", TimeZone.getDefault().getID());
        return obj;
    }
}
