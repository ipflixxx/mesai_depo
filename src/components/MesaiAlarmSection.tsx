import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, Check, Play, ShieldAlert, Square } from 'lucide-react';
import { useMesai } from '../context/MesaiContext';
import {
  MesaiAlarm,
  NativeAlarmStatus,
  computeNextAlarmPreviewMillis,
  getNativeAlarmStatus,
  playWebPreviewTone,
  saveNativeAlarmConfig,
  stopWebPreviewTone,
} from '../native/mesaiAlarm';
import { isNativeAndroidPlatform } from '../native/mesaiUpdater';
import { MesaiAlarmSettings } from '../types/mesai';
import { DEFAULT_SETTINGS, getTodayDateString } from '../utils/calculations';

const WEEKDAY_OPTIONS: Array<{ iso: number; shortLabel: string; fullLabel: string }> = [
  { iso: 1, shortLabel: 'Pzt', fullLabel: 'Pazartesi' },
  { iso: 2, shortLabel: 'Sal', fullLabel: 'Salı' },
  { iso: 3, shortLabel: 'Çar', fullLabel: 'Çarşamba' },
  { iso: 4, shortLabel: 'Per', fullLabel: 'Perşembe' },
  { iso: 5, shortLabel: 'Cum', fullLabel: 'Cuma' },
  { iso: 6, shortLabel: 'Cmt', fullLabel: 'Cumartesi' },
  { iso: 7, shortLabel: 'Paz', fullLabel: 'Pazar' },
];

function formatTimeInputValue(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatNextTriggerText(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return 'Planlanmış sonraki tetikleme yok';
  }
  const dt = new Date(timestamp);
  if (Number.isNaN(dt.getTime())) {
    return 'Planlanmış sonraki tetikleme yok';
  }
  return new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dt);
}

