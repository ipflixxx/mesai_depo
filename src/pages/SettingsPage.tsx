import React, { useRef, useState } from 'react';
import {
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  Globe,
  Megaphone,
  Moon,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sun,
  Upload,
} from 'lucide-react';
import { MesaiAlarmSection } from '../components/MesaiAlarmSection';
import { MesaiWordmark } from '../components/MesaiWordmark';
import { NumericInput, parseLocaleNumber } from '../components/NumericInput';
import { useMesai } from '../context/MesaiContext';
import { AppLanguage, SUPPORTED_LANGUAGES, formatTemplate } from '../i18n';
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
    language,
    t,
    setLanguage,
  } = useMesai();

  const [form, setForm] = useState(settings);
  const [numericDrafts, setNumericDrafts] = useState(() => ({
    monthlySalary: settings.monthlySalary > 0 ? String(settings.monthlySalary) : '',
    paymentDay: String(settings.paymentDay),
    weeklyWorkDays: String(settings.weeklyWorkDays),
    dailyWorkHours: String(settings.dailyWorkHours),
    weeklyWorkHours: String(settings.weeklyWorkHours),
    breakMinutes: String(settings.breakMinutes),
    overtimeMultiplier: String(settings.overtimeMultiplier),
    weekendMultiplier: String(settings.weekendMultiplier),
  }));
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [updateCheckMessage, setUpdateCheckMessage] = useState<string | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const setDraft = (key: keyof typeof numericDrafts, value: string) => {
    setSaveError(null);
    setNumericDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveProfileAndWork = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSavedNotice(null);

    const parsedSalary = parseLocaleNumber(numericDrafts.monthlySalary);
    const parsedPayDay = parseLocaleNumber(numericDrafts.paymentDay);
    const parsedDays = parseLocaleNumber(numericDrafts.weeklyWorkDays);
    const parsedDaily = parseLocaleNumber(numericDrafts.dailyWorkHours);
    const parsedWeekly = parseLocaleNumber(numericDrafts.weeklyWorkHours);
    const parsedBreak = parseLocaleNumber(numericDrafts.breakMinutes);
    const parsedOt = parseLocaleNumber(numericDrafts.overtimeMultiplier);
    const parsedWk = parseLocaleNumber(numericDrafts.weekendMultiplier);

    if (parsedSalary === null || parsedSalary < 0) {
      setSaveError(t.settings.errors.invalidSalary);
      return;
    }
    if (
      parsedPayDay === null ||
      !Number.isInteger(parsedPayDay) ||
      parsedPayDay < 1 ||
      parsedPayDay > 31
    ) {
      setSaveError(t.settings.errors.paymentDayRange);
      return;
    }
    if (parsedDays === null || !Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 7) {
      setSaveError(t.settings.errors.weeklyDaysRange);
      return;
    }
    if (parsedDaily === null || parsedDaily < 1 || parsedDaily > 24) {
      setSaveError(t.settings.errors.dailyHoursRange);
      return;
    }
    if (parsedWeekly === null || parsedWeekly < 1 || parsedWeekly > 100) {
      setSaveError(t.settings.errors.weeklyHoursRange);
      return;
    }
    if (parsedBreak === null || parsedBreak < 0 || parsedBreak > 240) {
      setSaveError(t.settings.errors.breakRange);
      return;
    }
    if (parsedOt === null || parsedOt < 1) {
      setSaveError(t.settings.errors.otMultiplierMin);
      return;
    }
    if (parsedWk === null || parsedWk < 1) {
      setSaveError(t.settings.errors.wkMultiplierMin);
      return;
    }

    await updateSettings({
      ...form,
      language: settings.language,
      themeMode: settings.themeMode,
      alarm: settings.alarm,
      monthlySalary: parsedSalary,
      paymentDay: parsedPayDay,
      weeklyWorkDays: parsedDays,
      dailyWorkHours: parsedDaily,
      weeklyWorkHours: parsedWeekly,
      breakMinutes: Math.round(parsedBreak),
      overtimeMultiplier: parsedOt,
      weekendMultiplier: parsedWk,
    });
    setSavedNotice(t.settings.savedSuccess);
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const handleThemeChange = async (mode: ThemeMode) => {
    setForm((prev) => ({ ...prev, themeMode: mode }));
    await updateSettings({ themeMode: mode });
  };

  const handleLanguageChange = async (nextLang: AppLanguage) => {
    setForm((prev) => ({ ...prev, language: nextLang }));
    await setLanguage(nextLang);
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const { settings: nextSettings, entries: nextEntries } = parseAndValidateBackup(
        text,
        language
      );
      await restoreBackup(nextSettings, nextEntries);
      setForm(nextSettings);
      setNumericDrafts({
        monthlySalary:
          nextSettings.monthlySalary > 0 ? String(nextSettings.monthlySalary) : '',
        paymentDay: String(nextSettings.paymentDay),
        weeklyWorkDays: String(nextSettings.weeklyWorkDays),
        dailyWorkHours: String(nextSettings.dailyWorkHours),
        weeklyWorkHours: String(nextSettings.weeklyWorkHours),
        breakMinutes: String(nextSettings.breakMinutes),
        overtimeMultiplier: String(nextSettings.overtimeMultiplier),
        weekendMultiplier: String(nextSettings.weekendMultiplier),
      });
      setRestoreStatus({
        type: 'success',
        message: formatTemplate(t.settings.restoreSuccess, { count: nextEntries.length }),
      });
    } catch (err) {
      setRestoreStatus({
        type: 'error',
        message: err instanceof Error ? err.message : t.settings.restoreFailed,
      });
    } finally {
      e.target.value = '';
    }
  };

  const handlePDFReport = () => {
    const now = new Date();
    exportMonthlyPDFReport(entries, settings, now.getFullYear(), now.getMonth(), language);
  };

  const handleCheckUpdate = async () => {
    setUpdateCheckMessage(null);
    const res = await checkForUpdates(false);
    if (res.hasUpdate) {
      setUpdateCheckMessage(
        res.manifest
          ? formatTemplate(t.settings.newVersionFound, { version: res.manifest.versionName })
          : t.settings.playUpdateAvailable
      );
      openUpdateModal();
    } else if (res.error) {
      setUpdateCheckMessage(res.error);
    } else {
      setUpdateCheckMessage(
        formatTemplate(t.settings.upToDate, { version: res.currentVersionName })
      );
    }
  };

  const hourlyRate = calculateHourlyRate({
    ...form,
    monthlySalary: parseLocaleNumber(numericDrafts.monthlySalary) ?? 0,
    weeklyWorkHours: parseLocaleNumber(numericDrafts.weeklyWorkHours) ?? form.weeklyWorkHours,
    dailyWorkHours: parseLocaleNumber(numericDrafts.dailyWorkHours) ?? form.dailyWorkHours,
    weeklyWorkDays: parseLocaleNumber(numericDrafts.weeklyWorkDays) ?? form.weeklyWorkDays,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-[#17221B] dark:text-[#F4F7F5] tracking-tight">
          {t.settings.title}
        </h1>
        <p className="text-xs text-[#77827B] dark:text-[#929B95]">
          {t.settings.subtitle}
        </p>
      </header>

      {/* Dil Seçimi */}
      <section
        aria-label={t.settings.languageTitle}
        className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-4 sm:p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#159B61] dark:text-[#39D98A] shrink-0" />
              <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
                {t.settings.languageTitle}
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#77827B] dark:text-[#929B95] leading-relaxed">
              {t.settings.languageDesc}
            </p>
          </div>
          {!settings.language && (
            <span className="shrink-0 rounded-xl bg-[#159B61]/10 dark:bg-[#39D98A]/12 px-2.5 py-1 text-[11px] font-semibold text-[#159B61] dark:text-[#39D98A]">
              {t.settings.languageSystemAuto}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {SUPPORTED_LANGUAGES.map((langMeta) => {
            const active = language === langMeta.code;
            return (
              <button
                key={langMeta.code}
                type="button"
                aria-pressed={active}
                onClick={() => void handleLanguageChange(langMeta.code)}
                className={`min-h-[46px] rounded-2xl px-3 py-2 border flex items-center justify-between gap-2 text-start transition-colors ${
                  active
                    ? 'border-[#159B61] dark:border-[#39D98A] bg-[#159B61]/10 dark:bg-[#39D98A]/12 text-[#159B61] dark:text-[#39D98A]'
                    : 'border-[#CFD8D2] dark:border-white/[0.07] bg-[#EEF2EF]/75 dark:bg-[#222925]/60 text-[#17221B] dark:text-[#F4F7F5] hover:bg-[#EEF2EF] dark:hover:bg-[#222925]'
                }`}
              >
                <span className="text-xs font-semibold truncate">{langMeta.nativeName}</span>
                {active && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </section>

      <MesaiAlarmSection />

      <form onSubmit={handleSaveProfileAndWork} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Kişisel Bilgiler */}
          <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
                {t.settings.personalInfo}
              </h2>
              <span
                dir="ltr"
                className="font-mono text-xs text-[#159B61] dark:text-[#39D98A] tabular-nums"
              >
                {formatTemplate(t.settings.perHour, {
                  amount: formatCurrency(hourlyRate, form.currency, 2, language),
                })}
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                {t.settings.userName}
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
                  {t.settings.monthlySalary}
                </label>
                <NumericInput
                  allowDecimal
                  value={numericDrafts.monthlySalary}
                  onChange={(v) => setDraft('monthlySalary', v)}
                  placeholder={t.onboarding.salaryPlaceholder}
                  className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm font-semibold text-[#17221B] dark:text-[#F4F7F5] placeholder:text-[#77827B]/60 dark:placeholder:text-[#929B95]/60 focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  {t.settings.salaryType}
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
                      {type === 'net' ? t.common.net : t.common.gross}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  {t.settings.currency}
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
                  {t.settings.paymentDay}
                </label>
                <NumericInput
                  value={numericDrafts.paymentDay}
                  onChange={(v) => setDraft('paymentDay', v)}
                  placeholder="15"
                  className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5] placeholder:text-[#77827B]/60 dark:placeholder:text-[#929B95]/60 focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                />
              </div>
            </div>
          </section>

          {/* Çalışma Düzeni */}
          <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
              {t.settings.workSchedule}
            </h2>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  {t.settings.weeklyDays}
                </label>
                <NumericInput
                  value={numericDrafts.weeklyWorkDays}
                  onChange={(v) => setDraft('weeklyWorkDays', v)}
                  placeholder="5"
                  className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  {t.settings.dailyHours}
                </label>
                <NumericInput
                  allowDecimal
                  value={numericDrafts.dailyWorkHours}
                  onChange={(v) => setDraft('dailyWorkHours', v)}
                  placeholder="8"
                  className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  {t.settings.weeklyHours}
                </label>
                <NumericInput
                  allowDecimal
                  value={numericDrafts.weeklyWorkHours}
                  onChange={(v) => setDraft('weeklyWorkHours', v)}
                  placeholder="40"
                  className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  {t.settings.start}
                </label>
                <input
                  type="time"
                  dir="ltr"
                  value={form.workStartTime}
                  onChange={(e) => setForm({ ...form, workStartTime: e.target.value })}
                  className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-2.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  {t.settings.end}
                </label>
                <input
                  type="time"
                  dir="ltr"
                  value={form.workEndTime}
                  onChange={(e) => setForm({ ...form, workEndTime: e.target.value })}
                  className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-2.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  {t.settings.breakMin}
                </label>
                <NumericInput
                  value={numericDrafts.breakMinutes}
                  onChange={(v) => setDraft('breakMinutes', v)}
                  placeholder="60"
                  className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  {t.settings.otMultiplier}
                </label>
                <NumericInput
                  allowDecimal
                  value={numericDrafts.overtimeMultiplier}
                  onChange={(v) => setDraft('overtimeMultiplier', v)}
                  placeholder="1.5"
                  className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  {t.settings.wkMultiplier}
                </label>
                <NumericInput
                  allowDecimal
                  value={numericDrafts.weekendMultiplier}
                  onChange={(v) => setDraft('weekendMultiplier', v)}
                  placeholder="2.0"
                  className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                {t.settings.otCalcBasis}
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07]">
                {(
                  [
                    { id: 'daily', label: t.settings.dailyTarget },
                    { id: 'weekly', label: t.settings.weeklyTarget },
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
          {saveError ? (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">{saveError}</p>
          ) : savedNotice ? (
            <div className="flex items-center gap-2 text-xs font-medium text-[#159B61] dark:text-[#39D98A]">
              <Check className="w-4 h-4" />
              <span>{savedNotice}</span>
            </div>
          ) : (
            <span className="text-xs text-[#77827B] dark:text-[#929B95]">
              {t.settings.autoRecalcNote}
            </span>
          )}
          <button
            type="submit"
            className="min-h-[46px] px-6 rounded-2xl bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211] font-semibold text-sm transition-transform active:scale-[0.98] whitespace-nowrap"
          >
            {t.settings.saveInfoBtn}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Görünüm */}
        <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
            {t.settings.appearance}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'dark', label: t.settings.themeDark, icon: Moon },
                { id: 'light', label: t.settings.themeLight, icon: Sun },
                { id: 'system', label: t.settings.themeSystem, icon: Smartphone },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const active = settings.themeMode === opt.id;
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
            {t.settings.dataManagement}
          </h2>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => exportEntriesToCSV(entries, settings, language)}
              className="min-h-[46px] px-3.5 rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-xs font-semibold text-[#17221B] dark:text-[#F4F7F5] flex items-center justify-center gap-2 hover:opacity-90"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#159B61] dark:text-[#39D98A] shrink-0" />
              <span>{t.settings.exportCsv}</span>
            </button>

            <button
              type="button"
              onClick={handlePDFReport}
              className="min-h-[46px] px-3.5 rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-xs font-semibold text-[#17221B] dark:text-[#F4F7F5] flex items-center justify-center gap-2 hover:opacity-90"
            >
              <FileText className="w-4 h-4 text-[#159B61] dark:text-[#39D98A] shrink-0" />
              <span>{t.settings.pdfReport}</span>
            </button>

            <button
              type="button"
              onClick={() => exportJSONBackup(settings, entries)}
              className="min-h-[46px] px-3.5 rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-xs font-semibold text-[#17221B] dark:text-[#F4F7F5] flex items-center justify-center gap-2 hover:opacity-90"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>{t.settings.jsonBackup}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[46px] px-3.5 rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-xs font-semibold text-[#17221B] dark:text-[#F4F7F5] flex items-center justify-center gap-2 hover:opacity-90"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span>{t.settings.jsonRestore}</span>
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
            {t.settings.appSection}
          </h2>
          <MesaiWordmark size="xs" />
        </div>

        <div className="divide-y divide-[#D7E0DA] dark:divide-white/[0.06] text-sm">
          <div className="py-3 flex items-start justify-between gap-4">
            <div>
              <div className="font-medium text-[#17221B] dark:text-[#F4F7F5]">
                {t.settings.aboutTitle}
              </div>
              <p className="text-xs text-[#77827B] dark:text-[#929B95] mt-0.5">
                {runtimeInfo.channel === 'play' ? t.settings.aboutPlay : t.settings.aboutDirect}
              </p>
            </div>
            <span
              dir="ltr"
              className="font-mono text-xs text-[#77827B] dark:text-[#929B95] shrink-0 tabular-nums"
            >
              v{runtimeInfo.versionName} ({runtimeInfo.versionCode})
            </span>
          </div>

          <div className="py-3 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-[#159B61] dark:text-[#39D98A] mt-0.5 shrink-0" />
            <div>
              <div className="font-medium text-[#17221B] dark:text-[#F4F7F5]">
                {t.settings.privacyTitle}
              </div>
              <p className="text-xs text-[#77827B] dark:text-[#929B95] mt-0.5 leading-relaxed">
                {t.settings.privacyBody}
              </p>
            </div>
          </div>

          <div className="py-3 flex items-start gap-3">
            <Megaphone className="w-4 h-4 text-[#77827B] dark:text-[#929B95] mt-0.5 shrink-0" />
            <div>
              <div className="font-medium text-[#17221B] dark:text-[#F4F7F5]">
                {t.settings.adsTitle}
              </div>
              <p className="text-xs text-[#77827B] dark:text-[#929B95] mt-0.5 leading-relaxed">
                {t.settings.adsBody}
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
                ? t.settings.checkingVersion
                : updateResult?.hasUpdate
                ? t.settings.viewNewUpdate
                : t.settings.checkUpdates}
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
              {confirmReset ? t.settings.confirmReset : t.settings.resetAllData}
            </span>
          </button>
        </div>
      </section>
    </div>
  );
};
