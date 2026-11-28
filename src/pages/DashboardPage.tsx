import React, { useMemo, useState } from 'react';
import { Moon, Settings as SettingsIcon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MesaiWordmark } from '../components/MesaiWordmark';
import { MonthlyCalendarGrid } from '../components/MonthlyCalendarGrid';
import { useMesai } from '../context/MesaiContext';
import { useResolvedDark } from '../hooks/useTheme';
import { formatTemplate } from '../i18n';
import {
  calculateHourlyRate,
  formatCurrency,
  formatDuration,
  formatMonthYear,
  getTodayDateString,
  summarizeEntries,
} from '../utils/calculations';

export const DashboardPage: React.FC = () => {
  const {
    settings,
    entries,
    openNewEntryModal,
    openEditEntryModal,
    requestDeleteEntry,
    updateSettings,
    language,
    t,
  } = useMesai();
  const isDark = useResolvedDark(settings.themeMode);

  const todayStr = getTodayDateString();
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const now = new Date();
  const isCurrentMonth =
    viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const monthTitle = formatMonthYear(viewYear, viewMonth, language);

  const monthEntries = useMemo(
    () => entries.filter((e) => e.date.startsWith(monthPrefix)),
    [entries, monthPrefix]
  );

  const monthSummary = useMemo(() => summarizeEntries(monthEntries), [monthEntries]);

  const handleToggleTheme = () => {
    void updateSettings({ themeMode: isDark ? 'light' : 'dark' });
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      const nextY = viewYear - 1;
      setViewYear(nextY);
      setViewMonth(11);
      setSelectedDate(`${nextY}-12-01`);
    } else {
      const nextM = viewMonth - 1;
      setViewMonth(nextM);
      setSelectedDate(`${viewYear}-${String(nextM + 1).padStart(2, '0')}-01`);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      const nextY = viewYear + 1;
      setViewYear(nextY);
      setViewMonth(0);
      setSelectedDate(`${nextY}-01-01`);
    } else {
      const nextM = viewMonth + 1;
      setViewMonth(nextM);
      setSelectedDate(`${viewYear}-${String(nextM + 1).padStart(2, '0')}-01`);
    }
  };

  const handleJumpToday = () => {
    const cur = new Date();
    setViewYear(cur.getFullYear());
    setViewMonth(cur.getMonth());
    setSelectedDate(todayStr);
  };

  const estimatedMonthlyTotal = settings.monthlySalary + monthSummary.totalExtraEarnings;
  const hourlyRate = calculateHourlyRate(settings);

  const extraSignedFormatted = `${
    monthSummary.totalExtraEarnings > 0 ? '+' : ''
  }${formatCurrency(monthSummary.totalExtraEarnings, settings.currency, 0, language)}`;
  const overtimeDurationText = formatDuration(monthSummary.overtimeMinutes, language);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Üst Karşılama Alanı */}
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <MesaiWordmark size="xs" className="shrink-0" />
            <span className="h-3 w-px bg-[#CBD5CF] dark:bg-white/[0.12] shrink-0" />
            <p className="text-xs font-medium text-[#77827B] dark:text-[#929B95] truncate">
              {monthTitle}
            </p>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#2A302D] dark:text-[#F5F3EE] tracking-tight truncate">
            {settings.userName
              ? formatTemplate(t.dashboard.helloNamed, { name: settings.userName })
              : t.dashboard.hello}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleTheme}
            aria-label={isDark ? t.dashboard.switchToLight : t.dashboard.switchToDark}
            title={isDark ? t.dashboard.lightThemeTitle : t.dashboard.darkThemeTitle}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] text-[#2A302D] dark:text-[#F5F3EE] hover:bg-[#EEF2EF] dark:hover:bg-[#222925] active:scale-95 transition-all"
          >
            {isDark ? (
              <Sun className="w-[18px] h-[18px]" />
            ) : (
              <Moon className="w-[18px] h-[18px]" />
            )}
          </button>

          <Link
            to="/ayarlar"
            aria-label={t.nav.settings}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] text-[#2A302D] dark:text-[#F5F3EE] hover:bg-[#EEF2EF] dark:hover:bg-[#222925] transition-colors"
          >
            <SettingsIcon className="w-[18px] h-[18px]" />
          </Link>
        </div>
      </header>

      {/* 1. Aylık Mesai Takvimi (En Üstte) */}
      <MonthlyCalendarGrid
        viewYear={viewYear}
        viewMonth={viewMonth}
        selectedDate={selectedDate}
        entries={entries}
        onSelectDate={setSelectedDate}
        onSelectedDayClick={(dateStr) => openNewEntryModal(dateStr)}
        onEditEntry={(entry) => openEditEntryModal(entry)}
        onDeleteEntry={(entry) => requestDeleteEntry(entry)}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onJumpToday={handleJumpToday}
        showHoursInCells={true}
        currency={settings.currency}
        overtimeMultiplier={settings.overtimeMultiplier}
        weekendMultiplier={settings.weekendMultiplier}
      />

      {/* 2. Bu Ayki Toplam Kazanç (Minimal & Premium) */}
      <section className="rounded-2xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] px-3.5 py-4 min-[360px]:px-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1.5">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-[#77827B] dark:text-[#929B95] truncate">
              {isCurrentMonth
                ? t.dashboard.thisMonthEarnings
                : formatTemplate(t.dashboard.periodEarnings, { month: monthTitle })}
              <span aria-hidden="true"> · </span>
              <span>{settings.salaryType === 'gross' ? t.common.gross : t.common.net}</span>
            </p>
            <div
              dir="ltr"
              className="mt-1 inline-block font-display font-extrabold text-[1.65rem] min-[360px]:text-[1.85rem] sm:text-[2.25rem] leading-none tracking-tight text-[#2A302D] dark:text-[#F5F3EE] tabular-nums whitespace-nowrap"
            >
              {formatCurrency(estimatedMonthlyTotal, settings.currency, 0, language)}
            </div>
          </div>

          <div className="text-end shrink-0 space-y-0.5 ms-auto">
            {monthSummary.totalExtraEarnings !== 0 ? (
              <p className="font-sans sm:font-mono text-xs sm:text-sm font-semibold text-[#159B61] dark:text-[#39D98A] tabular-nums whitespace-nowrap">
                {formatTemplate(t.dashboard.extraAmount, { amount: extraSignedFormatted })}
              </p>
            ) : (
              <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">
                {t.dashboard.fixedSalary}
              </p>
            )}
            <p className="font-sans sm:font-mono text-[11px] text-[#77827B] dark:text-[#929B95] tabular-nums whitespace-nowrap">
              {monthSummary.overtimeMinutes > 0 ? (
                formatTemplate(t.dashboard.overtimeMinutesLabel, {
                  duration: overtimeDurationText,
                })
              ) : (
                <span dir="ltr">
                  {formatCurrency(settings.monthlySalary, settings.currency, 0, language)}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Saatlik Ücretlerim (Kompakt Tek Satır — Kesilme Yok) */}
        <div className="mt-3.5 pt-3 border-t border-[#D7E0DA] dark:border-white/[0.06] grid grid-cols-3 gap-1.5 min-[360px]:gap-2.5 sm:gap-4">
          <div className="min-w-0">
            <p className="text-[10.5px] min-[360px]:text-[11px] text-[#77827B] dark:text-[#929B95] truncate">
              {t.dashboard.rateNormal}
            </p>
            <p
              dir="ltr"
              className="mt-0.5 font-sans sm:font-mono text-[11.5px] min-[360px]:text-xs sm:text-sm font-semibold text-[#2A302D] dark:text-[#F5F3EE] tabular-nums whitespace-nowrap"
            >
              {formatCurrency(hourlyRate, settings.currency, 2, language)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] min-[360px]:text-[11px] text-[#D97706] dark:text-[#F59E0B] font-medium truncate">
              {t.dashboard.rate50}
            </p>
            <p
              dir="ltr"
              className="mt-0.5 font-sans sm:font-mono text-[11.5px] min-[360px]:text-xs sm:text-sm font-semibold text-[#D97706] dark:text-[#F59E0B] tabular-nums whitespace-nowrap"
            >
              {formatCurrency(hourlyRate * 1.5, settings.currency, 2, language)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] min-[360px]:text-[11px] text-[#7C3AED] dark:text-[#A78BFA] font-medium truncate">
              {t.dashboard.rate100}
            </p>
            <p
              dir="ltr"
              className="mt-0.5 font-sans sm:font-mono text-[11.5px] min-[360px]:text-xs sm:text-sm font-semibold text-[#7C3AED] dark:text-[#A78BFA] tabular-nums whitespace-nowrap"
            >
              {formatCurrency(hourlyRate * 2, settings.currency, 2, language)}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Son Kazanç Özeti */}
      <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
            {t.dashboard.recentSummaryTitle}
          </h2>
          <Link
            to="/istatistik"
            className="text-xs font-semibold text-[#159B61] dark:text-[#39D98A] hover:opacity-80 whitespace-nowrap"
          >
            {t.dashboard.detailedAnalysis}
          </Link>
        </div>

        <div className="divide-y divide-[#D7E0DA] dark:divide-white/[0.06] text-xs min-[360px]:text-[13px] sm:text-sm">
          <div className="py-2.5 flex items-center justify-between gap-3">
            <span className="min-w-0 text-[#77827B] dark:text-[#929B95]">
              {t.dashboard.monthlyFixedSalary}
            </span>
            <span
              dir="ltr"
              className="shrink-0 whitespace-nowrap font-sans sm:font-mono font-semibold text-[#17221B] dark:text-[#F4F7F5] tabular-nums"
            >
              {formatCurrency(settings.monthlySalary, settings.currency, 0, language)}
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between gap-3">
            <span className="min-w-0 text-[#77827B] dark:text-[#929B95]">
              {formatTemplate(t.dashboard.overtimeEarningsLabel, {
                duration: overtimeDurationText,
              })}
            </span>
            <span
              dir="ltr"
              className="shrink-0 whitespace-nowrap font-sans sm:font-mono font-semibold text-[#D97706] dark:text-[#F59E0B] tabular-nums"
            >
              +{formatCurrency(monthSummary.overtimeEarnings, settings.currency, 0, language)}
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between gap-3">
            <span className="min-w-0 text-[#77827B] dark:text-[#929B95]">
              {t.dashboard.weekendHolidayEarnings}
            </span>
            <span
              dir="ltr"
              className="shrink-0 whitespace-nowrap font-sans sm:font-mono font-semibold text-[#159B61] dark:text-[#39D98A] tabular-nums"
            >
              +
              {formatCurrency(
                monthSummary.weekendAndHolidayEarnings,
                settings.currency,
                0,
                language
              )}
            </span>
          </div>

          {monthSummary.unpaidLeaveDeduction > 0 && (
            <div className="py-2.5 flex items-center justify-between gap-3">
              <span className="min-w-0 text-[#77827B] dark:text-[#929B95]">
                {t.dashboard.unpaidLeaveDeduction}
              </span>
              <span
                dir="ltr"
                className="shrink-0 whitespace-nowrap font-sans sm:font-mono font-semibold text-red-600 dark:text-red-400 tabular-nums"
              >
                -{formatCurrency(monthSummary.unpaidLeaveDeduction, settings.currency, 0, language)}
              </span>
            </div>
          )}

          <div className="pt-3 flex items-center justify-between gap-3">
            <span className="min-w-0 font-semibold text-[#17221B] dark:text-[#F4F7F5]">
              {formatTemplate(t.dashboard.estimatedTotalForMonth, { month: monthTitle })}
            </span>
            <span
              dir="ltr"
              className="shrink-0 whitespace-nowrap font-sans sm:font-mono text-base sm:text-lg font-bold text-[#159B61] dark:text-[#39D98A] tabular-nums"
            >
              {formatCurrency(estimatedMonthlyTotal, settings.currency, 0, language)}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