export const MesaiAlarmSection: React.FC = () => {
  const { settings, entries, updateSettings } = useMesai();
  const isAndroid = isNativeAndroidPlatform();

  const savedConfig: MesaiAlarmSettings = useMemo(
    () => ({
      enabled: settings.alarm?.enabled ?? DEFAULT_SETTINGS.alarm!.enabled,
      hour: settings.alarm?.hour ?? DEFAULT_SETTINGS.alarm!.hour,
      minute: settings.alarm?.minute ?? DEFAULT_SETTINGS.alarm!.minute,
      daysOfWeek: Array.isArray(settings.alarm?.daysOfWeek)
        ? [...settings.alarm.daysOfWeek].sort((a, b) => a - b)
        : [...DEFAULT_SETTINGS.alarm!.daysOfWeek],
    }),
    [settings.alarm]
  );

  const recordedDates = useMemo(
    () => Array.from(new Set(entries.map((e) => e.date))),
    [entries]
  );

  const [draft, setDraft] = useState<MesaiAlarmSettings>(savedConfig);
  const [nativeStatus, setNativeStatus] = useState<NativeAlarmStatus | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWebRinging, setIsWebRinging] = useState(false);

  // Keep draft synced when settings hydrate or restore backup occurs
  useEffect(() => {
    setDraft(savedConfig);
  }, [savedConfig]);

  const refreshStatus = useCallback(async () => {
    const status = await getNativeAlarmStatus(savedConfig, recordedDates);
    setNativeStatus(status);
  }, [savedConfig, recordedDates]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  // Listen to native foreground service state updates & Android system settings returns
  useEffect(() => {
    let disposed = false;
    let listenerRemove: (() => Promise<void>) | null = null;
    if (isAndroid) {
      void MesaiAlarm.addListener('alarmStateChanged', (status) => {
        if (!disposed) {
          setNativeStatus(status);
        }
      })
        .then((handle) => {
          if (disposed) {
            void handle.remove().catch(() => {});
          } else {
            listenerRemove = () => handle.remove();
          }
        })
        .catch(() => {
          // Plugin listener unavailable outside native shell
        });
    }

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void refreshStatus();
      }
    };

    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);

    return () => {
      disposed = true;
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      if (listenerRemove) {
        void listenerRemove().catch(() => {});
      }
      stopWebPreviewTone();
    };
  }, [isAndroid, refreshStatus]);

  const todayStr = getTodayDateString();
  const hasTodayEntry = useMemo(
    () => recordedDates.includes(todayStr),
    [recordedDates, todayStr]
  );

  const isDirty = useMemo(() => {
    const a = [...draft.daysOfWeek].sort((x, y) => x - y).join(',');
    const b = [...savedConfig.daysOfWeek].sort((x, y) => x - y).join(',');
    return (
      draft.enabled !== savedConfig.enabled ||
      draft.hour !== savedConfig.hour ||
      draft.minute !== savedConfig.minute ||
      a !== b
    );
  }, [draft, savedConfig]);

  const isRinging = isAndroid ? Boolean(nativeStatus?.isRinging) : isWebRinging;

  const toggleDay = (isoDay: number) => {
    setSaveMessage(null);
    setErrorMessage(null);
    setDraft((prev) => {
      const exists = prev.daysOfWeek.includes(isoDay);
      const nextDays = exists
        ? prev.daysOfWeek.filter((d) => d !== isoDay)
        : [...prev.daysOfWeek, isoDay].sort((a, b) => a - b);
      return { ...prev, daysOfWeek: nextDays };
    });
  };

  const handleTimeChange = (value: string) => {
    setSaveMessage(null);
    setErrorMessage(null);
    const [hStr, mStr] = value.split(':');
    const hour = Number(hStr);
    const minute = Number(mStr);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return;
    setDraft((prev) => ({
      ...prev,
      hour: Math.max(0, Math.min(23, hour)),
      minute: Math.max(0, Math.min(59, minute)),
    }));
  };

  const handleToggleEnabled = () => {
    setSaveMessage(null);
    setErrorMessage(null);
    setDraft((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  const handleSaveAlarm = async () => {
    setSaveMessage(null);
    setErrorMessage(null);

    if (draft.enabled && draft.daysOfWeek.length === 0) {
      setErrorMessage('Alarm aktifken haftanın en az bir gününü seçmelisiniz.');
      return;
    }

    setIsSaving(true);
    try {
      const cleanConfig: MesaiAlarmSettings = {
        enabled: draft.enabled,
        hour: draft.hour,
        minute: draft.minute,
        daysOfWeek: [...draft.daysOfWeek].sort((a, b) => a - b),
      };

      await updateSettings({ alarm: cleanConfig });

      if (isAndroid && cleanConfig.enabled && nativeStatus && !nativeStatus.notificationsEnabled) {
        try {
          await MesaiAlarm.requestNotificationPermission();
        } catch {
          // User can also grant via permission banner button
        }
      }

      const updatedStatus = await saveNativeAlarmConfig(cleanConfig, recordedDates);
      setNativeStatus(updatedStatus);
      setSaveMessage(
        cleanConfig.enabled
          ? 'Mesai alarmı kaydedildi ve planlandı.'
          : 'Mesai alarmı kapatıldı ve bekleyen planlama iptal edildi.'
      );
      setTimeout(() => setSaveMessage(null), 3500);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Alarm ayarları kaydedilemedi.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestOrStopAlarm = async () => {
    setErrorMessage(null);
    if (isRinging) {
      if (isAndroid) {
        const status = await MesaiAlarm.stopAlarm();
        setNativeStatus(status);
      } else {
        stopWebPreviewTone();
        setIsWebRinging(false);
      }
      return;
    }

    if (isAndroid) {
      try {
        if (nativeStatus && !nativeStatus.notificationsEnabled) {
          await MesaiAlarm.requestNotificationPermission();
        }
        const status = await MesaiAlarm.testAlarm();
        setNativeStatus(status);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Test alarmı başlatılamadı.'
        );
      }
    } else {
      setIsWebRinging(true);
      playWebPreviewTone(() => {
        setIsWebRinging(false);
      });
    }
  };

  const handleRequestNotification = async () => {
    if (!isAndroid) return;
    const status = await MesaiAlarm.requestNotificationPermission();
    setNativeStatus(status);
    if (!status.notificationsEnabled) {
      await MesaiAlarm.openNotificationSettings();
    }
  };

  const activeTimeLabel = formatTimeInputValue(savedConfig.hour, savedConfig.minute);

  return (
    <section
      aria-label="Mesai Alarmı"
      className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-4 sm:p-6 space-y-5"
    >
      {/* Başlık & Aç/Kapat Anahtarı */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {draft.enabled ? (
              <Bell className="w-4 h-4 text-[#159B61] dark:text-[#39D98A] shrink-0" />
            ) : (
              <BellOff className="w-4 h-4 text-[#77827B] dark:text-[#929B95] shrink-0" />
            )}
            <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
              Mesai Alarmı
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#77827B] dark:text-[#929B95] leading-relaxed">
            Seçtiğiniz günlerde belirlediğiniz saatte o güne ait mesai kaydı yoksa 5 saniyelik sesli hatırlatma çalar.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={draft.enabled}
          aria-label="Mesai alarmını aç veya kapat"
          onClick={handleToggleEnabled}
          className={`relative shrink-0 inline-flex h-8 w-14 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B61] dark:focus-visible:ring-[#39D98A] ${
            draft.enabled
              ? 'bg-[#159B61] dark:bg-[#39D98A] border-[#159B61] dark:border-[#39D98A]'
              : 'bg-[#EEF2EF] dark:bg-[#222925] border-[#CFD8D2] dark:border-white/[0.12]'
          }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white dark:bg-[#101211] shadow-sm transition-transform ${
              draft.enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Durum Özeti Bandı */}
      <div className="rounded-2xl bg-[#EEF2EF]/85 dark:bg-[#222925]/80 border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 py-3 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-medium text-[#77827B] dark:text-[#929B95]">
            Alarm durumu
          </span>
          <span
            className={`font-semibold ${
              savedConfig.enabled
                ? 'text-[#159B61] dark:text-[#39D98A]'
                : 'text-[#77827B] dark:text-[#929B95]'
            }`}
          >
            {savedConfig.enabled
              ? `Aktif · ${activeTimeLabel}${isDirty ? ' (kaydedilmemiş değişiklik var)' : ''}`
              : `Pasif${isDirty ? ' (kaydedilmemiş değişiklik var)' : ''}`}
          </span>
        </div>

        {savedConfig.enabled && (
          <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">
            Sonraki alarm:{' '}
            <span className="font-medium text-[#2A302D] dark:text-[#F5F3EE]">
              {formatNextTriggerText(
                nativeStatus?.nextTriggerAt ??
                  computeNextAlarmPreviewMillis(savedConfig, recordedDates)
              )}
            </span>
          </p>
        )}

        {savedConfig.enabled && hasTodayEntry && (
          <p className="text-[11px] text-[#159B61] dark:text-[#39D98A]">
            Bugün için mesai kaydınız bulunduğu için bugünkü alarm otomatik atlanacaktır.
          </p>
        )}
      </div>

      {/* Saat ve Gün Seçimi */}
      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 items-start">
        <div>
          <label
            htmlFor="mesai-alarm-time"
            className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5"
          >
            Alarm saati
          </label>
          <input
            id="mesai-alarm-time"
            type="time"
            value={formatTimeInputValue(draft.hour, draft.minute)}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-base font-semibold text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
          />
        </div>

        <div>
          <span className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
            Tekrar günleri
          </span>
          <div className="grid grid-cols-7 gap-1 min-[360px]:gap-1.5 sm:gap-2">
            {WEEKDAY_OPTIONS.map((day) => {
              const selected = draft.daysOfWeek.includes(day.iso);
              return (
                <button
                  key={day.iso}
                  type="button"
                  aria-label={day.fullLabel}
                  aria-pressed={selected}
                  onClick={() => toggleDay(day.iso)}
                  className={`min-h-[44px] rounded-xl border text-[11px] min-[390px]:text-xs font-semibold transition-colors flex items-center justify-center ${
                    selected
                      ? 'bg-[#159B61] dark:bg-[#39D98A] border-[#159B61] dark:border-[#39D98A] text-white dark:text-[#101211]'
                      : 'bg-[#EEF2EF] dark:bg-[#222925] border-[#CFD8D2] dark:border-white/[0.07] text-[#77827B] dark:text-[#929B95] hover:text-[#17221B] dark:hover:text-[#F4F7F5]'
                  }`}
                >
                  {day.shortLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Android İzin Kontrolleri (Android 12/13+ ve Pil Optimizasyonu) */}
      {isAndroid &&
        nativeStatus &&
        (!nativeStatus.notificationsEnabled ||
          !nativeStatus.canScheduleExactAlarms ||
          !nativeStatus.batteryOptimizationIgnored) && (
          <div className="rounded-2xl bg-amber-500/[0.08] dark:bg-amber-400/[0.08] border border-amber-500/25 dark:border-amber-400/20 p-3.5 space-y-2.5">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-[#D97706] dark:text-[#F59E0B] mt-0.5 shrink-0" />
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-[#17221B] dark:text-[#F4F7F5]">
                  Arka plan alarm izinleri
                </p>
                {!nativeStatus.notificationsEnabled && (
                  <p className="text-[#77827B] dark:text-[#929B95]">
                    Android 13 ve üzerinde alarm bildirimini ve durdurma düğmesini gösterebilmek için bildirim izni gerekir.
                  </p>
                )}
                {!nativeStatus.canScheduleExactAlarms && (
                  <p className="text-[#77827B] dark:text-[#929B95]">
                    Uygulama kapalıyken alarmın tam dakikasında çalması için &quot;Alarmlar ve hatırlatıcılar&quot; iznini açmanız önerilir.
                  </p>
                )}
                {!nativeStatus.batteryOptimizationIgnored && (
                  <p className="text-[#77827B] dark:text-[#929B95]">
                    Pil kısıtlaması açıksa bazı cihazlar uyku modunda alarmı geciktirebilir.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!nativeStatus.notificationsEnabled && (
                <button
                  type="button"
                  onClick={() => void handleRequestNotification()}
                  className="min-h-[40px] px-3 rounded-xl bg-[#D97706] dark:bg-[#F59E0B] text-white dark:text-[#101211] text-xs font-semibold"
                >
                  Bildirim İzni Ver
                </button>
              )}
              {!nativeStatus.canScheduleExactAlarms && (
                <button
                  type="button"
                  onClick={() => void MesaiAlarm.openExactAlarmSettings()}
                  className="min-h-[40px] px-3 rounded-xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CFD8D2] dark:border-white/[0.1] text-[#17221B] dark:text-[#F4F7F5] text-xs font-semibold"
                >
                  Tam Zamanlı Alarm İzni
                </button>
              )}
              {!nativeStatus.batteryOptimizationIgnored && (
                <button
                  type="button"
                  onClick={() => void MesaiAlarm.openBatterySettings()}
                  className="min-h-[40px] px-3 rounded-xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CFD8D2] dark:border-white/[0.1] text-[#17221B] dark:text-[#F4F7F5] text-xs font-semibold"
                >
                  Pil Optimizasyonunu Kontrol Et
                </button>
              )}
            </div>
          </div>
        )}

      {/* Bilgilendirme / Hata Mesajları */}
      {errorMessage && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}
      {saveMessage && (
        <div className="flex items-center gap-2 text-xs font-medium text-[#159B61] dark:text-[#39D98A]">
          <Check className="w-4 h-4 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Kaydet & Test / Durdur Butonları */}
      <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void handleSaveAlarm()}
          className="sm:flex-1 min-h-[46px] px-5 rounded-2xl bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211] text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {isSaving ? 'Kaydediliyor...' : 'Alarm Ayarlarını Kaydet'}
        </button>

        <button
          type="button"
          onClick={() => void handleTestOrStopAlarm()}
          className={`min-h-[46px] px-5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 border transition-colors ${
            isRinging
              ? 'bg-red-600 border-red-600 text-white'
              : 'bg-[#EEF2EF] dark:bg-[#222925] border-[#CFD8D2] dark:border-white/[0.08] text-[#17221B] dark:text-[#F4F7F5] hover:opacity-90'
          }`}
        >
          {isRinging ? (
            <>
              <Square className="w-4 h-4 fill-current" />
              <span>Alarmı Durdur</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Alarmı Test Et (5 sn)</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
};
