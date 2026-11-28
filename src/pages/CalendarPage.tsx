import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { MonthlyCalendarGrid } from '../components/MonthlyCalendarGrid';
import { useMesai } from '../context/MesaiContext';
import { formatTemplate } from '../i18n';
import {
  formatCurrency,
  formatDuration,
  formatLocalizedDate,
  formatMonthYear,
  getTodayDateString,
  getWorkTypeLabel,
  summarizeEntries,
} from '../utils/calculations';

export const CalendarPage: React.FC = () => {
  const {
    settings,
    entries,
    openNewEntryModal,
    openEditEntryModal,
    requestDeleteEntry,
    language,
    t,
  } = useMesai();

  const todayStr = getTodayDateString();
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const monthTitle = formatMonthYear(viewYear, viewMonth, language);

  const monthEntries = useMemo(
    () =>
      entries
        .filter((e) => e.date.startsWith(monthPrefix))
        .sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return b.startTime.localeCompare(a.startTime);
        }),
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
            {t.earningsPage.title}
          </h1>
          <p className="text-xs text-[#77827B] dark:text-[#929B95]">
            {formatTemplate(t.earningsPage.subtitle, { month: monthTitle })}
          </p>
        </div>

        <button
          type="button"
          onClick={() => openNewEntryModal(selectedDate)}
          className="min-h-[44px] px-4 rounded-2xl bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>{t.common.addOvertime}</span>
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
        onEditEntry={(entry) => openEditEntryModal(entry)}
        onDeleteEntry={(entry) => requestDeleteEntry(entry)}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        onJumpToday={jumpToday}
        showEarningsInCells={true}
        currency={settings.currency}
        overtimeMultiplier={settings.overtimeMultiplier}
        weekendMultiplier={settings.weekendMultiplier}
      />

      {/* 2. Takvimin Altında Kazanılan Para ve %50 / %100 Mesai Dağılımı */}
      <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-xs font-medium text-[#77827B] dark:text-[#929B95]">
              {formatTemplate(t.earningsPage.monthEarned, { month: monthTitle })}
            </p>
            <span className="font-sans sm:font-mono text-xs text-[#77827B] dark:text-[#929B95] tabular-nums whitespace-nowrap">
              {formatTemplate(t.earningsPage.fixedSalaryLabel, {
                amount: formatCurrency(settings.monthlySalary, settings.currency, 0, language),
              })}
            </span>
          </div>

          <div
            dir="ltr"
            className="mt-2 inline-block font-display font-extrabold text-[1.75rem] min-[360px]:text-3xl sm:text-4xl leading-none tracking-tight text-[#17221B] dark:text-[#F4F7F5] tabular-nums whitespace-nowrap"
          >
            {formatCurrency(estimatedTotal, settings.currency, 0, language)}
          </div>
        </div>

        {/* %50 ve %100 Mesailerden Gelen Para (Kesilme Olmadan Sığar) */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <div className="rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] p-3 min-[360px]:p-3.5 sm:p-4 min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-[#77827B] dark:text-[#929B95]">
              {t.earningsPage.from50}
            </p>
            <p
              dir="ltr"
              className="mt-1.5 font-display text-[15px] min-[360px]:text-base min-[390px]:text-lg sm:text-xl font-extrabold text-[#D97706] dark:text-[#F59E0B] tabular-nums whitespace-nowrap"
            >
              {overtimeRateBreakdown.rate50Earnings > 0 ? '+' : ''}
              {formatCurrency(
                overtimeRateBreakdown.rate50Earnings,
                settings.currency,
                0,
                language
              )}
            </p>
            <p className="mt-1 font-sans sm:font-mono text-[11px] text-[#77827B] dark:text-[#929B95] tabular-nums">
              {formatTemplate(t.earningsPage.overtimeSuffix, {
                duration: formatDuration(overtimeRateBreakdown.rate50Minutes, language),
              })}
            </p>
          </div>

          <div className="rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] p-3 min-[360px]:p-3.5 sm:p-4 min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-[#77827B] dark:text-[#929B95]">
              {t.earningsPage.from100}
            </p>
            <p
              dir="ltr"
              className="mt-1.5 font-display text-[15px] min-[360px]:text-base min-[390px]:text-lg sm:text-xl font-extrabold text-[#7C3AED] dark:text-[#A78BFA] tabular-nums whitespace-nowrap"
            >
              {overtimeRateBreakdown.rate100Earnings > 0 ? '+' : ''}
              {formatCurrency(
                overtimeRateBreakdown.rate100Earnings,
                settings.currency,
                0,
                language
              )}
            </p>
            <p className="mt-1 font-sans sm:font-mono text-[11px] text-[#77827B] dark:text-[#929B95] tabular-nums">
              {formatTemplate(t.earningsPage.overtimeSuffix, {
                duration: formatDuration(overtimeRateBreakdown.rate100Minutes, language),
              })}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-[#D7E0DA] dark:border-white/[0.06] flex items-center justify-between gap-3 text-xs">
          <span className="text-[#77827B] dark:text-[#929B95]">
            {t.earningsPage.thisMonthExtra}
          </span>
          <span
            dir="ltr"
            className="shrink-0 whitespace-nowrap font-sans sm:font-mono font-bold text-[#159B61] dark:text-[#39D98A] tabular-nums"
          >
            {monthSummary.totalExtraEarnings > 0 ? '+' : ''}
            {formatCurrency(monthSummary.totalExtraEarnings, settings.currency, 0, language)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-[#77827B] dark:text-[#929B95]">
            {t.earningsPage.allTimeExtra}
          </span>
          <span
            dir="ltr"
            className="shrink-0 whitespace-nowrap font-sans sm:font-mono font-bold text-[#17221B] dark:text-[#F4F7F5] tabular-nums"
          >
            {allTimeSummary.totalExtraEarnings > 0 ? '+' : ''}
            {formatCurrency(allTimeSummary.totalExtraEarnings, settings.currency, 0, language)}
          </span>
        </div>
      </section>

      {/* 3. Aylık Günlük Kayıtlar Tablosu (Mobilde Akıllı 3 Sütunlu Tablo, Masaüstünde 5 Sütunlu Tablo) */}
      <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CBD5CF] dark:border-white/[0.08] p-3.5 min-[360px]:p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
            {formatTemplate(t.earningsPage.monthRecordsTitle, { month: monthTitle })}
          </h2>
          <span className="font-mono text-xs text-[#77827B] dark:text-[#929B95] tabular-nums whitespace-nowrap">
            {formatTemplate(t.earningsPage.recordsCount, { count: monthEntries.length })}
          </span>
        </div>

        {monthEntries.length === 0 ? (
          <p className="py-6 text-center text-xs text-[#77827B] dark:text-[#929B95]">
            {t.earningsPage.noRecordsThisMonth}
          </p>
        ) : (
          <>
            {/* Mobile auto-sized table (no horizontal scroll, zero clipped currency) */}
            <div className="sm:hidden">
              <table className="w-full table-auto border-collapse text-start">
                <thead>
                  <tr className="border-b border-[#D7E0DA] dark:border-white/[0.08] text-[10.5px] min-[360px]:text-[11px] font-semibold text-[#77827B] dark:text-[#929B95]">
                    <th className="py-2 pe-1">{t.calendar.colDateAndType}</th>
                    <th className="w-[1%] whitespace-nowrap py-2 px-1 text-end">
                      {t.calendar.colDuration}
                    </th>
                    <th className="w-[1%] whitespace-nowrap py-2 ps-1 text-end">
                      {t.calendar.colEarnings}
                    </th>
                    <th className="w-[1%] whitespace-nowrap py-2 ps-1 text-end">
                      <span className="sr-only">{t.common.delete}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D7E0DA] dark:divide-white/[0.06]">
                  {monthEntries.map((entry) => {
                    const isLeave =
                      entry.workType === 'paid_leave' || entry.workType === 'unpaid_leave';
                    const ratePct = isLeave
                      ? null
                      : entry.overtimeRatePercent ??
                        (entry.workType === 'weekend' || entry.workType === 'holiday'
                          ? settings.weekendMultiplier >= 2.0
                            ? 100
                            : 50
                          : entry.overtimeDurationMinutes > 0 || entry.workType === 'overtime'
                          ? settings.overtimeMultiplier >= 2.0
                            ? 100
                            : 50
                          : null);
                    const dotColor = isLeave
                      ? 'bg-[#2563EB] dark:bg-[#60A5FA]'
                      : ratePct === 100
                      ? 'bg-[#7C3AED] dark:bg-[#A78BFA]'
                      : ratePct === 50
                      ? 'bg-[#D97706] dark:bg-[#F59E0B]'
                      : 'bg-[#159B61] dark:bg-[#39D98A]';
                    const dateLabel = formatLocalizedDate(entry.date, false, language);
                    const pctLabel = ratePct
                      ? language === 'tr'
                        ? `%${ratePct}`
                        : `${ratePct}%`
                      : '';

                    return (
                      <tr
                        key={entry.id}
                        onClick={() => openEditEntryModal(entry)}
                        className="cursor-pointer active:bg-[#EEF2EF]/80 dark:active:bg-[#222925]/80 transition-colors"
                      >
                        <td className="py-2.5 pe-1 align-middle max-w-0 w-full">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                            <span className="text-[12px] min-[360px]:text-[13px] font-semibold text-[#2A302D] dark:text-[#F5F3EE] truncate">
                              {dateLabel}
                            </span>
                          </div>
                          <p className="ps-3.5 mt-0.5 text-[10.5px] min-[360px]:text-[11px] text-[#77827B] dark:text-[#929B95] truncate">
                            {getWorkTypeLabel(entry.workType, language)}
                            {pctLabel ? ` · ${pctLabel}` : ''}
                            {entry.notes ? ` · ${entry.notes}` : ''}
                          </p>
                        </td>

                        <td className="w-[1%] whitespace-nowrap py-2.5 px-1 text-end align-middle font-sans text-[11px] min-[360px]:text-xs text-[#77827B] dark:text-[#929B95] tabular-nums">
                          {isLeave
                            ? '—'
                            : formatDuration(entry.calculatedDurationMinutes, language)}
                        </td>

                        <td
                          className={`w-[1%] whitespace-nowrap py-2.5 ps-1 text-end align-middle font-sans text-[11.5px] min-[360px]:text-[13px] font-bold tabular-nums ${
                            entry.estimatedEarnings < 0
                              ? 'text-red-600 dark:text-red-400'
                              : entry.estimatedEarnings > 0
                              ? 'text-[#159B61] dark:text-[#39D98A]'
                              : 'text-[#77827B] dark:text-[#929B95]'
                          }`}
                        >
                          {entry.estimatedEarnings !== 0 ? (
                            <span dir="ltr">
                              {entry.estimatedEarnings > 0 ? '+' : ''}
                              {formatCurrency(
                                entry.estimatedEarnings,
                                settings.currency,
                                0,
                                language
                              )}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="w-[1%] whitespace-nowrap py-1.5 ps-1 text-end align-middle">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              requestDeleteEntry(entry);
                            }}
                            aria-label={formatTemplate(t.calendar.deleteEntryAria, {
                              date: dateLabel,
                            })}
                            title={t.calendar.deleteEntryTitle}
                            className="min-h-[34px] min-w-[32px] inline-flex items-center justify-center rounded-xl text-red-600/80 dark:text-red-400/80 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="border-b border-[#D7E0DA] dark:border-white/[0.08] text-[11px] font-semibold text-[#77827B] dark:text-[#929B95]">
                    <th className="py-2.5 pe-3">{t.calendar.colDate}</th>
                    <th className="py-2.5 px-3">{t.calendar.colType}</th>
                    <th className="py-2.5 px-3 text-end">{t.calendar.colDuration}</th>
                    <th className="py-2.5 px-3 text-end">{t.calendar.colEarnings}</th>
                    <th className="py-2.5 ps-3">{t.calendar.colNotes}</th>
                    <th className="py-2.5 ps-3 text-end">{t.calendar.colAction}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D7E0DA] dark:divide-white/[0.06] text-sm">
                  {monthEntries.map((entry) => {
                    const isLeave =
                      entry.workType === 'paid_leave' || entry.workType === 'unpaid_leave';
                    const ratePct = isLeave
                      ? null
                      : entry.overtimeRatePercent ??
                        (entry.workType === 'weekend' || entry.workType === 'holiday'
                          ? settings.weekendMultiplier >= 2.0
                            ? 100
                            : 50
                          : entry.overtimeDurationMinutes > 0 || entry.workType === 'overtime'
                          ? settings.overtimeMultiplier >= 2.0
                            ? 100
                            : 50
                          : null);
                    const dotColor = isLeave
                      ? 'bg-[#2563EB] dark:bg-[#60A5FA]'
                      : ratePct === 100
                      ? 'bg-[#7C3AED] dark:bg-[#A78BFA]'
                      : ratePct === 50
                      ? 'bg-[#D97706] dark:bg-[#F59E0B]'
                      : 'bg-[#159B61] dark:bg-[#39D98A]';
                    const dateLabel = formatLocalizedDate(entry.date, false, language);
                    const pctLabel = ratePct
                      ? language === 'tr'
                        ? `%${ratePct}`
                        : `${ratePct}%`
                      : '';

                    return (
                      <tr
                        key={entry.id}
                        onClick={() => openEditEntryModal(entry)}
                        className="cursor-pointer hover:bg-[#EEF2EF]/60 dark:hover:bg-[#222925]/60 transition-colors"
                      >
                        <td className="py-3 pe-3 font-medium text-[#2A302D] dark:text-[#F5F3EE] whitespace-nowrap">
                          {dateLabel}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-2 text-xs font-medium text-[#17221B] dark:text-[#F4F7F5]">
                            <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                            {getWorkTypeLabel(entry.workType, language)}
                            {pctLabel ? ` · ${pctLabel}` : ''}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-end font-mono text-xs text-[#77827B] dark:text-[#929B95] tabular-nums whitespace-nowrap">
                          {isLeave
                            ? '—'
                            : formatDuration(entry.calculatedDurationMinutes, language)}
                        </td>
                        <td
                          className={`py-3 px-3 text-end font-mono text-xs font-bold tabular-nums whitespace-nowrap ${
                            entry.estimatedEarnings < 0
                              ? 'text-red-600 dark:text-red-400'
                              : entry.estimatedEarnings > 0
                              ? 'text-[#159B61] dark:text-[#39D98A]'
                              : 'text-[#77827B] dark:text-[#929B95]'
                          }`}
                        >
                          {entry.estimatedEarnings !== 0 ? (
                            <span dir="ltr">
                              {entry.estimatedEarnings > 0 ? '+' : ''}
                              {formatCurrency(
                                entry.estimatedEarnings,
                                settings.currency,
                                0,
                                language
                              )}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 ps-3 text-xs text-[#77827B] dark:text-[#929B95] max-w-[180px] truncate">
                          {entry.notes || '—'}
                        </td>
                        <td className="py-2 ps-3 text-end whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              requestDeleteEntry(entry);
                            }}
                            aria-label={formatTemplate(t.calendar.deleteEntryAria, {
                              date: dateLabel,
                            })}
                            title={t.calendar.deleteEntryTitle}
                            className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center rounded-xl text-red-600/80 dark:text-red-400/80 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
};
