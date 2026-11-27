import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react';
import { CurrencyCode, WorkEntry } from '../types/mesai';
import {
  WORK_TYPE_LABELS,
  formatCompactCurrency,
  formatCurrency,
  formatDuration,
  formatMonthYear,
  formatTurkishDate,
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

function getEntryTypeSummary(
  entry: WorkEntry,
  overtimeMultiplier: number,
  weekendMultiplier: number
): { label: string; tone: 'normal' | 'rate50' | 'rate100' | 'leave' } {
  if (entry.workType === 'paid_leave' || entry.workType === 'unpaid_leave') {
    return { label: WORK_TYPE_LABELS[entry.workType], tone: 'leave' };
  }
  const ratePercent = resolveEntryRatePercent(entry, overtimeMultiplier, weekendMultiplier);
  if (ratePercent === 100) {
    return { label: `${WORK_TYPE_LABELS[entry.workType]} · %100`, tone: 'rate100' };
  }
  if (ratePercent === 50) {
    return { label: `${WORK_TYPE_LABELS[entry.workType]} · %50`, tone: 'rate50' };
  }
  return { label: WORK_TYPE_LABELS[entry.workType], tone: 'normal' };
}

function getToneTextClass(tone: 'normal' | 'rate50' | 'rate100' | 'leave'): string {
  if (tone === 'rate50') return 'text-[#D97706] dark:text-[#F59E0B]';
  if (tone === 'rate100') return 'text-[#7C3AED] dark:text-[#A78BFA]';
  if (tone === 'leave') return 'text-[#2563EB] dark:text-[#60A5FA]';
  return 'text-[#159B61] dark:text-[#39D98A]';
}

function getToneDotClass(tone: 'normal' | 'rate50' | 'rate100' | 'leave'): string {
  if (tone === 'rate50') return 'bg-[#D97706] dark:bg-[#F59E0B]';
  if (tone === 'rate100') return 'bg-[#7C3AED] dark:bg-[#A78BFA]';
  if (tone === 'leave') return 'bg-[#2563EB] dark:bg-[#60A5FA]';
  return 'bg-[#159B61] dark:bg-[#39D98A]';
}

interface MonthlyCalendarGridProps {
  viewYear: number;
  viewMonth: number; // 0-indexed
  selectedDate: string;
  entries: WorkEntry[];
  onSelectDate: (dateStr: string) => void;
  onSelectedDayClick?: (dateStr: string) => void;
  onEditEntry?: (entry: WorkEntry) => void;
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
  onEditEntry,
  onPrevMonth,
  onNextMonth,
  onJumpToday,
  showEarningsInCells = false,
  showHoursInCells = false,
  currency = 'TRY',
  overtimeMultiplier = 1.5,
  weekendMultiplier = 2.0,
}) => {
  const [displayMode, setDisplayMode] = useState<'calendar' | 'list'>('calendar');
  const todayStr = getTodayDateString();
  const hasCellDetailText = showEarningsInCells || showHoursInCells;
  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  const entriesByDate = useMemo(() => {
    const map = new Map<string, WorkEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.date) ?? [];
      list.push(entry);
      map.set(entry.date, list);
    }
    return map;
  }, [entries]);

  const monthEntriesSorted = useMemo(
    () =>
      entries
        .filter((e) => e.date.startsWith(monthPrefix))
        .sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return b.startTime.localeCompare(a.startTime);
        }),
    [entries, monthPrefix]
  );

  const selectedDayEntries = useMemo(
    () => entriesByDate.get(selectedDate) ?? [],
    [entriesByDate, selectedDate]
  );

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
      {/* Month, View Switcher & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3.5 sm:mb-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-[#2A302D] dark:text-[#F5F3EE] truncate">
            {formatMonthYear(viewYear, viewMonth)}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Takvim / Liste Görünümü */}
          <div
            role="group"
            aria-label="Görünüm modu"
            className="flex items-center p-0.5 rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07]"
          >
            <button
              type="button"
              onClick={() => setDisplayMode('calendar')}
              aria-label="Takvim görünümü"
              aria-pressed={displayMode === 'calendar'}
              className={`min-h-[34px] px-2.5 rounded-[10px] flex items-center gap-1 text-xs font-medium transition-colors whitespace-nowrap ${
                displayMode === 'calendar'
                  ? 'bg-[#FFFFFF] dark:bg-[#191E1B] text-[#17221B] dark:text-[#F4F7F5] border border-[#CFD8D2] dark:border-white/[0.08]'
                  : 'text-[#77827B] dark:text-[#929B95]'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Takvim</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('list')}
              aria-label="Liste görünümü"
              aria-pressed={displayMode === 'list'}
              className={`min-h-[34px] px-2.5 rounded-[10px] flex items-center gap-1 text-xs font-medium transition-colors whitespace-nowrap ${
                displayMode === 'list'
                  ? 'bg-[#FFFFFF] dark:bg-[#191E1B] text-[#17221B] dark:text-[#F4F7F5] border border-[#CFD8D2] dark:border-white/[0.08]'
                  : 'text-[#77827B] dark:text-[#929B95]'
              }`}
            >
              <List className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Liste</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onJumpToday}
            className="min-h-[38px] px-2.5 sm:px-3 rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-xs font-medium text-[#17221B] dark:text-[#F4F7F5] hover:opacity-85 transition-opacity whitespace-nowrap"
          >
            <span className="sm:hidden">Bugün</span>
            <span className="hidden sm:inline">Bugüne Dön</span>
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

      {displayMode === 'calendar' ? (
        <>
          {/* Weekday Headers (Monday start) */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-1.5">
            {WEEKDAYS_TR.map((day, i) => (
              <div
                key={day}
                className={`text-center text-[11px] sm:text-xs font-semibold py-1 ${
                  i >= 5
                    ? 'text-[#77827B]/80 dark:text-[#929B95]/75'
                    : 'text-[#77827B] dark:text-[#929B95]'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((cell, idx) => {
              if (!cell.dateStr || !cell.dayNum) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className={
                      hasCellDetailText
                        ? 'min-h-[64px] sm:min-h-[76px]'
                        : 'min-h-[48px] sm:min-h-[56px]'
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

              const cellToneSurface = hasRate100
                ? 'bg-[#7C3AED]/[0.07] dark:bg-[#A78BFA]/[0.09] border-[#7C3AED]/25 dark:border-[#A78BFA]/25'
                : hasRate50
                ? 'bg-[#D97706]/[0.07] dark:bg-[#F59E0B]/[0.09] border-[#D97706]/25 dark:border-[#F59E0B]/25'
                : hasNormal
                ? 'bg-[#159B61]/[0.07] dark:bg-[#39D98A]/[0.09] border-[#159B61]/25 dark:border-[#39D98A]/25'
                : hasLeave
                ? 'bg-[#2563EB]/[0.07] dark:bg-[#60A5FA]/[0.09] border-[#2563EB]/25 dark:border-[#60A5FA]/25'
                : 'bg-[#EEF2EF]/80 dark:bg-[#222925]/60 border-[#C9D3CD] dark:border-white/[0.08]';

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
                      ? 'min-h-[64px] sm:min-h-[76px] py-1.5 justify-between'
                      : 'min-h-[48px] sm:min-h-[56px] justify-center gap-1'
                  } rounded-xl sm:rounded-2xl flex flex-col items-center relative transition-colors px-1 overflow-hidden ${
                    isSelected
                      ? 'bg-[#159B61]/12 dark:bg-[#39D98A]/14 ring-2 ring-[#159B61] dark:ring-[#39D98A] text-[#17221B] dark:text-[#F4F7F5]'
                      : isToday
                      ? 'bg-[#EEF2EF] dark:bg-[#222925] ring-1 ring-[#159B61]/70 dark:ring-[#39D98A]/60 text-[#17221B] dark:text-[#F4F7F5]'
                      : entryCount > 0
                      ? `border ${cellToneSurface} hover:opacity-90 text-[#17221B] dark:text-[#F4F7F5]`
                      : 'border border-[#DFE6E1] dark:border-white/[0.05] hover:bg-[#EEF2EF]/70 dark:hover:bg-[#222925]/60 text-[#17221B] dark:text-[#F4F7F5]'
                  }`}
                >
                  {/* Multi-entry count */}
                  {entryCount > 1 && (
                    <span className="absolute top-1 right-1 font-mono text-[9px] leading-none font-semibold text-[#77827B] dark:text-[#929B95] tabular-nums">
                      ×{entryCount}
                    </span>
                  )}

                  <span
                    className={`font-mono text-[13px] sm:text-sm font-bold tabular-nums leading-none ${
                      isToday && !isSelected ? 'text-[#159B61] dark:text-[#39D98A]' : ''
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {showEarningsInCells ? (
                    <div className="w-full text-center leading-none">
                      {entryCount === 0 ? (
                        <span className="block h-3" />
                      ) : dayEarnings !== 0 ? (
                        <span
                          className={`block font-mono text-[10px] sm:text-[11px] font-bold tracking-tight tabular-nums truncate ${
                            dayEarnings > 0
                              ? 'text-[#159B61] dark:text-[#39D98A]'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatCompactCurrency(dayEarnings, currency)}
                        </span>
                      ) : (
                        <span className="block font-sans text-[10px] text-[#77827B] dark:text-[#929B95] truncate">
                          {hasLeave ? 'İzin' : 'Normal'}
                        </span>
                      )}
                    </div>
                  ) : showHoursInCells ? (
                    <div className="w-full text-center leading-tight flex flex-col items-center justify-end gap-0.5 min-h-[22px]">
                      {entryCount === 0 ? (
                        <span className="block h-3" />
                      ) : hasRate50 || hasRate100 ? (
                        <>
                          {hasRate50 && (
                            <span
                              title="%50 mesai"
                              className="block w-full font-mono text-[10px] sm:text-[11px] font-bold tracking-tight text-[#D97706] dark:text-[#F59E0B] tabular-nums leading-none truncate"
                            >
                              {formatCompactHours(rate50Minutes)}
                            </span>
                          )}
                          {hasRate100 && (
                            <span
                              title="%100 mesai"
                              className="block w-full font-mono text-[10px] sm:text-[11px] font-bold tracking-tight text-[#7C3AED] dark:text-[#A78BFA] tabular-nums leading-none truncate"
                            >
                              {formatCompactHours(rate100Minutes)}
                            </span>
                          )}
                        </>
                      ) : hasNormal ? (
                        <span className="block w-full font-mono text-[10px] sm:text-[11px] font-bold tracking-tight text-[#159B61] dark:text-[#39D98A] tabular-nums leading-none truncate">
                          {formatCompactHours(normalMinutes)}
                        </span>
                      ) : hasLeave ? (
                        <span className="block font-sans text-[10px] font-medium text-[#2563EB] dark:text-[#60A5FA] leading-none truncate">
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
          <div className="mt-3.5 pt-3 border-t border-[#D7E0DA] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#77827B] dark:text-[#929B95]">
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
          </div>

          {/* Compact Selected Day Strip (mobile & desktop friendly, no clutter) */}
          {(onSelectedDayClick || selectedDayEntries.length > 0) && (
            <div className="mt-3 pt-3 border-t border-[#D7E0DA] dark:border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#2A302D] dark:text-[#F5F3EE] truncate">
                  {formatTurkishDate(selectedDate)}
                </span>
                {onSelectedDayClick && (
                  <button
                    type="button"
                    onClick={() => onSelectedDayClick(selectedDate)}
                    className="min-h-[34px] px-3 rounded-xl bg-[#159B61]/10 dark:bg-[#39D98A]/12 text-[#159B61] dark:text-[#39D98A] text-xs font-semibold inline-flex items-center gap-1 hover:opacity-85 transition-opacity whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Mesai Ekle</span>
                  </button>
                )}
              </div>

              {selectedDayEntries.length > 0 && (
                <div className="divide-y divide-[#D7E0DA] dark:divide-white/[0.06]">
                  {selectedDayEntries.map((entry) => {
                    const info = getEntryTypeSummary(
                      entry,
                      overtimeMultiplier,
                      weekendMultiplier
                    );
                    const isLeaveEntry =
                      entry.workType === 'paid_leave' || entry.workType === 'unpaid_leave';
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => onEditEntry?.(entry)}
                        disabled={!onEditEntry}
                        className="w-full py-2 flex items-center justify-between gap-3 text-left hover:opacity-80 transition-opacity disabled:cursor-default"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${getToneDotClass(
                              info.tone
                            )}`}
                          />
                          <span className="text-xs font-medium text-[#17221B] dark:text-[#F4F7F5] truncate">
                            {info.label}
                          </span>
                          {entry.notes && (
                            <span className="text-[11px] text-[#77827B] dark:text-[#929B95] truncate">
                              · {entry.notes}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0 font-mono text-xs tabular-nums">
                          {!isLeaveEntry && (
                            <span className="text-[#77827B] dark:text-[#929B95]">
                              {formatDuration(entry.calculatedDurationMinutes)}
                            </span>
                          )}
                          {entry.estimatedEarnings !== 0 && (
                            <span className={`font-semibold ${getToneTextClass(info.tone)}`}>
                              {entry.estimatedEarnings > 0 ? '+' : ''}
                              {formatCurrency(entry.estimatedEarnings, currency)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Akıllı Mobil & Masaüstü Liste / Tablo Görünümü (Yatay kaydırma yok) */
        <div>
          {monthEntriesSorted.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-xs text-[#77827B] dark:text-[#929B95]">
                Bu ay için henüz mesai kaydı bulunmuyor.
              </p>
              {onSelectedDayClick && (
                <button
                  type="button"
                  onClick={() => onSelectedDayClick(selectedDate)}
                  className="min-h-[42px] px-4 rounded-xl bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211] text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Mesai Ekle</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Stacked Cards (no horizontal scroll) */}
              <div className="sm:hidden divide-y divide-[#D7E0DA] dark:divide-white/[0.06]">
                {monthEntriesSorted.map((entry) => {
                  const info = getEntryTypeSummary(
                    entry,
                    overtimeMultiplier,
                    weekendMultiplier
                  );
                  const isLeaveEntry =
                    entry.workType === 'paid_leave' || entry.workType === 'unpaid_leave';
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => onEditEntry?.(entry)}
                      disabled={!onEditEntry}
                      className="w-full py-3 flex items-center justify-between gap-3 text-left"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${getToneDotClass(
                              info.tone
                            )}`}
                          />
                          <span className="text-[13px] font-semibold text-[#2A302D] dark:text-[#F5F3EE]">
                            {formatTurkishDate(entry.date)}
                          </span>
                        </div>
                        <p className="pl-4 text-xs text-[#77827B] dark:text-[#929B95] truncate">
                          {info.label}
                          {entry.notes ? ` · ${entry.notes}` : ''}
                        </p>
                      </div>

                      <div className="text-right shrink-0 space-y-0.5">
                        <p
                          className={`font-mono text-sm font-bold tabular-nums ${
                            entry.estimatedEarnings < 0
                              ? 'text-red-600 dark:text-red-400'
                              : entry.estimatedEarnings > 0
                              ? getToneTextClass(info.tone)
                              : 'text-[#77827B] dark:text-[#929B95]'
                          }`}
                        >
                          {entry.estimatedEarnings !== 0
                            ? `${entry.estimatedEarnings > 0 ? '+' : ''}${formatCurrency(
                                entry.estimatedEarnings,
                                currency
                              )}`
                            : isLeaveEntry
                            ? 'Ücretli İzin'
                            : 'Normal'}
                        </p>
                        {!isLeaveEntry && (
                          <p className="font-mono text-[11px] text-[#77827B] dark:text-[#929B95] tabular-nums">
                            {formatDuration(entry.calculatedDurationMinutes)}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Desktop Structured Table */}
              <div className="hidden sm:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#D7E0DA] dark:border-white/[0.08] text-[11px] font-semibold text-[#77827B] dark:text-[#929B95]">
                      <th className="py-2.5 pr-3">Tarih</th>
                      <th className="py-2.5 px-3">Tür</th>
                      <th className="py-2.5 px-3 text-right">Süre</th>
                      <th className="py-2.5 px-3 text-right">Kazanç</th>
                      <th className="py-2.5 pl-3">Not</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D7E0DA] dark:divide-white/[0.06] text-sm">
                    {monthEntriesSorted.map((entry) => {
                      const info = getEntryTypeSummary(
                        entry,
                        overtimeMultiplier,
                        weekendMultiplier
                      );
                      const isLeaveEntry =
                        entry.workType === 'paid_leave' || entry.workType === 'unpaid_leave';
                      return (
                        <tr
                          key={entry.id}
                          onClick={() => onEditEntry?.(entry)}
                          className={
                            onEditEntry
                              ? 'cursor-pointer hover:bg-[#EEF2EF]/60 dark:hover:bg-[#222925]/60 transition-colors'
                              : ''
                          }
                        >
                          <td className="py-3 pr-3 font-medium text-[#2A302D] dark:text-[#F5F3EE] whitespace-nowrap">
                            {formatTurkishDate(entry.date)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-2 text-xs font-medium text-[#17221B] dark:text-[#F4F7F5]">
                              <span
                                className={`w-2 h-2 rounded-full ${getToneDotClass(info.tone)}`}
                              />
                              {info.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-xs text-[#77827B] dark:text-[#929B95] tabular-nums whitespace-nowrap">
                            {isLeaveEntry
                              ? '—'
                              : formatDuration(entry.calculatedDurationMinutes)}
                          </td>
                          <td
                            className={`py-3 px-3 text-right font-mono text-xs font-bold tabular-nums whitespace-nowrap ${
                              entry.estimatedEarnings < 0
                                ? 'text-red-600 dark:text-red-400'
                                : entry.estimatedEarnings > 0
                                ? getToneTextClass(info.tone)
                                : 'text-[#77827B] dark:text-[#929B95]'
                            }`}
                          >
                            {entry.estimatedEarnings !== 0
                              ? `${entry.estimatedEarnings > 0 ? '+' : ''}${formatCurrency(
                                  entry.estimatedEarnings,
                                  currency
                                )}`
                              : '—'}
                          </td>
                          <td className="py-3 pl-3 text-xs text-[#77827B] dark:text-[#929B95] max-w-[180px] truncate">
                            {entry.notes || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
};
