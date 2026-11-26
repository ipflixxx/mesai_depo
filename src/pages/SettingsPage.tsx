import React, { useRef, useState } from 'react';
import {
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  Moon,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sun,
  Upload,
} from 'lucide-react';
import { MesaiWordmark } from '../components/MesaiWordmark';
import { useMesai } from '../context/MesaiContext';
import {
  CurrencyCode,
  OvertimeCalculationMode,
  SalaryType,
  ThemeMode,
} from '../types/mesai';
import { calculateHourlyRate, formatCurrency } from '../utils/calculations';
import {
  exportEntriesToCSV,
  exportJSONBackup,
  exportMonthlyPDFReport,
  parseAndValidateBackup,
} from '../utils/exportUtils';

export const SettingsPage: React.FC = () => {
  const {
    settings,
    entries,
    runtimeInfo,
    updateResult,
    isCheckingUpdate,
    checkForUpdates,
    openUpdateModal,
    updateSettings,
    restoreBackup,
    resetAllData,
  } = useMesai();

  const [form, setForm] = useState(settings);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [updateCheckMessage, setUpdateCheckMessage] = useState<string | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSaveProfileAndWork = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      ...form,
      monthlySalary: Math.max(0, Number(form.monthlySalary) || 0),
      paymentDay: Math.max(1, Math.min(31, Number(form.paymentDay) || 15)),
      weeklyWorkDays: Math.max(1, Math.min(7, Number(form.weeklyWorkDays) || 5)),
      dailyWorkHours: Math.max(1, Math.min(24, Number(form.dailyWorkHours) || 8)),
      weeklyWorkHours: Math.max(1, Math.min(100, Number(form.weeklyWorkHours) || 40)),
      breakMinutes: Math.max(0, Number(form.breakMinutes) || 0),
      overtimeMultiplier: Math.max(1, Number(form.overtimeMultiplier) || 1.5),
      weekendMultiplier: Math.max(1, Number(form.weekendMultiplier) || 2.0),
    });
    setSavedNotice('Ayarlar kaydedildi ve kayıtlar güncellendi.');
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const handleThemeChange = async (mode: ThemeMode) => {
    setForm((prev) => ({ ...prev, themeMode: mode }));
    await updateSettings({ themeMode: mode });
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const { settings: nextSettings, entries: nextEntries } = parseAndValidateBackup(text);
      await restoreBackup(nextSettings, nextEntries);
      setForm(nextSettings);
      setRestoreStatus({
        type: 'success',
        message: `${nextEntries.length} mesai kaydı başarıyla geri yüklendi.`,
      });
    } catch (err) {
      setRestoreStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Yedek geri yüklenemedi.',
      });
    } finally {
      e.target.value = '';
    }
  };

  const handlePDFReport = () => {
    const now = new Date();
    exportMonthlyPDFReport(entries, settings, now.getFullYear(), now.getMonth());
  };

  const handleCheckUpdate = async () => {
    setUpdateCheckMessage(null);
    const res = await checkForUpdates(false);
    if (res.hasUpdate) {
      setUpdateCheckMessage(
        res.manifest
          ? `Yeni sürüm bulundu: v${res.manifest.versionName}`
          : 'Google Play üzerinde yeni sürüm hazır.'
      );
      openUpdateModal();
    } else if (res.error) {
      setUpdateCheckMessage(res.error);
    } else {
      setUpdateCheckMessage(`Uygulamanız güncel (v${res.currentVersionName}).`);
    }
  };

  const hourlyRate = calculateHourlyRate(form);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-[#17221B] dark:text-[#F4F7F5] tracking-tight">
          Ayarlar
        </h1>
        <p className="text-xs text-[#77827B] dark:text-[#929B95]">
          Maaş, çalışma düzeni, görünüm ve veri yedekleme tercihlerin
        </p>
      </header>

      <form onSubmit={handleSaveProfileAndWork} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Kişisel Bilgiler */}
          <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
                Kişisel bilgiler
              </h2>
              <span className="font-mono text-xs text-[#159B61] dark:text-[#39D98A] tabular-nums">
                {formatCurrency(hourlyRate, form.currency, 2)} / sa
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                Kullanıcı adı
              </label>
              <input
                type="text"
                value={form.userName}
                onChange={(e) => setForm({ ...form, userName: e.target.value })}
                className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 text-sm text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  Aylık maaş
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={form.monthlySalary}
                  onChange={(e) =>
                    setForm({ ...form, monthlySalary: Number(e.target.value) || 0 })
                  }
                  className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm font-semibold text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  Maaş türü
                </label>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07]">
                  {(['net', 'gross'] as SalaryType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm({ ...form, salaryType: type })}
                      className={`min-h-[36px] rounded-lg text-xs font-medium transition-colors ${
                        form.salaryType === type
                          ? 'bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5]'
                          : 'text-[#77827B] dark:text-[#929B95]'
                      }`}
                    >
                      {type === 'net' ? 'Net' : 'Brüt'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  Para birimi
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07]">
                  {(['TRY', 'USD', 'EUR'] as CurrencyCode[]).map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => setForm({ ...form, currency: cur })}
                      className={`min-h-[36px] rounded-lg font-mono text-xs font-medium transition-colors ${
                        form.currency === cur
                          ? 'bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5]'
                          : 'text-[#77827B] dark:text-[#929B95]'
                      }`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  Ödeme günü
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={form.paymentDay}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      paymentDay: Math.max(1, Math.min(31, Number(e.target.value) || 1)),
                    })
                  }
                  className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                />
              </div>
            </div>
          </section>

          {/* Çalışma Düzeni */}
          <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
              Çalışma düzeni
            </h2>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  Haftalık gün
                </label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={form.weeklyWorkDays}
                  onChange={(e) =>
                    setForm({ ...form, weeklyWorkDays: Number(e.target.value) || 5 })
                  }
                  className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  Günlük saat
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={1}
                  max={24}
                  value={form.dailyWorkHours}
                  onChange={(e) =>
                    setForm({ ...form, dailyWorkHours: Number(e.target.value) || 8 })
                  }
                  className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  Haftalık saat
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={1}
                  max={100}
                  value={form.weeklyWorkHours}
                  onChange={(e) =>
                    setForm({ ...form, weeklyWorkHours: Number(e.target.value) || 40 })
                  }
                  className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  Başlangıç
                </label>
                <input
                  type="time"
                  value={form.workStartTime}
                  onChange={(e) => setForm({ ...form, workStartTime: e.target.value })}
                  className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-2.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  Bitiş
                </label>
                <input
                  type="time"
                  value={form.workEndTime}
                  onChange={(e) => setForm({ ...form, workEndTime: e.target.value })}
                  className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-2.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  Mola (dk)
                </label>
                <input
                  type="number"
                  min={0}
                  max={240}
                  value={form.breakMinutes}
                  onChange={(e) =>
                    setForm({ ...form, breakMinutes: Number(e.target.value) || 0 })
                  }
                  className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  Fazla mesai çarpanı
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  value={form.overtimeMultiplier}
                  onChange={(e) =>
                    setForm({ ...form, overtimeMultiplier: Number(e.target.value) || 1.5 })
                  }
                  className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  Hafta sonu çarpanı
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  value={form.weekendMultiplier}
                  onChange={(e) =>
                    setForm({ ...form, weekendMultiplier: Number(e.target.value) || 2.0 })
                  }
                  className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                Fazla mesai hesaplama esası
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07]">
                {(
                  [
                    { id: 'daily', label: 'Günlük hedef' },
                    { id: 'weekly', label: 'Haftalık hedef' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        overtimeCalculationMode: m.id as OvertimeCalculationMode,
                      })
                    }
                    className={`min-h-[36px] rounded-lg text-xs font-medium transition-colors ${
                      form.overtimeCalculationMode === m.id
                        ? 'bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5]'
                        : 'text-[#77827B] dark:text-[#929B95]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {savedNotice ? (
            <div className="flex items-center gap-2 text-xs font-medium text-[#159B61] dark:text-[#39D98A]">
              <Check className="w-4 h-4" />
              <span>{savedNotice}</span>
            </div>
          ) : (
            <span className="text-xs text-[#77827B] dark:text-[#929B95]">
              Değişiklikler tüm kayıtların kazanç hesaplamasına otomatik uygulanır.
            </span>
          )}
          <button
            type="submit"
            className="min-h-[46px] px-6 rounded-2xl bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211] font-semibold text-sm transition-transform active:scale-[0.98] whitespace-nowrap"
          >
            Bilgileri Kaydet
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Görünüm */}
        <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
            Görünüm
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'dark', label: 'Koyu', icon: Moon },
                { id: 'light', label: 'Açık', icon: Sun },
                { id: 'system', label: 'Sistem', icon: Smartphone },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const active = form.themeMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => void handleThemeChange(opt.id)}
                  className={`min-h-[68px] rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 border transition-colors ${
                    active
                      ? 'border-[#159B61] dark:border-[#39D98A] bg-[#159B61]/10 dark:bg-[#39D98A]/12 text-[#159B61] dark:text-[#39D98A]'
                      : 'border-[#CFD8D2] dark:border-white/[0.07] bg-[#EEF2EF]/75 dark:bg-[#222925]/60 text-[#77827B] dark:text-[#929B95]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-semibold">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Veri Yönetimi */}
        <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
            Veri yönetimi
          </h2>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => exportEntriesToCSV(entries, settings)}
              className="min-h-[46px] px-3.5 rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-xs font-semibold text-[#17221B] dark:text-[#F4F7F5] flex items-center justify-center gap-2 hover:opacity-90"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#159B61] dark:text-[#39D98A] shrink-0" />
              <span>CSV Dışa Aktar</span>
            </button>

            <button
              type="button"
              onClick={handlePDFReport}
              className="min-h-[46px] px-3.5 rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-xs font-semibold text-[#17221B] dark:text-[#F4F7F5] flex items-center justify-center gap-2 hover:opacity-90"
            >
              <FileText className="w-4 h-4 text-[#159B61] dark:text-[#39D98A] shrink-0" />
              <span>PDF Raporu</span>
            </button>

            <button
              type="button"
              onClick={() => exportJSONBackup(settings, entries)}
              className="min-h-[46px] px-3.5 rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-xs font-semibold text-[#17221B] dark:text-[#F4F7F5] flex items-center justify-center gap-2 hover:opacity-90"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>JSON Yedekle</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[46px] px-3.5 rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-xs font-semibold text-[#17221B] dark:text-[#F4F7F5] flex items-center justify-center gap-2 hover:opacity-90"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span>JSON Geri Yükle</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json,text/plain"
              onChange={handleRestoreFile}
              className="hidden"
            />
          </div>

          {restoreStatus && (
            <p
              className={`text-xs font-medium ${
                restoreStatus.type === 'success'
                  ? 'text-[#159B61] dark:text-[#39D98A]'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {restoreStatus.message}
            </p>
          )}
        </section>
      </div>

      {/* Uygulama & Gizlilik */}
      <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
            Uygulama
          </h2>
          <MesaiWordmark size="xs" />
        </div>

        <div className="divide-y divide-[#D7E0DA] dark:divide-white/[0.06] text-sm">
          <div className="py-3 flex items-start justify-between gap-4">
            <div>
              <div className="font-medium text-[#17221B] dark:text-[#F4F7F5]">Hakkında</div>
              <p className="text-xs text-[#77827B] dark:text-[#929B95] mt-0.5">
                MESAİ Android —{' '}
                {runtimeInfo.channel === 'play'
                  ? 'Google Play Dağıtımı'
                  : 'Doğrudan Dağıtım (APK)'}
              </p>
            </div>
            <span className="font-mono text-xs text-[#77827B] dark:text-[#929B95] shrink-0 tabular-nums">
              v{runtimeInfo.versionName} ({runtimeInfo.versionCode})
            </span>
          </div>

          <div className="py-3 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-[#159B61] dark:text-[#39D98A] mt-0.5 shrink-0" />
            <div>
              <div className="font-medium text-[#17221B] dark:text-[#F4F7F5]">Gizlilik</div>
              <p className="text-xs text-[#77827B] dark:text-[#929B95] mt-0.5 leading-relaxed">
                Maaş bilgileriniz ve tüm mesai kayıtlarınız yalnızca bu cihazın yerel deposunda (IndexedDB ve LocalStorage) saklanır; dış sunuculara gönderilmez.
              </p>
            </div>
          </div>
        </div>

        {updateCheckMessage && (
          <p className="text-xs font-medium text-[#159B61] dark:text-[#39D98A]">
            {updateCheckMessage}
          </p>
        )}

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            disabled={isCheckingUpdate}
            onClick={() => void handleCheckUpdate()}
            className="sm:flex-1 min-h-[44px] px-4 rounded-xl bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211] text-xs font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
            <span>
              {isCheckingUpdate
                ? 'Sürüm Kontrol Ediliyor...'
                : updateResult?.hasUpdate
                ? 'Yeni Güncellemeyi Görüntüle'
                : 'Güncellemeleri Denetle'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!confirmReset) {
                setConfirmReset(true);
                return;
              }
              void resetAllData();
            }}
            className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
              confirmReset
                ? 'bg-red-600 text-white'
                : 'bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-red-600 dark:text-red-400'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>
              {confirmReset ? 'Onayla: Tüm Verileri Sıfırla' : 'Tüm Verileri Sıfırla'}
            </span>
          </button>
        </div>
      </section>
    </div>
  );
};
