import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, Edit3, Plus, Trash2, X } from 'lucide-react';
import { MonthlyCalendarGrid } from '../components/MonthlyCalendarGrid';
import { useMesai } from '../context/MesaiContext';
import { WorkEntry } from '../types/mesai';
import {
  WORK_TYPE_LABELS,
  formatCurrency,
  formatDuration,
  formatMonthYear,
  formatTurkishDate,
  getTodayDateString,
  summarizeEntries,
} from '../utils/calculations';

export const CalendarPage: React.FC = () => {
  const { settings, entries, openNewEntryModal, openEditEntryModal, deleteEntry } = useMesai();

  const todayStr = getTodayDateString();
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const monthTitle = formatMonthYear(viewYear, viewMonth);

  const monthEntries = useMemo(
    () => entries.filter((e) => e.date.startsWith(monthPrefix)),
    [entries, monthPrefix]
  );

  const monthSummary = useMemo(() => summarizeEntries(monthEntries), [monthEntries]);
  const allTimeSummary = useMemo(() => summarizeEntries(entries), [entries]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, WorkEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.date) ?? [];
      list.push(entry);
      map.set(entry.date, list);
    }
    for (const [k, list] of map.entries()) {
      map.set(
        k,
        list.sort((a, b) => a.startTime.localeCompare(b.startTime))
      );
    }
    return map;
  }, [entries]);

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

  const selectedEntries = useMemo(
    () => entriesByDate.get(selectedDate) ?? [],
    [selectedDate, entriesByDate]
  );

  const selectedDayTotals = useMemo(() => {
    let net = 0;
    let ot = 0;
    let earnings = 0;
    for (const e of selectedEntries) {
      if (e.workType !== 'paid_leave' && e.workType !== 'unpaid_leave') {
        net += e.calculatedDurationMinutes;
        ot += e.overtimeDurationMinutes;
      }
      if (!e.isPlanned) {
        earnings += e.estimatedEarnings;
      }
    }
    return { net, ot, earnings };
  }, [selectedEntries]);

  const handleSelectDay = (dateStr: string) => {
    setSelectedDate(dateStr);
    setMobileSheetOpen(true);
  };

  const renderDetailContent = () => {
    if (!selectedDate) {
      return (
        <div className="py-12 text-center">
          <CalendarIcon className="w-8 h-8 mx-auto text-[#77827B] dark:text-[#929B95] mb-3" />
          <p className="text-sm font-medium text-[#17221B] dark:text-[#F4F7F5]">
            Detayları görmek için bir gün seç
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#17221B] dark:text-[#F4F7F5]">
              {formatTurkishDate(selectedDate, true)}
            </h3>
            <p className="text-xs text-[#77827B] dark:text-[#929B95] mt-0.5">
              {selectedEntries.length > 0
                ? `${selectedEntries.length} kayıt · Net ${formatDuration(selectedDayTotals.net)}`
                : 'Bu gün için kayıt bulunmuyor'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => openNewEntryModal(selectedDate)}
            className="min-h-[40px] px-3.5 rounded-xl bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Ekle</span>
          </button>
        </div>

        {selectedEntries.length > 0 && (
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] p-3.5">
            <div>
              <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">Net süre</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-[#17221B] dark:text-[#F4F7F5] tabular-nums">
                {formatDuration(selectedDayTotals.net)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">Fazla mesai</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-[#D97706] dark:text-[#F59E0B] tabular-nums">
                {formatDuration(selectedDayTotals.ot)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">Ek kazanç</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-[#159B61] dark:text-[#39D98A] tabular-nums">
                {selectedDayTotals.earnings > 0 ? '+' : ''}
                {formatCurrency(selectedDayTotals.earnings, settings.currency)}
              </p>
            </div>
          </div>
        )}

        {selectedEntries.length === 0 ? (
          <div className="rounded-2xl bg-[#EEF2EF]/60 dark:bg-[#222925]/60 p-6 text-center">
            <p className="text-xs text-[#77827B] dark:text-[#929B95]">
              Bu tarihe mesai, hafta sonu çalışması veya izin ekleyebilirsin.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl bg-[#EEF2EF]/70 dark:bg-[#222925]/70 p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-[#17221B] dark:text-[#F4F7F5]">
                      {WORK_TYPE_LABELS[entry.workType]}
                      {entry.overtimeRatePercent &&
                        entry.workType !== 'paid_leave' &&
                        entry.workType !== 'unpaid_leave' &&
                        ` (%${entry.overtimeRatePercent})`}
                      {entry.isPlanned && ' · Planlı'}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-[#77827B] dark:text-[#929B95] tabular-nums">
                      {entry.startTime} – {entry.endTime}
                      {entry.breakMinutes > 0 && ` · Mola ${entry.breakMinutes} dk`}
                    </div>
                  </div>
                  <div className="font-mono text-sm font-bold text-[#159B61] dark:text-[#39D98A] tabular-nums">
                    {entry.estimatedEarnings > 0 ? '+' : ''}
                    {formatCurrency(entry.estimatedEarnings, settings.currency)}
                  </div>
                </div>

                {entry.notes && (
                  <p className="text-xs text-[#77827B] dark:text-[#929B95]">
                    {entry.notes}
                  </p>
                )}

                <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between text-xs">
                  <span className="font-mono text-[#77827B] dark:text-[#929B95] tabular-nums">
                    Net {formatDuration(entry.calculatedDurationMinutes)}
                    {entry.overtimeDurationMinutes > 0 &&
                      ` · +${formatDuration(entry.overtimeDurationMinutes)} FM`}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditEntryModal(entry)}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#17221B] dark:text-[#F4F7F5] hover:bg-black/5 dark:hover:bg-white/5"
                      aria-label="Düzenle"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteEntry(entry.id)}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10"
                      aria-label="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
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

      {/* Toplam Kazanılan Para Kartı */}
      <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-black/[0.06] dark:border-white/[0.07] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-[#77827B] dark:text-[#929B95]">
            {monthTitle} Toplam Kazanılan Para
          </p>
          <span className="font-mono text-xs text-[#159B61] dark:text-[#39D98A] tabular-nums">
            {monthSummary.totalExtraEarnings > 0 ? '+' : ''}
            {formatCurrency(monthSummary.totalExtraEarnings, settings.currency)} mesai
          </span>
        </div>

        <div className="mt-2 font-display font-extrabold text-3xl sm:text-4xl leading-none tracking-tight text-[#17221B] dark:text-[#F4F7F5] tabular-nums">
          {formatCurrency(estimatedTotal, settings.currency)}
        </div>

        <div className="mt-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.06] grid grid-cols-3 gap-2.5 sm:gap-4">
          <div>
            <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">Sabit maaş</p>
            <p className="mt-0.5 font-mono text-sm sm:text-base font-bold text-[#17221B] dark:text-[#F4F7F5] tabular-nums truncate">
              {formatCurrency(settings.monthlySalary, settings.currency)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">Bu ay mesai</p>
            <p className="mt-0.5 font-mono text-sm sm:text-base font-bold text-[#159B61] dark:text-[#39D98A] tabular-nums truncate">
              {monthSummary.totalExtraEarnings > 0 ? '+' : ''}
              {formatCurrency(monthSummary.totalExtraEarnings, settings.currency)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">Tüm zamanlar ek</p>
            <p className="mt-0.5 font-mono text-sm sm:text-base font-bold text-[#D97706] dark:text-[#F59E0B] tabular-nums truncate">
              {allTimeSummary.totalExtraEarnings > 0 ? '+' : ''}
              {formatCurrency(allTimeSummary.totalExtraEarnings, settings.currency)}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7">
          <MonthlyCalendarGrid
            viewYear={viewYear}
            viewMonth={viewMonth}
            selectedDate={selectedDate}
            entries={entries}
            onSelectDate={handleSelectDay}
            onSelectedDayClick={(d) => openNewEntryModal(d)}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            onJumpToday={jumpToday}
            showEarningsInCells={true}
            currency={settings.currency}
          />
        </div>

        <aside className="hidden lg:block lg:col-span-5 rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-black/[0.06] dark:border-white/[0.07] p-6">
          {renderDetailContent()}
        </aside>
      </div>

      {mobileSheetOpen && selectedDate && (
        <div
          className="lg:hidden fixed inset-0 z-45 flex items-end bg-black/55 backdrop-blur-sm"
          onClick={() => setMobileSheetOpen(false)}
        >
          <div
            className="w-full max-h-[82vh] overflow-y-auto rounded-t-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border-t border-black/[0.06] dark:border-white/[0.08] p-5 pb-24"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-1.5 rounded-full bg-[#77827B]/30 dark:bg-[#929B95]/30 mx-auto" />
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                aria-label="Kapat"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-[#77827B] dark:text-[#929B95]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderDetailContent()}
          </div>
        </div>
      )}
    </div>
  );
};
