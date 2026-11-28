import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { AppLanguage, getTranslations } from '../i18n';
import { MesaiAlarmSettings } from '../types/mesai';
import { isNativeAndroidPlatform } from './mesaiUpdater';

export type AlarmNotificationStrings = {
  channelName: string;
  channelDesc: string;
  fallbackChannelName: string;
  fallbackChannelDesc: string;
  titleReminder: string;
  bodyReminder: string;
  titleTest: string;
  bodyTestRinging: string;
  titleTestDone: string;
  bodyTestDone: string;
  bodyTestFallback: string;
  stopAction: string;
};

export interface NativeAlarmStatus {
  enabled: boolean;
  hour: number;
  minute: number;
  daysOfWeek: number[];
  nextTriggerAt: number;
  lastTriggeredDate: string;
  canScheduleExactAlarms: boolean;
  notificationsEnabled: boolean;
  batteryOptimizationIgnored: boolean;
  isRinging: boolean;
  sdkInt: number;
  timeZoneId: string;
}

export interface SaveAlarmConfigOptions extends MesaiAlarmSettings {
  notificationStrings?: AlarmNotificationStrings;
}

export interface MesaiAlarmPlugin {
  getAlarmStatus(): Promise<NativeAlarmStatus>;
  saveAlarmConfig(options: SaveAlarmConfigOptions): Promise<NativeAlarmStatus>;
  syncRecordedDates(options: { dates: string[] }): Promise<NativeAlarmStatus>;
  testAlarm(): Promise<NativeAlarmStatus>;
  stopAlarm(): Promise<NativeAlarmStatus>;
  requestNotificationPermission(): Promise<NativeAlarmStatus>;
  openNotificationSettings(): Promise<void>;
  openExactAlarmSettings(): Promise<void>;
  openBatterySettings(): Promise<void>;
  addListener(
    eventName: 'alarmStateChanged',
    listenerFunc: (status: NativeAlarmStatus) => void
  ): Promise<PluginListenerHandle>;
}

export const MesaiAlarm = registerPlugin<MesaiAlarmPlugin>('MesaiAlarm');

export function computeNextAlarmPreviewMillis(
  config: MesaiAlarmSettings,
  recordedDates: string[]
): number {
  if (!config.enabled || config.daysOfWeek.length === 0) {
    return 0;
  }

  const recordedSet = new Set(recordedDates);
  const selectedSet = new Set(config.daysOfWeek);
  const nowMillis = Date.now();

  for (let dayOffset = 0; dayOffset <= 21; dayOffset++) {
    const candidate = new Date();
    candidate.setDate(candidate.getDate() + dayOffset);
    candidate.setHours(config.hour, config.minute, 0, 0);

    if (candidate.getTime() <= nowMillis + 1000) {
      continue;
    }

    const jsDay = candidate.getDay(); // 0=Sun .. 6=Sat
    const isoDay = jsDay === 0 ? 7 : jsDay;
    if (!selectedSet.has(isoDay)) {
      continue;
    }

    const y = candidate.getFullYear();
    const m = String(candidate.getMonth() + 1).padStart(2, '0');
    const d = String(candidate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    if (recordedSet.has(dateStr)) {
      continue;
    }

    return candidate.getTime();
  }

  return 0;
}

export async function getNativeAlarmStatus(
  fallbackConfig: MesaiAlarmSettings,
  recordedDates: string[]
): Promise<NativeAlarmStatus> {
  if (isNativeAndroidPlatform()) {
    try {
      return await MesaiAlarm.getAlarmStatus();
    } catch {
      // Fallback below if plugin unavailable
    }
  }

  return {
    enabled: fallbackConfig.enabled,
    hour: fallbackConfig.hour,
    minute: fallbackConfig.minute,
    daysOfWeek: fallbackConfig.daysOfWeek,
    nextTriggerAt: computeNextAlarmPreviewMillis(fallbackConfig, recordedDates),
    lastTriggeredDate: '',
    canScheduleExactAlarms: true,
    notificationsEnabled: true,
    batteryOptimizationIgnored: true,
    isRinging: false,
    sdkInt: 0,
    timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul',
  };
}

export async function saveNativeAlarmConfig(
  config: MesaiAlarmSettings,
  recordedDates: string[],
  lang: AppLanguage = 'tr'
): Promise<NativeAlarmStatus> {
  if (isNativeAndroidPlatform()) {
    try {
      const notificationStrings = getTranslations(lang).alarm.native;
      return await MesaiAlarm.saveAlarmConfig({
        ...config,
        notificationStrings: { ...notificationStrings },
      });
    } catch {
      // Fallback below
    }
  }
  return getNativeAlarmStatus(config, recordedDates);
}

export async function syncNativeRecordedDates(dates: string[]): Promise<void> {
  if (!isNativeAndroidPlatform()) return;
  try {
    await MesaiAlarm.syncRecordedDates({ dates });
  } catch {
    // Ignore when bridge unavailable
  }
}

// Web-preview 5s acoustic chime fallback for "Alarmı Test Et" outside Android APK
let webAudioTimer: number | null = null;
let webAudioInterval: number | null = null;
let webAudioCtx: AudioContext | null = null;

export function stopWebPreviewTone(): void {
  if (webAudioTimer !== null) {
    window.clearTimeout(webAudioTimer);
    webAudioTimer = null;
  }
  if (webAudioInterval !== null) {
    window.clearInterval(webAudioInterval);
    webAudioInterval = null;
  }
  if (webAudioCtx) {
    try {
      void webAudioCtx.close();
    } catch {
      // ignore
    }
    webAudioCtx = null;
  }
}

export function playWebPreviewTone(onEnded: () => void): void {
  stopWebPreviewTone();
  if (Capacitor.isNativePlatform()) {
    onEnded();
    return;
  }

  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      webAudioCtx = ctx;
      const playPulse = () => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.001, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.45);
        } catch {
          // ignore audio gesture errors
        }
      };
      playPulse();
      webAudioInterval = window.setInterval(playPulse, 750);
    }
  } catch {
    // Web audio blocked or unsupported; timer still runs cleanly
  }

  webAudioTimer = window.setTimeout(() => {
    stopWebPreviewTone();
    onEnded();
  }, 5000);
}
