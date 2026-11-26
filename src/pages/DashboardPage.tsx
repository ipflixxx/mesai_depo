import React, { useMemo, useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MesaiWordmark } from '../components/MesaiWordmark';
import { MonthlyCalendarGrid } from '../components/MonthlyCalendarGrid';
import { useMesai } from '../context/MesaiContext';
import {
  calculateHourlyRate,
  formatCurrency,
  formatDuration,
  formatMonthYear,
  getTodayDateString,
  summarizeEntries,
} from '../utils/calculations';

export const DashboardPage: React.FC = () => {
  const { settings, entries, openNewEntryModal } = useMesai();

  const todayStr = getTodayDateString();
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const now = new Date();
  const isCurrentMonth =
    viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const monthTitle = formatMonthYear(viewYear, viewMonth);

  const monthEntries = useMemo(
    () => entries.filter((e) => e.date.startsWith(monthPrefix)),
    [entries, monthPrefix]
  );

  const monthSummary = useMemo(() => summarizeEntries(monthEntries), [monthEntries]);

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

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Üst Karşılama Alanı */}
      <header className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2.5">
            <MesaiWordmark size="xs" className="shrink-0" />
            <span className="h-3 w-px bg-[#CBD5CF] dark:bg-white/[0.12] shrink-0" />
            <p className="text-xs font-medium text-[#77827B] dark:text-[#929B95] truncate">
              {monthTitle}
            </p>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#17221B] dark:text-[#F4F7F5] tracking-tight truncate">
            Merhaba{settings.userName ? `, ${settings.userName}` : ''}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/ayarlar"
            aria-label="Ayarlar"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] text-[#17221B] dark:text-[#F4F7F5] hover:bg-[#EEF2EF] dark:hover:bg-[#222925] transition-colors"
          >
            <SettingsIcon className="w-5 h-5" />
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
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onJumpToday={handleJumpToday}
        showHoursInCells={true}
        overtimeMultiplier={settings.overtimeMultiplier}
        weekendMultiplier={settings.weekendMultiplier}
      />

      {/* 2. Bu Ayki Toplam Kazanç Kartı (Hemen Tablonun Altında) */}
      <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-5 sm:p-7">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-[#77827B] dark:text-[#929B95]">
            {isCurrentMonth ? 'Bu Ayki Toplam Kazancım' : `${monthTitle} Kazancı`}
          </h2>
          <span className="text-xs text-[#77827B] dark:text-[#929B95]">
            {settings.salaryType === 'gross' ? 'Brüt' : 'Net'}
          </span>
        </div>

        <div className="mt-2.5 font-display font-extrabold text-4xl sm:text-[2.75rem] leading-none tracking-tight text-[#17221B] dark:text-[#F4F7F5] tabular-nums">
          {formatCurrency(estimatedMonthlyTotal, settings.currency)}
        </div>

        <p className="mt-2 text-xs text-[#77827B] dark:text-[#929B95]">
          Tahmini toplam kazanç
          {settings.salaryType === 'gross' && ' · Brüt tutar üzerinden (kesintiler hariç)'}
        </p>

        {/* Saatlik Ücretlerim */}
        <div className="mt-5 pt-4 border-t border-[#D7E0DA] dark:border-white/[0.06]">
          <p className="text-[11px] font-medium text-[#77827B] dark:text-[#929B95] mb-2.5">
            Saatlik Ücretlerim
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">Normal (1x)</p>
              <p className="mt-1 font-mono text-sm sm:text-base font-semibold text-[#17221B] dark:text-[#F4F7F5] tabular-nums truncate">
                {formatCurrency(hourlyRate, settings.currency, 2)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#D97706] dark:text-[#F59E0B] font-medium">
                %50 Mesai (1.5x)
              </p>
              <p className="mt-1 font-mono text-sm sm:text-base font-semibold text-[#D97706] dark:text-[#F59E0B] tabular-nums truncate">
                {formatCurrency(hourlyRate * 1.5, settings.currency, 2)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#7C3AED] dark:text-[#A78BFA] font-medium">
                %100 Mesai (2x)
              </p>
              <p className="mt-1 font-mono text-sm sm:text-base font-semibold text-[#7C3AED] dark:text-[#A78BFA] tabular-nums truncate">
                {formatCurrency(hourlyRate * 2, settings.currency, 2)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[#D7E0DA] dark:border-white/[0.06] grid grid-cols-3 gap-3">
          <div>
            <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">Sabit maaş</p>
            <p className="mt-1 font-mono text-sm sm:text-base font-semibold text-[#17221B] dark:text-[#F4F7F5] tabular-nums">
              {formatCurrency(settings.monthlySalary, settings.currency)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">Fazla mesai</p>
            <p className="mt-1 font-mono text-sm sm:text-base font-semibold text-[#D97706] dark:text-[#F59E0B] tabular-nums">
              +{formatCurrency(monthSummary.overtimeEarnings, settings.currency)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">Hafta sonu & tatil</p>
            <p className="mt-1 font-mono text-sm sm:text-base font-semibold text-[#159B61] dark:text-[#39D98A] tabular-nums">
              +{formatCurrency(monthSummary.weekendAndHolidayEarnings, settings.currency)}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[#D7E0DA] dark:border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">Toplam çalışma</p>
            <p className="mt-1 font-mono text-sm sm:text-base font-semibold text-[#17221B] dark:text-[#F4F7F5] tabular-nums">
              {formatDuration(monthSummary.totalMinutes)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">Fazla mesai saati</p>
            <p className="mt-1 font-mono text-sm sm:text-base font-semibold text-[#D97706] dark:text-[#F59E0B] tabular-nums">
              {formatDuration(monthSummary.overtimeMinutes)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">Çalışılan gün</p>
            <p className="mt-1 font-mono text-sm sm:text-base font-semibold text-[#17221B] dark:text-[#F4F7F5] tabular-nums">
              {monthSummary.workedDaysCount} gün
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">Ortalama günlük</p>
            <p className="mt-1 font-mono text-sm sm:text-base font-semibold text-[#17221B] dark:text-[#F4F7F5] tabular-nums">
              {formatDuration(monthSummary.averageDailyMinutes)}
            </p>
          </div>
        </div>
      </section>

      {/* 4. Son Kazanç Özeti */}
      <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
            Son Kazanç Özeti
          </h2>
          <Link
            to="/istatistik"
            className="text-xs font-semibold text-[#159B61] dark:text-[#39D98A] hover:opacity-80 whitespace-nowrap"
          >
            Detaylı Analiz
          </Link>
        </div>

        <div className="divide-y divide-[#D7E0DA] dark:divide-white/[0.06] text-sm">
          <div className="py-2.5 flex items-center justify-between gap-4">
            <span className="text-[#77827B] dark:text-[#929B95]">Aylık sabit maaş</span>
            <span className="font-mono font-semibold text-[#17221B] dark:text-[#F4F7F5] tabular-nums">
              {formatCurrency(settings.monthlySalary, settings.currency)}
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between gap-4">
            <span className="text-[#77827B] dark:text-[#929B95]">
              Fazla mesai kazancı ({formatDuration(monthSummary.overtimeMinutes)})
            </span>
            <span className="font-mono font-semibold text-[#D97706] dark:text-[#F59E0B] tabular-nums">
              +{formatCurrency(monthSummary.overtimeEarnings, settings.currency)}
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between gap-4">
            <span className="text-[#77827B] dark:text-[#929B95]">Hafta sonu & tatil kazancı</span>
            <span className="font-mono font-semibold text-[#159B61] dark:text-[#39D98A] tabular-nums">
              +{formatCurrency(monthSummary.weekendAndHolidayEarnings, settings.currency)}
            </span>
          </div>

          {monthSummary.unpaidLeaveDeduction > 0 && (
            <div className="py-2.5 flex items-center justify-between gap-4">
              <span className="text-[#77827B] dark:text-[#929B95]">Ücretsiz izin kesintisi</span>
              <span className="font-mono font-semibold text-red-600 dark:text-red-400 tabular-nums">
                -{formatCurrency(monthSummary.unpaidLeaveDeduction, settings.currency)}
              </span>
            </div>
          )}

          <div className="pt-3 flex items-center justify-between gap-4">
            <span className="font-semibold text-[#17221B] dark:text-[#F4F7F5]">
              {monthTitle} tahmini toplam
            </span>
            <span className="font-mono text-lg font-bold text-[#159B61] dark:text-[#39D98A] tabular-nums">
              {formatCurrency(estimatedMonthlyTotal, settings.currency)}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
