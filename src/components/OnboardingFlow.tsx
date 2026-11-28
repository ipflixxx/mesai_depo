import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Moon, Smartphone, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMesai } from '../context/MesaiContext';
import { MesaiWordmark } from './MesaiWordmark';
import { NumericInput, parseLocaleNumber } from './NumericInput';
import { AppLanguage, SUPPORTED_LANGUAGES, formatTemplate } from '../i18n';
import { CurrencyCode, SalaryType, ThemeMode, UserSettings } from '../types/mesai';
import {
  DEFAULT_SETTINGS,
  calculateHourlyRate,
  formatCurrency,
} from '../utils/calculations';

const TOTAL_STEPS = 4;

export const OnboardingFlow: React.FC = () => {
  const { settings, completeOnboarding, updateSettings, language, isRtl, t, setLanguage } =
    useMesai();
  const [step, setStep] = useState<number>(1);
  const [isDone, setIsDone] = useState<boolean>(false);

  const [form, setForm] = useState<UserSettings>({
    ...DEFAULT_SETTINGS,
    ...settings,
    currency: settings.currency || 'TRY',
    overtimeMultiplier: settings.overtimeMultiplier || 1.5,
    weekendMultiplier: settings.weekendMultiplier || 2.0,
    themeMode: settings.themeMode || 'dark',
  });
  const [salaryText, setSalaryText] = useState<string>(
    form.monthlySalary > 0 ? String(form.monthlySalary) : ''
  );
  const [paymentDayText, setPaymentDayText] = useState<string>(String(form.paymentDay));
  const [weeklyWorkDaysText, setWeeklyWorkDaysText] = useState<string>(
    String(form.weeklyWorkDays)
  );
  const [dailyWorkHoursText, setDailyWorkHoursText] = useState<string>(
    String(form.dailyWorkHours)
  );
  const [weeklyWorkHoursText, setWeeklyWorkHoursText] = useState<string>(
    String(form.weeklyWorkHours)
  );
  const [breakMinutesText, setBreakMinutesText] = useState<string>(
    String(form.breakMinutes)
  );
  const [overtimeMultiplierText, setOvertimeMultiplierText] = useState<string>(
    String(form.overtimeMultiplier)
  );
  const [weekendMultiplierText, setWeekendMultiplierText] = useState<string>(
    String(form.weekendMultiplier)
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.__mesaiHandleAndroidBack = () => {
      if (isDone) {
        setIsDone(false);
        return 'handled';
      }
      if (step > 1) {
        setError(null);
        setStep((s) => s - 1);
        return 'handled';
      }
      return 'exit';
    };
    return () => {
      delete window.__mesaiHandleAndroidBack;
    };
  }, [isDone, step]);

  const handleThemeSelect = (mode: ThemeMode) => {
    setForm((prev) => ({ ...prev, themeMode: mode }));
    void updateSettings({ themeMode: mode });
  };

  const handleDailyHoursTextChange = (val: string) => {
    setDailyWorkHoursText(val);
    const d = parseLocaleNumber(val);
    const days = parseLocaleNumber(weeklyWorkDaysText);
    if (d !== null && d > 0 && days !== null && days > 0) {
      setWeeklyWorkHoursText(String(Number((d * days).toFixed(1))));
    }
  };

  const handleWeeklyDaysTextChange = (val: string) => {
    setWeeklyWorkDaysText(val);
    const days = parseLocaleNumber(val);
    const d = parseLocaleNumber(dailyWorkHoursText);
    if (d !== null && d > 0 && days !== null && days > 0) {
      setWeeklyWorkHoursText(String(Number((d * days).toFixed(1))));
    }
  };

  const validateAndNext = () => {
    setError(null);
    if (step === 1) {
      const parsedSalary = parseLocaleNumber(salaryText);
      const parsedPayDay = parseLocaleNumber(paymentDayText);
      if (!form.userName.trim()) {
        setError(t.onboarding.errors.nameRequired);
        return;
      }
      if (parsedSalary === null || parsedSalary <= 0) {
        setError(t.onboarding.errors.salaryRequired);
        return;
      }
      if (
        parsedPayDay === null ||
        !Number.isInteger(parsedPayDay) ||
        parsedPayDay < 1 ||
        parsedPayDay > 31
      ) {
        setError(t.onboarding.errors.paymentDayRange);
        return;
      }
      setForm((prev) => ({
        ...prev,
        monthlySalary: parsedSalary,
        paymentDay: parsedPayDay,
      }));
    }

    if (step === 2) {
      const parsedDays = parseLocaleNumber(weeklyWorkDaysText);
      const parsedDaily = parseLocaleNumber(dailyWorkHoursText);
      const parsedWeekly = parseLocaleNumber(weeklyWorkHoursText);
      const parsedBreak = parseLocaleNumber(breakMinutesText);

      if (parsedDays === null || !Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 7) {
        setError(t.onboarding.errors.weeklyDaysRange);
        return;
      }
      if (parsedDaily === null || parsedDaily < 1 || parsedDaily > 24) {
        setError(t.onboarding.errors.dailyHoursRange);
        return;
      }
      if (parsedWeekly === null || parsedWeekly < 1 || parsedWeekly > 100) {
        setError(t.onboarding.errors.weeklyHoursRange);
        return;
      }
      if (parsedBreak === null || parsedBreak < 0 || parsedBreak > 240) {
        setError(t.onboarding.errors.breakRange);
        return;
      }

      setForm((prev) => ({
        ...prev,
        weeklyWorkDays: parsedDays,
        dailyWorkHours: parsedDaily,
        weeklyWorkHours: parsedWeekly,
        breakMinutes: Math.round(parsedBreak),
      }));
    }

    if (step === 3) {
      const parsedOt = parseLocaleNumber(overtimeMultiplierText);
      const parsedWk = parseLocaleNumber(weekendMultiplierText);

      if (parsedOt === null || parsedOt < 1) {
        setError(t.onboarding.errors.otMultiplierMin);
        return;
      }
      if (parsedWk === null || parsedWk < 1) {
        setError(t.onboarding.errors.wkMultiplierMin);
        return;
      }

      setForm((prev) => ({
        ...prev,
        overtimeMultiplier: parsedOt,
        weekendMultiplier: parsedWk,
      }));
    }

    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      setIsDone(true);
    }
  };

  const handleFinish = async () => {
    const parsedSalary = parseLocaleNumber(salaryText) ?? form.monthlySalary;
    await completeOnboarding({
      ...form,
      language: settings.language,
      monthlySalary: parsedSalary,
      onboardingCompleted: true,
    });
  };

  const hourlyPreview = calculateHourlyRate({
    ...form,
    monthlySalary: parseLocaleNumber(salaryText) ?? form.monthlySalary,
    weeklyWorkHours: parseLocaleNumber(weeklyWorkHoursText) ?? form.weeklyWorkHours,
    dailyWorkHours: parseLocaleNumber(dailyWorkHoursText) ?? form.dailyWorkHours,
    weeklyWorkDays: parseLocaleNumber(weeklyWorkDaysText) ?? form.weeklyWorkDays,
  });

  if (isDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F8F6] dark:bg-[#101211] px-4 py-8 pt-safe pb-safe">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-7 text-center"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#159B61]/12 dark:bg-[#39D98A]/15 flex items-center justify-center mb-5">
            <Check className="w-7 h-7 text-[#159B61] dark:text-[#39D98A]" />
          </div>
          <h1 className="text-2xl font-bold text-[#17221B] dark:text-[#F4F7F5] tracking-tight">
            {t.onboarding.doneTitle}
          </h1>
          <p className="mt-2 text-sm text-[#77827B] dark:text-[#929B95] leading-relaxed">
            {t.onboarding.doneSubtitle}
          </p>

          <div className="mt-6 rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] p-4 text-start space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[#77827B] dark:text-[#929B95]">
              <span>{t.onboarding.doneMonthlySalary}</span>
              <span
                dir="ltr"
                className="font-mono font-semibold text-[#17221B] dark:text-[#F4F7F5] tabular-nums"
              >
                {formatCurrency(
                  parseLocaleNumber(salaryText) ?? form.monthlySalary,
                  form.currency,
                  0,
                  language
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#77827B] dark:text-[#929B95]">
              <span>{t.onboarding.doneHourlyRate}</span>
              <span
                dir="ltr"
                className="font-mono font-semibold text-[#159B61] dark:text-[#39D98A] tabular-nums"
              >
                {formatCurrency(hourlyPreview, form.currency, 2, language)} / {t.common.hoursShort}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#77827B] dark:text-[#929B95]">
              <span>{t.onboarding.doneOvertimeMultiplier}</span>
              <span
                dir="ltr"
                className="font-mono font-semibold text-[#17221B] dark:text-[#F4F7F5] tabular-nums"
              >
                {form.overtimeMultiplier}x
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="mt-6 w-full min-h-[48px] rounded-2xl bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211] font-semibold text-sm tracking-tight transition-transform active:scale-[0.98]"
          >
            {t.onboarding.goHome}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F6F8F6] dark:bg-[#101211] px-4 py-6 sm:py-10 pt-safe pb-safe">
      <div className="w-full max-w-lg mx-auto">
        {/* Brand, Language Switcher & Progress */}
        <div className="flex items-center justify-between gap-2 mb-8">
          <MesaiWordmark size="sm" />
          <div className="flex items-center gap-2.5">
            <select
              aria-label={t.onboarding.languageLabel}
              value={language}
              onChange={(e) => void setLanguage(e.target.value as AppLanguage)}
              className="min-h-[34px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-2.5 text-xs font-medium text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
            >
              {SUPPORTED_LANGUAGES.map((langMeta) => (
                <option key={langMeta.code} value={langMeta.code}>
                  {langMeta.nativeName}
                </option>
              ))}
            </select>
            <span className="font-mono text-xs text-[#77827B] dark:text-[#929B95] tabular-nums whitespace-nowrap">
              {formatTemplate(t.onboarding.stepOf, { step, total: TOTAL_STEPS })}
            </span>
          </div>
        </div>

        {/* Hero Heading */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#17221B] dark:text-[#F4F7F5] tracking-tight text-balance">
            {t.onboarding.heroTitle}
          </h1>
          <p className="mt-2 text-sm text-[#77827B] dark:text-[#929B95]">
            {t.onboarding.heroSubtitle}
          </p>
        </div>

        {/* Step Progress Bars */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-colors duration-200 ${
                idx <= step
                  ? 'bg-[#159B61] dark:bg-[#39D98A]'
                  : 'bg-[#EEF2EF] dark:bg-[#222925]'
              }`}
            />
          ))}
        </div>

        {/* Step Card */}
        <div className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-5 sm:p-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: isRtl ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRtl ? 10 : -10 }}
              transition={{ duration: 0.18 }}
              className="space-y-5"
            >
              {step === 1 && (
                <>
                  <div>
                    <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
                      {t.onboarding.step1Title}
                    </h2>
                    <p className="text-xs text-[#77827B] dark:text-[#929B95] mt-0.5">
                      {t.onboarding.step1Subtitle}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                        {t.onboarding.yourName}
                      </label>
                      <input
                        type="text"
                        value={form.userName}
                        onChange={(e) => setForm({ ...form, userName: e.target.value })}
                        placeholder={t.onboarding.namePlaceholder}
                        className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 text-sm text-[#17221B] dark:text-[#F4F7F5] placeholder:text-[#77827B]/60 dark:placeholder:text-[#929B95]/60 focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                        {t.onboarding.monthlySalary}
                      </label>
                      <NumericInput
                        allowDecimal
                        value={salaryText}
                        onChange={setSalaryText}
                        placeholder={t.onboarding.salaryPlaceholder}
                        className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-base font-semibold text-[#17221B] dark:text-[#F4F7F5] placeholder:text-[#77827B]/60 dark:placeholder:text-[#929B95]/60 focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                          {t.onboarding.salaryType}
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

                      <div>
                        <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                          {t.onboarding.currency}
                        </label>
                        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07]">
                          {(['TRY', 'USD', 'EUR'] as CurrencyCode[]).map((cur) => (
                            <button
                              key={cur}
                              type="button"
                              onClick={() => setForm({ ...form, currency: cur })}
                              className={`min-h-[36px] rounded-lg text-xs font-mono font-medium transition-colors ${
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
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                        {t.onboarding.paymentDay}
                      </label>
                      <NumericInput
                        value={paymentDayText}
                        onChange={setPaymentDayText}
                        placeholder="15"
                        className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5] placeholder:text-[#77827B]/60 dark:placeholder:text-[#929B95]/60 focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                      />
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
                      {t.onboarding.step2Title}
                    </h2>
                    <p className="text-xs text-[#77827B] dark:text-[#929B95] mt-0.5">
                      {t.onboarding.step2Subtitle}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                          {t.onboarding.weeklyWorkDays}
                        </label>
                        <NumericInput
                          value={weeklyWorkDaysText}
                          onChange={handleWeeklyDaysTextChange}
                          placeholder="5"
                          className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5] placeholder:text-[#77827B]/60 dark:placeholder:text-[#929B95]/60 focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                          {t.onboarding.dailyWorkHours}
                        </label>
                        <NumericInput
                          allowDecimal
                          value={dailyWorkHoursText}
                          onChange={handleDailyHoursTextChange}
                          placeholder="8"
                          className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5] placeholder:text-[#77827B]/60 dark:placeholder:text-[#929B95]/60 focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                        {t.onboarding.weeklyNormalHours}
                      </label>
                      <NumericInput
                        allowDecimal
                        value={weeklyWorkHoursText}
                        onChange={setWeeklyWorkHoursText}
                        placeholder="40"
                        className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5] placeholder:text-[#77827B]/60 dark:placeholder:text-[#929B95]/60 focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                          {t.onboarding.workStart}
                        </label>
                        <input
                          type="time"
                          dir="ltr"
                          value={form.workStartTime}
                          onChange={(e) =>
                            setForm({ ...form, workStartTime: e.target.value })
                          }
                          className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                          {t.onboarding.workEnd}
                        </label>
                        <input
                          type="time"
                          dir="ltr"
                          value={form.workEndTime}
                          onChange={(e) =>
                            setForm({ ...form, workEndTime: e.target.value })
                          }
                          className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                        {t.onboarding.dailyBreakMinutes}
                      </label>
                      <NumericInput
                        value={breakMinutesText}
                        onChange={setBreakMinutesText}
                        placeholder="60"
                        className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5] placeholder:text-[#77827B]/60 dark:placeholder:text-[#929B95]/60 focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                      />
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div>
                    <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
                      {t.onboarding.step3Title}
                    </h2>
                    <p className="text-xs text-[#77827B] dark:text-[#929B95] mt-0.5">
                      {t.onboarding.step3Subtitle}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                        {t.onboarding.overtimeMultiplier}
                      </label>
                      <div className="flex gap-2">
                        {[1.25, 1.5, 2.0].map((val) => {
                          const parsedOt = parseLocaleNumber(overtimeMultiplierText);
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setOvertimeMultiplierText(String(val))}
                              dir="ltr"
                              className={`flex-1 min-h-[44px] rounded-xl font-mono text-sm font-medium transition-colors ${
                                parsedOt === val
                                  ? 'bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211]'
                                  : 'bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5]'
                              }`}
                            >
                              {val}x
                            </button>
                          );
                        })}
                        <NumericInput
                          allowDecimal
                          value={overtimeMultiplierText}
                          onChange={setOvertimeMultiplierText}
                          placeholder="1.5"
                          className="w-20 min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3 text-center font-mono text-sm text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                        {t.onboarding.weekendMultiplier}
                      </label>
                      <div className="flex gap-2">
                        {[1.5, 2.0, 2.5].map((val) => {
                          const parsedWk = parseLocaleNumber(weekendMultiplierText);
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setWeekendMultiplierText(String(val))}
                              dir="ltr"
                              className={`flex-1 min-h-[44px] rounded-xl font-mono text-sm font-medium transition-colors ${
                                parsedWk === val
                                  ? 'bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211]'
                                  : 'bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5]'
                              }`}
                            >
                              {val}x
                            </button>
                          );
                        })}
                        <NumericInput
                          allowDecimal
                          value={weekendMultiplierText}
                          onChange={setWeekendMultiplierText}
                          placeholder="2.0"
                          className="w-20 min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3 text-center font-mono text-sm text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                        {t.onboarding.overtimeCalcMode}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setForm({ ...form, overtimeCalculationMode: 'daily' })
                          }
                          className={`min-h-[44px] rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                            form.overtimeCalculationMode === 'daily'
                              ? 'bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211]'
                              : 'bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5]'
                          }`}
                        >
                          {formatTemplate(t.onboarding.dailyTarget, {
                            hours: parseLocaleNumber(dailyWorkHoursText) ?? form.dailyWorkHours,
                          })}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({ ...form, overtimeCalculationMode: 'weekly' })
                          }
                          className={`min-h-[44px] rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                            form.overtimeCalculationMode === 'weekly'
                              ? 'bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211]'
                              : 'bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5]'
                          }`}
                        >
                          {formatTemplate(t.onboarding.weeklyTarget, {
                            hours: parseLocaleNumber(weeklyWorkHoursText) ?? form.weeklyWorkHours,
                          })}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <div>
                    <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
                      {t.onboarding.step4Title}
                    </h2>
                    <p className="text-xs text-[#77827B] dark:text-[#929B95] mt-0.5">
                      {t.onboarding.step4Subtitle}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {(
                      [
                        {
                          id: 'dark',
                          label: t.onboarding.themeDark,
                          desc: t.onboarding.themeDarkDesc,
                          icon: Moon,
                        },
                        {
                          id: 'light',
                          label: t.onboarding.themeLight,
                          desc: t.onboarding.themeLightDesc,
                          icon: Sun,
                        },
                        {
                          id: 'system',
                          label: t.onboarding.themeSystem,
                          desc: t.onboarding.themeSystemDesc,
                          icon: Smartphone,
                        },
                      ] as const
                    ).map((opt) => {
                      const Icon = opt.icon;
                      const active = form.themeMode === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleThemeSelect(opt.id)}
                          className={`w-full min-h-[60px] flex items-center justify-between rounded-2xl p-4 border text-start transition-colors ${
                            active
                              ? 'border-[#159B61] dark:border-[#39D98A] bg-[#159B61]/8 dark:bg-[#39D98A]/10'
                              : 'border-[#CFD8D2] dark:border-white/[0.07] bg-[#EEF2EF]/75 dark:bg-[#222925]/60'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                active
                                  ? 'bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211]'
                                  : 'bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CFD8D2] dark:border-white/[0.07] text-[#77827B] dark:text-[#929B95]'
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-[#17221B] dark:text-[#F4F7F5]">
                                {opt.label}
                              </div>
                              <div className="text-xs text-[#77827B] dark:text-[#929B95]">
                                {opt.desc}
                              </div>
                            </div>
                          </div>
                          {active && (
                            <Check className="w-5 h-5 text-[#159B61] dark:text-[#39D98A] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {error && (
            <p className="mt-4 text-xs font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {/* Action Bar */}
          <div className="mt-7 flex items-center gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep((s) => s - 1);
                }}
                className="min-h-[48px] px-4 rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5] text-sm font-medium flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                <span>{t.common.back}</span>
              </button>
            )}
            <button
              type="button"
              onClick={validateAndNext}
              className="flex-1 min-h-[48px] px-5 rounded-2xl bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211] text-sm font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
            >
              <span>{step === TOTAL_STEPS ? t.onboarding.finishSetup : t.common.continueBtn}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-[#77827B] dark:text-[#929B95]">
        {t.onboarding.tagline}
      </p>
    </div>
  );
};
