import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { CurrencyCode, WorkEntry } from '../types/mesai';
import {
  formatCompactCurrency,
  formatMonthYear,
  getTodayDateString,
} from '../utils/calculations';

const WEEKDAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function formatCompactHours(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  if (safe === 0) return '';
  if (safe < 60) return `${safe}dk`;
  const hours = safe / 60;
  if (Number.isInteger(hours)) return `${hours}sa`;
  return `${new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(hours)}sa`;
}

function resolveEntryRatePercent(
  entry: WorkEntry,
  overtimeMultiplier: number,
  weekendMultiplier: number
): 50 | 100 | null {
  if (entry.workType === 'paid_leave' || entry.workType === 'unpaid_leave') return null;
  const hasOvertime =
    entry.overtimeDurationMinutes > 0 ||
    entry.workType === 'overtime' ||
    entry.workType === 'weekend' ||
    entry.workType === 'holiday';
  if (!hasOvertime) return null;

  if (entry.overtimeRatePercent === 50 || entry.overtimeRatePercent === 100) {
    return entry.overtimeRatePercent;
  }
  if (entry.workType === 'weekend' || entry.workType === 'holiday') {
    return weekendMultiplier >= 2.0 ? 100 : 50;
  }
  return overtimeMultiplier >= 2.0 ? 100 : 50;
}

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
  showHoursInCells?: boolean;
  currency?: CurrencyCode;
  overtimeMultiplier?: number;
  weekendMultiplier?: number;
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
  showHoursInCells = false,
  currency = 'TRY',
  overtimeMultiplier = 1.5,
  weekendMultiplier = 2.0,
}) => {
  const todayStr = getTodayDateString();
  const hasCellDetailText = showEarningsInCells || showHoursInCells;

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
      className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-3.5 sm:p-6"
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
            className="min-h-[38px] px-3 rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-xs font-medium text-[#17221B] dark:text-[#F4F7F5] hover:opacity-85 transition-opacity whitespace-nowrap"
          >
            Bugüne Dön
          </button>
          <button
            type="button"
            onClick={onPrevMonth}
            aria-label="Önceki ay"
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5] hover:opacity-85 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            aria-label="Sonraki ay"
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5] hover:opacity-85 transition-opacity"
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
                  hasCellDetailText
                    ? 'min-h-[58px] sm:min-h-[68px]'
                    : 'min-h-[46px] sm:min-h-[54px]'
                }
              />
            );
          }

          const dayEntries = entriesByDate.get(cell.dateStr) ?? [];
          let normalMinutes = 0;
          let rate50Minutes = 0;
          let rate100Minutes = 0;
          let hasLeave = false;

          for (const e of dayEntries) {
            if (e.workType === 'paid_leave' || e.workType === 'unpaid_leave') {
              hasLeave = true;
              continue;
            }

            const ratePercent = resolveEntryRatePercent(
              e,
              overtimeMultiplier,
              weekendMultiplier
            );

            if (e.workType === 'normal') {
              const regularMin = Math.max(
                0,
                e.calculatedDurationMinutes - e.overtimeDurationMinutes
              );
              normalMinutes += regularMin;
              if (e.overtimeDurationMinutes > 0) {
                if (ratePercent === 100) {
                  rate100Minutes += e.overtimeDurationMinutes;
                } else {
                  rate50Minutes += e.overtimeDurationMinutes;
                }
              }
            } else if (ratePercent === 100) {
              rate100Minutes += e.calculatedDurationMinutes;
            } else if (ratePercent === 50) {
              rate50Minutes += e.calculatedDurationMinutes;
            } else {
              normalMinutes += e.calculatedDurationMinutes;
            }
          }

          const hasNormal = normalMinutes > 0;
          const hasRate50 = rate50Minutes > 0;
          const hasRate100 = rate100Minutes > 0;

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
                hasCellDetailText
                  ? 'min-h-[62px] sm:min-h-[72px] py-1.5 justify-between'
                  : 'min-h-[46px] sm:min-h-[54px] justify-center gap-1'
              } rounded-xl sm:rounded-2xl flex flex-col items-center relative transition-colors px-0.5 overflow-hidden ${
                isSelected
                  ? 'bg-[#159B61]/12 dark:bg-[#39D98A]/14 ring-2 ring-[#159B61] dark:ring-[#39D98A] text-[#17221B] dark:text-[#F4F7F5]'
                  : isToday
                  ? 'bg-[#EEF2EF] dark:bg-[#222925] ring-1 ring-[#159B61]/65 dark:ring-[#39D98A]/55 text-[#17221B] dark:text-[#F4F7F5]'
                  : entryCount > 0
                  ? 'bg-[#EEF2EF]/80 dark:bg-[#222925]/60 border border-[#C9D3CD] dark:border-white/[0.08] hover:bg-[#EEF2EF] dark:hover:bg-[#222925] text-[#17221B] dark:text-[#F4F7F5]'
                  : 'border border-[#DFE6E1] dark:border-white/[0.05] hover:bg-[#EEF2EF]/70 dark:hover:bg-[#222925]/60 text-[#17221B] dark:text-[#F4F7F5]'
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
              ) : showHoursInCells ? (
                <div className="w-full px-0.5 text-center leading-tight flex flex-col items-center justify-end gap-0.5 min-h-[20px]">
                  {entryCount === 0 ? (
                    <span className="block h-3" />
                  ) : hasRate50 || hasRate100 ? (
                    <>
                      {hasRate50 && (
                        <span
                          title="%50 mesai"
                          className="block w-full font-mono text-[9px] sm:text-[10px] font-bold tracking-tighter text-[#D97706] dark:text-[#F59E0B] tabular-nums leading-none truncate"
                        >
                          {formatCompactHours(rate50Minutes)}
                        </span>
                      )}
                      {hasRate100 && (
                        <span
                          title="%100 mesai"
                          className="block w-full font-mono text-[9px] sm:text-[10px] font-bold tracking-tighter text-[#7C3AED] dark:text-[#A78BFA] tabular-nums leading-none truncate"
                        >
                          {formatCompactHours(rate100Minutes)}
                        </span>
                      )}
                    </>
                  ) : hasNormal ? (
                    <span className="block w-full font-mono text-[9px] sm:text-[11px] font-bold tracking-tighter text-[#159B61] dark:text-[#39D98A] tabular-nums leading-none truncate">
                      {formatCompactHours(normalMinutes)}
                    </span>
                  ) : hasLeave ? (
                    <span className="block font-sans text-[9px] sm:text-[10px] font-medium text-[#2563EB] dark:text-[#60A5FA] leading-none truncate">
                      İzin
                    </span>
                  ) : (
                    <span className="block h-3" />
                  )}
                </div>
              ) : (
                <div className="h-1.5 flex items-center justify-center gap-0.5">
                  {hasNormal && (
                    <span className="h-1.5 w-1.5 sm:w-2.5 rounded-full bg-[#159B61] dark:bg-[#39D98A]" />
                  )}
                  {hasRate50 && (
                    <span className="h-1.5 w-1.5 sm:w-2.5 rounded-full bg-[#D97706] dark:bg-[#F59E0B]" />
                  )}
                  {hasRate100 && (
                    <span className="h-1.5 w-1.5 sm:w-2.5 rounded-full bg-[#7C3AED] dark:bg-[#A78BFA]" />
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
      <div className="mt-4 pt-3.5 border-t border-[#D7E0DA] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#77827B] dark:text-[#929B95]">
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#159B61] dark:bg-[#39D98A]" />
            Normal
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#D97706] dark:bg-[#F59E0B]" />
            %50 mesai
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#7C3AED] dark:bg-[#A78BFA]" />
            %100 mesai
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
