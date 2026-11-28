import React, { useMemo, useState } from 'react';
import { Briefcase, CalendarCheck, Clock, TrendingUp } from 'lucide-react';
import { NumericInput, parseLocaleNumber } from '../components/NumericInput';
import { useMesai } from '../context/MesaiContext';
import { formatTemplate } from '../i18n';
import { formatCurrency } from '../utils/calculations';

type CalcTab = 'raise' | 'severance' | 'overtime' | 'leave';

const RAISE_PRESETS = [15, 25, 30, 40, 50];

function getDefaultDates(): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const startDt = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  return { start: startDt.toISOString().slice(0, 10), end };
}

export const CalculatorsPage: React.FC = () => {
  const { settings, language, t } = useMesai();
  const [activeTab, setActiveTab] = useState<CalcTab>('raise');

  // 1. Zam Hesaplama State
  const [raiseMode, setRaiseMode] = useState<'percent' | 'target'>('percent');
  const [currentSalary, setCurrentSalary] = useState<string>(
    settings.monthlySalary > 0 ? String(settings.monthlySalary) : '35000'
  );
  const [raisePercent, setRaisePercent] = useState<string>('30');
  const [targetSalary, setTargetSalary] = useState<string>(
    settings.monthlySalary > 0 ? String(Math.round(settings.monthlySalary * 1.3)) : '45500'
  );

  // 2. Tazminat Hesaplama State
  const defaultDates = useMemo(() => getDefaultDates(), []);
  const [hireDate, setHireDate] = useState<string>(defaultDates.start);
  const [exitDate, setExitDate] = useState<string>(defaultDates.end);
  const [grossSalary, setGrossSalary] = useState<string>(
    settings.monthlySalary > 0 ? String(settings.monthlySalary) : '40000'
  );
  const [monthlyBenefits, setMonthlyBenefits] = useState<string>('0');
  const [includeNotice, setIncludeNotice] = useState<boolean>(true);

  // 3. Mesai Simülatörü State
  const [simSalary, setSimSalary] = useState<string>(
    settings.monthlySalary > 0 ? String(settings.monthlySalary) : '35000'
  );
  const [simWeeklyHours, setSimWeeklyHours] = useState<string>(
    String(settings.weeklyWorkHours || 45)
  );
  const [simHours, setSimHours] = useState<string>('4');
  const [simRate, setSimRate] = useState<50 | 100>(50);

  // 4. Yıllık İzin Hesaplama State
  const [tenureYears, setTenureYears] = useState<string>('3');
  const [unusedLeaveDays, setUnusedLeaveDays] = useState<string>('5');
  const [leaveSalary, setLeaveSalary] = useState<string>(
    settings.monthlySalary > 0 ? String(settings.monthlySalary) : '35000'
  );

  // Zam Calculations
  const raiseResult = useMemo(() => {
    const base = Math.max(0, parseLocaleNumber(currentSalary) ?? 0);
    const weeklyHrs = settings.weeklyWorkHours > 0 ? settings.weeklyWorkHours : 45;
    const monthlyHrs = (weeklyHrs * 52) / 12;

    if (raiseMode === 'percent') {
      const pct = parseLocaleNumber(raisePercent) ?? 0;
      const newSalary = base * (1 + pct / 100);
      const diff = newSalary - base;
      return {
        newSalary,
        diff,
        annualDiff: diff * 12,
        percent: pct,
        newHourly: monthlyHrs > 0 ? newSalary / monthlyHrs : 0,
      };
    } else {
      const target = Math.max(0, parseLocaleNumber(targetSalary) ?? 0);
      const diff = target - base;
      const pct = base > 0 ? (diff / base) * 100 : 0;
      return {
        newSalary: target,
        diff,
        annualDiff: diff * 12,
        percent: pct,
        newHourly: monthlyHrs > 0 ? target / monthlyHrs : 0,
      };
    }
  }, [raiseMode, currentSalary, raisePercent, targetSalary, settings.weeklyWorkHours]);

  // Tazminat Calculations
  const severanceResult = useMemo(() => {
    const startMs = Date.parse(hireDate);
    const endMs = Date.parse(exitDate);
    const validDates = !Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs >= startMs;
    const totalDays = validDates ? Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)) : 0;

    const yearsFloat = totalDays / 365;
    const fullYears = Math.floor(totalDays / 365);
    const remDaysAfterYears = totalDays % 365;
    const months = Math.floor(remDaysAfterYears / 30);
    const days = remDaysAfterYears % 30;

    const baseGross = Math.max(0, parseLocaleNumber(grossSalary) ?? 0);
    const benefits = Math.max(0, parseLocaleNumber(monthlyBenefits) ?? 0);
    const dressedGross = baseGross + benefits;

    // Kıdem tazminatı yalnızca 1 yıl (365 gün) ve üzeri çalışmalarda doğar
    const eligibleForSeverance = totalDays >= 365;
    const grossSeverance = eligibleForSeverance ? dressedGross * yearsFloat : 0;
    const stampTax = grossSeverance * 0.00759;
    const netSeverance = grossSeverance - stampTax;

    // İhbar süresi (4857 Sayılı İş Kanunu md. 17)
    let noticeWeeks = 2;
    if (totalDays >= 365 * 3) noticeWeeks = 8;
    else if (totalDays >= 540) noticeWeeks = 6;
    else if (totalDays >= 180) noticeWeeks = 4;

    const noticeDays = noticeWeeks * 7;
    const dailyGross = dressedGross / 30;
    const grossNotice = includeNotice && validDates && totalDays > 0 ? dailyGross * noticeDays : 0;

    return {
      validDates,
      totalDays,
      fullYears,
      months,
      days,
      dressedGross,
      eligibleForSeverance,
      grossSeverance,
      stampTax,
      netSeverance,
      noticeWeeks,
      noticeDays,
      grossNotice,
      totalEstimate: netSeverance + grossNotice,
    };
  }, [hireDate, exitDate, grossSalary, monthlyBenefits, includeNotice]);

  // Mesai Simülatörü Calculations
  const overtimeSimResult = useMemo(() => {
    const sal = Math.max(0, parseLocaleNumber(simSalary) ?? 0);
    const wk = Math.max(1, parseLocaleNumber(simWeeklyHours) ?? 45);
    const hrs = Math.max(0, parseLocaleNumber(simHours) ?? 0);
    const monthlyHours = (wk * 52) / 12;
    const hourly = monthlyHours > 0 ? sal / monthlyHours : 0;
    const mult = simRate === 100 ? 2.0 : 1.5;
    const total = hourly * mult * hrs;
    return { hourly, mult, total };
  }, [simSalary, simWeeklyHours, simHours, simRate]);

  // Yıllık İzin Calculations
  const leaveResult = useMemo(() => {
    const yrs = Math.max(0, parseLocaleNumber(tenureYears) ?? 0);
    let entitledDays = 0;
    if (yrs >= 15) entitledDays = 26;
    else if (yrs > 5) entitledDays = 20;
    else if (yrs >= 1) entitledDays = 14;

    const sal = Math.max(0, parseLocaleNumber(leaveSalary) ?? 0);
    const dailyPay = sal / 30;
    const unused = Math.max(0, parseLocaleNumber(unusedLeaveDays) ?? 0);
    const payout = dailyPay * unused;
    return { entitledDays, dailyPay, payout };
  }, [tenureYears, unusedLeaveDays, leaveSalary]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-[#17221B] dark:text-[#F4F7F5] tracking-tight">
          {t.calculators.title}
        </h1>
        <p className="text-xs text-[#77827B] dark:text-[#929B95]">
          {t.calculators.subtitle}
        </p>
      </header>

      {/* Calculator Category Selector */}
      <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08]">
        {(
          [
            { id: 'raise', label: t.calculators.tabRaise, icon: TrendingUp },
            { id: 'severance', label: t.calculators.tabSeverance, icon: Briefcase },
            { id: 'overtime', label: t.calculators.tabOvertime, icon: Clock },
            { id: 'leave', label: t.calculators.tabLeave, icon: CalendarCheck },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[42px] px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211]'
                  : 'text-[#77827B] dark:text-[#929B95] hover:text-[#17221B] dark:hover:text-[#F4F7F5]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0 hidden sm:block" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. ZAM HESAPLAMA */}
      {activeTab === 'raise' && (
        <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#17221B] dark:text-[#F4F7F5]">
                {t.calculators.raiseTitle}
              </h2>
              <p className="text-xs text-[#77827B] dark:text-[#929B95]">
                {t.calculators.raiseDesc}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] sm:w-56">
              <button
                type="button"
                onClick={() => setRaiseMode('percent')}
                className={`min-h-[34px] rounded-lg text-xs font-medium transition-colors ${
                  raiseMode === 'percent'
                    ? 'bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5]'
                    : 'text-[#77827B] dark:text-[#929B95]'
                }`}
              >
                {t.calculators.raiseModePercent}
              </button>
              <button
                type="button"
                onClick={() => setRaiseMode('target')}
                className={`min-h-[34px] rounded-lg text-xs font-medium transition-colors ${
                  raiseMode === 'target'
                    ? 'bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5]'
                    : 'text-[#77827B] dark:text-[#929B95]'
                }`}
              >
                {t.calculators.raiseModeTarget}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                {formatTemplate(t.calculators.currentMonthlySalary, {
                  currency: settings.currency,
                })}
              </label>
              <NumericInput
                allowDecimal
                value={currentSalary}
                onChange={setCurrentSalary}
                placeholder="35000"
                className="w-full min-h-[46px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-base font-bold text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
              />
            </div>

            {raiseMode === 'percent' ? (
              <div>
                <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  {t.calculators.raisePercentLabel}
                </label>
                <NumericInput
                  allowDecimal
                  value={raisePercent}
                  onChange={setRaisePercent}
                  placeholder="30"
                  className="w-full min-h-[46px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-base font-bold text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  {formatTemplate(t.calculators.targetSalaryLabel, {
                    currency: settings.currency,
                  })}
                </label>
                <NumericInput
                  allowDecimal
                  value={targetSalary}
                  onChange={setTargetSalary}
                  placeholder="45500"
                  className="w-full min-h-[46px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-base font-bold text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                />
              </div>
            )}
          </div>

          {raiseMode === 'percent' && (
            <div className="grid grid-cols-5 gap-1.5">
              {RAISE_PRESETS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setRaisePercent(String(pct))}
                  dir="ltr"
                  className={`min-h-[38px] rounded-xl font-mono text-xs font-semibold transition-colors ${
                    Number(raisePercent) === pct
                      ? 'bg-[#17221B] dark:bg-[#F4F7F5] text-white dark:text-[#101211]'
                      : 'bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5]'
                  }`}
                >
                  {language === 'tr' ? `%${pct}` : `${pct}%`}
                </button>
              ))}
            </div>
          )}

          {/* Result */}
          <div className="rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[#77827B] dark:text-[#929B95]">
                  {t.calculators.newMonthlySalary}
                </p>
                <p
                  dir="ltr"
                  className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-[#159B61] dark:text-[#39D98A] tabular-nums"
                >
                  {formatCurrency(raiseResult.newSalary, settings.currency, 0, language)}
                </p>
              </div>
              <div className="text-end">
                <p className="text-xs text-[#77827B] dark:text-[#929B95]">
                  {t.calculators.raiseRateResult}
                </p>
                <p
                  dir="ltr"
                  className="mt-1 font-mono text-lg font-bold text-[#17221B] dark:text-[#F4F7F5] tabular-nums"
                >
                  {language === 'tr'
                    ? `%${raiseResult.percent.toFixed(1)}`
                    : `${raiseResult.percent.toFixed(1)}%`}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#CFD8D2] dark:border-white/[0.06] grid grid-cols-3 gap-3">
              <div>
                <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">
                  {t.calculators.monthlyDiff}
                </p>
                <p
                  dir="ltr"
                  className="mt-0.5 font-mono text-sm font-bold text-[#159B61] dark:text-[#39D98A] tabular-nums"
                >
                  {raiseResult.diff >= 0 ? '+' : ''}
                  {formatCurrency(raiseResult.diff, settings.currency, 0, language)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">
                  {t.calculators.annualDiff}
                </p>
                <p
                  dir="ltr"
                  className="mt-0.5 font-mono text-sm font-bold text-[#17221B] dark:text-[#F4F7F5] tabular-nums"
                >
                  {raiseResult.annualDiff >= 0 ? '+' : ''}
                  {formatCurrency(raiseResult.annualDiff, settings.currency, 0, language)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">
                  {t.calculators.newHourly}
                </p>
                <p
                  dir="ltr"
                  className="mt-0.5 font-mono text-sm font-bold text-[#17221B] dark:text-[#F4F7F5] tabular-nums"
                >
                  {formatCurrency(raiseResult.newHourly, settings.currency, 2, language)}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. TAZMİNAT HESAPLAMA (KIDEM & İHBAR) */}
      {activeTab === 'severance' && (
        <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-[#17221B] dark:text-[#F4F7F5]">
              {t.calculators.severanceTitle}
            </h2>
            <p className="text-xs text-[#77827B] dark:text-[#929B95]">
              {t.calculators.severanceDesc}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                {t.calculators.hireDate}
              </label>
              <input
                type="date"
                dir="ltr"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                {t.calculators.exitDate}
              </label>
              <input
                type="date"
                dir="ltr"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                {formatTemplate(t.calculators.monthlyGrossSalary, {
                  currency: settings.currency,
                })}
              </label>
              <NumericInput
                allowDecimal
                value={grossSalary}
                onChange={setGrossSalary}
                placeholder="40000"
                className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-base font-bold text-[#17221B] dark:text-[#F4F7F5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                {t.calculators.monthlyBenefits}
              </label>
              <NumericInput
                allowDecimal
                value={monthlyBenefits}
                onChange={setMonthlyBenefits}
                placeholder="0"
                className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-base font-bold text-[#17221B] dark:text-[#F4F7F5]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-[#EEF2EF]/75 dark:bg-[#222925]/60 border border-[#CFD8D2] dark:border-white/[0.07] px-4 py-3">
            <span className="text-xs font-medium text-[#17221B] dark:text-[#F4F7F5]">
              {t.calculators.includeNoticeLabel}
            </span>
            <button
              type="button"
              onClick={() => setIncludeNotice((v) => !v)}
              className={`min-h-[34px] px-3.5 rounded-xl text-xs font-semibold transition-colors ${
                includeNotice
                  ? 'bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211]'
                  : 'bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CFD8D2] dark:border-white/[0.07] text-[#77827B] dark:text-[#929B95]'
              }`}
            >
              {includeNotice ? t.calculators.included : t.calculators.excluded}
            </button>
          </div>

          {/* Results */}
          <div className="rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[#77827B] dark:text-[#929B95]">
                  {t.calculators.estimatedTotalSeverance}
                </p>
                <p
                  dir="ltr"
                  className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-[#159B61] dark:text-[#39D98A] tabular-nums"
                >
                  {formatCurrency(severanceResult.totalEstimate, settings.currency, 0, language)}
                </p>
              </div>
              <div className="text-end">
                <p className="text-xs text-[#77827B] dark:text-[#929B95]">
                  {t.calculators.workDuration}
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-[#17221B] dark:text-[#F4F7F5] tabular-nums">
                  {severanceResult.validDates
                    ? formatTemplate(t.calculators.durationFormat, {
                        years: severanceResult.fullYears,
                        months: severanceResult.months,
                        days: severanceResult.days,
                      })
                    : t.calculators.invalidDate}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#CFD8D2] dark:border-white/[0.06] space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#77827B] dark:text-[#929B95]">
                  {t.calculators.netSeveranceLabel}
                </span>
                <span
                  dir="ltr"
                  className="font-mono font-bold text-[#17221B] dark:text-[#F4F7F5] tabular-nums shrink-0"
                >
                  {severanceResult.eligibleForSeverance
                    ? formatCurrency(severanceResult.netSeverance, settings.currency, 0, language)
                    : t.calculators.underOneYear}
                </span>
              </div>

              {includeNotice && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#77827B] dark:text-[#929B95]">
                    {formatTemplate(t.calculators.grossNoticeLabel, {
                      weeks: severanceResult.noticeWeeks,
                      days: severanceResult.noticeDays,
                    })}
                  </span>
                  <span
                    dir="ltr"
                    className="font-mono font-bold text-[#17221B] dark:text-[#F4F7F5] tabular-nums shrink-0"
                  >
                    {formatCurrency(severanceResult.grossNotice, settings.currency, 0, language)}
                  </span>
                </div>
              )}

              <p className="pt-1 text-[11px] text-[#77827B] dark:text-[#929B95] leading-relaxed">
                {t.calculators.severanceNote}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 3. MESAİ ÜCRETİ SİMÜLATÖRÜ */}
      {activeTab === 'overtime' && (
        <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-[#17221B] dark:text-[#F4F7F5]">
              {t.calculators.overtimeTitle}
            </h2>
            <p className="text-xs text-[#77827B] dark:text-[#929B95]">
              {t.calculators.overtimeDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                {formatTemplate(t.calculators.monthlySalaryLabel, {
                  currency: settings.currency,
                })}
              </label>
              <NumericInput
                allowDecimal
                value={simSalary}
                onChange={setSimSalary}
                placeholder="35000"
                className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm font-bold text-[#17221B] dark:text-[#F4F7F5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                {t.calculators.weeklyNormalHours}
              </label>
              <NumericInput
                allowDecimal
                value={simWeeklyHours}
                onChange={setSimWeeklyHours}
                placeholder="40"
                className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm font-bold text-[#17221B] dark:text-[#F4F7F5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                {t.calculators.overtimeHoursLabel}
              </label>
              <NumericInput
                allowDecimal
                value={simHours}
                onChange={setSimHours}
                placeholder="4"
                className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm font-bold text-[#17221B] dark:text-[#F4F7F5]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSimRate(50)}
              dir="ltr"
              className={`min-h-[44px] rounded-2xl font-semibold text-sm transition-colors ${
                simRate === 50
                  ? 'bg-[#D97706] dark:bg-[#F59E0B] text-white dark:text-[#101211]'
                  : 'bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5]'
              }`}
            >
              {language === 'tr' ? '%50 (1.5x)' : '50% (1.5x)'}
            </button>
            <button
              type="button"
              onClick={() => setSimRate(100)}
              dir="ltr"
              className={`min-h-[44px] rounded-2xl font-semibold text-sm transition-colors ${
                simRate === 100
                  ? 'bg-[#7C3AED] dark:bg-[#A78BFA] text-white dark:text-[#101211]'
                  : 'bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5]'
              }`}
            >
              {language === 'tr' ? '%100 (2.0x)' : '100% (2.0x)'}
            </button>
          </div>

          <div className="rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-[#77827B] dark:text-[#929B95]">
                {t.calculators.earnedOvertimeAmount}
              </p>
              <p
                dir="ltr"
                className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-[#159B61] dark:text-[#39D98A] tabular-nums"
              >
                +{formatCurrency(overtimeSimResult.total, settings.currency, 0, language)}
              </p>
            </div>
            <div className="text-end">
              <p className="text-xs text-[#77827B] dark:text-[#929B95]">
                {t.calculators.normalHourly}
              </p>
              <p
                dir="ltr"
                className="mt-1 font-mono text-sm font-bold text-[#17221B] dark:text-[#F4F7F5] tabular-nums"
              >
                {formatCurrency(overtimeSimResult.hourly, settings.currency, 2, language)}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 4. YILLIK İZİN HESAPLAMA */}
      {activeTab === 'leave' && (
        <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-[#17221B] dark:text-[#F4F7F5]">
              {t.calculators.leaveTitle}
            </h2>
            <p className="text-xs text-[#77827B] dark:text-[#929B95]">
              {t.calculators.leaveDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                {t.calculators.tenureYears}
              </label>
              <NumericInput
                allowDecimal
                value={tenureYears}
                onChange={setTenureYears}
                placeholder="3"
                className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm font-bold text-[#17221B] dark:text-[#F4F7F5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                {t.calculators.unusedLeaveDays}
              </label>
              <NumericInput
                allowDecimal
                value={unusedLeaveDays}
                onChange={setUnusedLeaveDays}
                placeholder="5"
                className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm font-bold text-[#17221B] dark:text-[#F4F7F5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                {formatTemplate(t.calculators.monthlySalaryLabel, {
                  currency: settings.currency,
                })}
              </label>
              <NumericInput
                allowDecimal
                value={leaveSalary}
                onChange={setLeaveSalary}
                placeholder="35000"
                className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 font-mono text-sm font-bold text-[#17221B] dark:text-[#F4F7F5]"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] p-5 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#77827B] dark:text-[#929B95]">
                  {t.calculators.annualLeaveEntitlement}
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold text-[#17221B] dark:text-[#F4F7F5] tabular-nums">
                  {leaveResult.entitledDays} {t.common.workDaysUnit}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#77827B] dark:text-[#929B95]">
                  {t.calculators.unusedLeavePayout}
                </p>
                <p
                  dir="ltr"
                  className="mt-1 font-display text-2xl font-extrabold text-[#159B61] dark:text-[#39D98A] tabular-nums"
                >
                  {formatCurrency(leaveResult.payout, settings.currency, 0, language)}
                </p>
              </div>
            </div>
            <p className="pt-2 border-t border-[#CFD8D2] dark:border-white/[0.06] text-[11px] text-[#77827B] dark:text-[#929B95]">
              {t.calculators.leaveNote}
            </p>
          </div>
        </section>
      )}
    </div>
  );
};
