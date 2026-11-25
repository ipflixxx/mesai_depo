import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { MonthlyCalendarGrid } from '../components/MonthlyCalendarGrid';
import { useMesai } from '../context/MesaiContext';
import {
  formatCurrency,
  formatDuration,
  formatMonthYear,
  getTodayDateString,
  summarizeEntries,
} from '../utils/calculations';

export const CalendarPage: React.FC = () => {
  const { settings, entries, openNewEntryModal } = useMesai();

  const todayStr = getTodayDateString();
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const monthTitle = formatMonthYear(viewYear, viewMonth);

  const monthEntries = useMemo(
    () => entries.filter((e) => e.date.startsWith(monthPrefix)),
    [entries, monthPrefix]
  );

  const monthSummary = useMemo(() => summarizeEntries(monthEntries), [monthEntries]);
  const allTimeSummary = useMemo(() => summarizeEntries(entries), [entries]);

  // %50 ve %100 mesailerden gelen kazanç ve süre dağılımı (gerçekleşen kayıtlar)
  const overtimeRateBreakdown = useMemo(() => {
    let rate50Earnings = 0;
    let rate50Minutes = 0;
    let rate100Earnings = 0;
    let rate100Minutes = 0;

    for (const e of monthEntries) {
      if (e.isPlanned || e.date > todayStr) continue;
      if (e.workType === 'paid_leave' || e.workType === 'unpaid_leave') continue;
      if (e.estimatedEarnings <= 0 && e.overtimeDurationMinutes <= 0) continue;

      let percent: 50 | 100;
      if (e.overtimeRatePercent === 50 || e.overtimeRatePercent === 100) {
        percent = e.overtimeRatePercent;
      } else if (e.workType === 'weekend' || e.workType === 'holiday') {
        percent = settings.weekendMultiplier >= 2.0 ? 100 : 50;
      } else {
        percent = settings.overtimeMultiplier >= 2.0 ? 100 : 50;
      }

      if (percent === 100) {
        rate100Earnings += e.estimatedEarnings;
        rate100Minutes += e.overtimeDurationMinutes;
      } else {
        rate50Earnings += e.estimatedEarnings;
        rate50Minutes += e.overtimeDurationMinutes;
      }
    }

    return { rate50Earnings, rate50Minutes, rate100Earnings, rate100Minutes };
  }, [monthEntries, todayStr, settings.overtimeMultiplier, settings.weekendMultiplier]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const jumpToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(todayStr);
  };

  const estimatedTotal = settings.monthlySalary + monthSummary.totalExtraEarnings;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#17221B] dark:text-[#F4F7F5] tracking-tight">
            Kazanç
          </h1>
          <p className="text-xs text-[#77827B] dark:text-[#929B95]">
            {monthTitle} günlük ek kazanç ve mesai tablosu
          </p>
        </div>

        <button
          type="button"
          onClick={() => openNewEntryModal(selectedDate)}
          className="min-h-[44px] px-4 rounded-2xl bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Mesai Ekle</span>
        </button>
      </header>

      {/* 1. En Üstte Takvim Tablosu */}
      <MonthlyCalendarGrid
        viewYear={viewYear}
        viewMonth={viewMonth}
        selectedDate={selectedDate}
        entries={entries}
        onSelectDate={setSelectedDate}
        onSelectedDayClick={(d) => openNewEntryModal(d)}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        onJumpToday={jumpToday}
        showEarningsInCells={true}
        currency={settings.currency}
      />

      {/* 2. Takvimin Altında Kazanılan Para ve %50 / %100 Mesai Dağılımı */}
      <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-black/[0.06] dark:border-white/[0.07] p-5 sm:p-6 space-y-5">
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-[#77827B] dark:text-[#929B95]">
              {monthTitle} Kazanılan Para
            </p>
            <span className="font-mono text-xs text-[#77827B] dark:text-[#929B95] tabular-nums">
              Sabit maaş {formatCurrency(settings.monthlySalary, settings.currency)}
            </span>
          </div>

          <div className="mt-2 font-display font-extrabold text-3xl sm:text-4xl leading-none tracking-tight text-[#17221B] dark:text-[#F4F7F5] tabular-nums">
            {formatCurrency(estimatedTotal, settings.currency)}
          </div>
        </div>

        {/* %50 ve %100 Mesailerden Gelen Para */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] p-4">
            <p className="text-xs font-medium text-[#77827B] dark:text-[#929B95]">
              %50 Mesailerden Gelen
            </p>
            <p className="mt-1.5 font-display text-lg sm:text-xl font-extrabold text-[#159B61] dark:text-[#39D98A] tabular-nums truncate">
              {overtimeRateBreakdown.rate50Earnings > 0 ? '+' : ''}
              {formatCurrency(overtimeRateBreakdown.rate50Earnings, settings.currency)}
            </p>
            <p className="mt-1 font-mono text-[11px] text-[#77827B] dark:text-[#929B95] tabular-nums">
              {formatDuration(overtimeRateBreakdown.rate50Minutes)} fazla mesai
            </p>
          </div>

          <div className="rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] p-4">
            <p className="text-xs font-medium text-[#77827B] dark:text-[#929B95]">
              %100 Mesailerden Gelen
            </p>
            <p className="mt-1.5 font-display text-lg sm:text-xl font-extrabold text-[#D97706] dark:text-[#F59E0B] tabular-nums truncate">
              {overtimeRateBreakdown.rate100Earnings > 0 ? '+' : ''}
              {formatCurrency(overtimeRateBreakdown.rate100Earnings, settings.currency)}
            </p>
            <p className="mt-1 font-mono text-[11px] text-[#77827B] dark:text-[#929B95] tabular-nums">
              {formatDuration(overtimeRateBreakdown.rate100Minutes)} fazla mesai
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-3 text-xs">
          <span className="text-[#77827B] dark:text-[#929B95]">
            Bu ay toplam ek mesai
          </span>
          <span className="font-mono font-bold text-[#159B61] dark:text-[#39D98A] tabular-nums">
            {monthSummary.totalExtraEarnings > 0 ? '+' : ''}
            {formatCurrency(monthSummary.totalExtraEarnings, settings.currency)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-[#77827B] dark:text-[#929B95]">
            Tüm zamanlar toplam ek kazanç
          </span>
          <span className="font-mono font-bold text-[#17221B] dark:text-[#F4F7F5] tabular-nums">
            {allTimeSummary.totalExtraEarnings > 0 ? '+' : ''}
            {formatCurrency(allTimeSummary.totalExtraEarnings, settings.currency)}
          </span>
        </div>
      </section>
    </div>
  );
};
