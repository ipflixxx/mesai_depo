import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { CurrencyCode, WorkEntry } from '../types/mesai';
import {
  formatCompactCurrency,
  formatMonthYear,
  getTodayDateString,
} from '../utils/calculations';

const WEEKDAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

interface MonthlyCalendarGridProps {
  viewYear: number;
  viewMonth: number; // 0-indexed
  selectedDate: string;
  entries: WorkEntry[];
  onSelectDate: (dateStr: string) => void;
  onSelectedDayClick?: (dateStr: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onJumpToday: () => void;
  showEarningsInCells?: boolean;
  currency?: CurrencyCode;
}

export const MonthlyCalendarGrid: React.FC<MonthlyCalendarGridProps> = ({
  viewYear,
  viewMonth,
  selectedDate,
  entries,
  onSelectDate,
  onSelectedDayClick,
  onPrevMonth,
  onNextMonth,
  onJumpToday,
  showEarningsInCells = false,
  currency = 'TRY',
}) => {
  const todayStr = getTodayDateString();

  const entriesByDate = useMemo(() => {
    const map = new Map<string, WorkEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.date) ?? [];
      list.push(entry);
      map.set(entry.date, list);
    }
    return map;
  }, [entries]);

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: Array<{ dateStr: string | null; dayNum: number | null }> = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ dateStr: null, dayNum: null });
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, dayNum: d });
    }
    return cells;
  }, [viewYear, viewMonth]);

  return (
    <section
      aria-label="Aylık mesai takvimi"
      className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-black/[0.06] dark:border-white/[0.07] p-3.5 sm:p-6"
    >
      {/* Month & Navigation */}
      <div className="flex items-center justify-between gap-2 mb-4 sm:mb-5">
        <h2 className="text-base sm:text-lg font-bold text-[#17221B] dark:text-[#F4F7F5] truncate">
          {formatMonthYear(viewYear, viewMonth)}
        </h2>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onJumpToday}
            className="min-h-[38px] px-3 rounded-xl bg-[#EEF2EF] dark:bg-[#222925] text-xs font-medium text-[#17221B] dark:text-[#F4F7F5] hover:opacity-85 transition-opacity whitespace-nowrap"
          >
            Bugüne Dön
          </button>
          <button
            type="button"
            onClick={onPrevMonth}
            aria-label="Önceki ay"
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-[#EEF2EF] dark:bg-[#222925] text-[#17221B] dark:text-[#F4F7F5] hover:opacity-85 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            aria-label="Sonraki ay"
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-[#EEF2EF] dark:bg-[#222925] text-[#17221B] dark:text-[#F4F7F5] hover:opacity-85 transition-opacity"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Headers (Monday start) */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5">
        {WEEKDAYS_TR.map((day) => (
          <div
            key={day}
            className="text-center text-[11px] font-medium text-[#77827B] dark:text-[#929B95] py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day Cells */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {calendarDays.map((cell, idx) => {
          if (!cell.dateStr || !cell.dayNum) {
            return (
              <div
                key={`empty-${idx}`}
                className={
                  showEarningsInCells
                    ? 'min-h-[58px] sm:min-h-[68px]'
                    : 'min-h-[46px] sm:min-h-[54px]'
                }
              />
            );
          }

          const dayEntries = entriesByDate.get(cell.dateStr) ?? [];
          const hasNormal = dayEntries.some(
            (e) =>
              e.workType === 'normal' &&
              e.calculatedDurationMinutes > e.overtimeDurationMinutes
          );
          const hasOvertime = dayEntries.some(
            (e) =>
              e.overtimeDurationMinutes > 0 ||
              e.workType === 'overtime' ||
              e.workType === 'weekend' ||
              e.workType === 'holiday'
          );
          const hasLeave = dayEntries.some(
            (e) => e.workType === 'paid_leave' || e.workType === 'unpaid_leave'
          );

          const dayEarnings = dayEntries.reduce((sum, e) => sum + e.estimatedEarnings, 0);

          const isSelected = selectedDate === cell.dateStr;
          const isToday = todayStr === cell.dateStr;
          const entryCount = dayEntries.length;

          const handleCellClick = () => {
            if (isSelected && onSelectedDayClick) {
              onSelectedDayClick(cell.dateStr!);
            } else {
              onSelectDate(cell.dateStr!);
            }
          };

          return (
            <button
              key={cell.dateStr}
              type="button"
              onClick={handleCellClick}
              aria-label={`${cell.dayNum} ${formatMonthYear(viewYear, viewMonth)}${
                entryCount > 0 ? `, ${entryCount} kayıt` : ''
              }`}
              aria-pressed={isSelected}
              className={`${
                showEarningsInCells
                  ? 'min-h-[58px] sm:min-h-[68px] py-1.5 justify-between'
                  : 'min-h-[46px] sm:min-h-[54px] justify-center gap-1'
              } rounded-xl sm:rounded-2xl flex flex-col items-center relative transition-colors px-0.5 overflow-hidden ${
                isSelected
                  ? 'bg-[#159B61]/12 dark:bg-[#39D98A]/14 ring-2 ring-[#159B61] dark:ring-[#39D98A] text-[#17221B] dark:text-[#F4F7F5]'
                  : isToday
                  ? 'bg-[#EEF2EF] dark:bg-[#222925] ring-1 ring-[#159B61]/55 dark:ring-[#39D98A]/55 text-[#17221B] dark:text-[#F4F7F5]'
                  : entryCount > 0
                  ? 'bg-[#EEF2EF]/55 dark:bg-[#222925]/55 hover:bg-[#EEF2EF] dark:hover:bg-[#222925] text-[#17221B] dark:text-[#F4F7F5]'
                  : 'hover:bg-[#EEF2EF]/60 dark:hover:bg-[#222925]/60 text-[#17221B] dark:text-[#F4F7F5]'
              }`}
            >
              {/* Selected quick-add '+' indicator */}
              {isSelected && onSelectedDayClick && (
                <span
                  aria-hidden="true"
                  className="absolute top-1 left-1 text-[#159B61] dark:text-[#39D98A]"
                >
                  <Plus className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}

              {/* Multi-entry count */}
              {entryCount > 1 && (
                <span className="absolute top-1 right-1.5 font-mono text-[9px] leading-none font-semibold text-[#77827B] dark:text-[#929B95] tabular-nums">
                  {entryCount}
                </span>
              )}

              <span
                className={`font-mono text-xs sm:text-sm font-semibold tabular-nums leading-none ${
                  isToday && !isSelected ? 'text-[#159B61] dark:text-[#39D98A]' : ''
                }`}
              >
                {cell.dayNum}
              </span>

              {showEarningsInCells ? (
                <div className="w-full px-0.5 text-center leading-none">
                  {entryCount === 0 ? (
                    <span className="block h-3" />
                  ) : dayEarnings !== 0 ? (
                    <span
                      className={`block font-mono text-[9px] sm:text-[11px] font-bold tracking-tighter tabular-nums truncate ${
                        dayEarnings > 0
                          ? 'text-[#159B61] dark:text-[#39D98A]'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatCompactCurrency(dayEarnings, currency)}
                    </span>
                  ) : (
                    <span className="block font-sans text-[9px] sm:text-[10px] text-[#77827B] dark:text-[#929B95] truncate">
                      {hasLeave ? 'İzin' : 'Normal'}
                    </span>
                  )}
                </div>
              ) : (
                <div className="h-1.5 flex items-center justify-center gap-0.5">
                  {hasNormal && (
                    <span className="h-1.5 w-1.5 sm:w-2.5 rounded-full bg-[#159B61] dark:bg-[#39D98A]" />
                  )}
                  {hasOvertime && (
                    <span className="h-1.5 w-1.5 sm:w-2.5 rounded-full bg-[#D97706] dark:bg-[#F59E0B]" />
                  )}
                  {hasLeave && (
                    <span className="h-1.5 w-1.5 sm:w-2.5 rounded-full bg-[#2563EB] dark:bg-[#60A5FA]" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Color Legend */}
      <div className="mt-4 pt-3.5 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#77827B] dark:text-[#929B95]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#159B61] dark:bg-[#39D98A]" />
            Normal mesai
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#D97706] dark:bg-[#F59E0B]" />
            Fazla mesai
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#2563EB] dark:bg-[#60A5FA]" />
            İzin
          </span>
        </div>

        {onSelectedDayClick && (
          <span className="text-[11px] text-[#77827B] dark:text-[#929B95]">
            Seçili güne dokunarak mesai ekle
          </span>
        )}
      </div>
    </section>
  );
};
