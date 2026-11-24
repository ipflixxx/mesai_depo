import React, { useMemo, useState } from 'react';
import { BarChart3, Plus } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMesai } from '../context/MesaiContext';
import {
  formatCurrency,
  formatDuration,
  formatTurkishDate,
  getTodayDateString,
  getWeekStartKey,
  summarizeEntries,
} from '../utils/calculations';

type StatsPeriod = 'weekly' | 'monthly' | 'yearly';

const MONTH_SHORT_TR = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
];

export const StatsPage: React.FC = () => {
  const { settings, entries, openNewEntryModal } = useMesai();
  const [period, setPeriod] = useState<StatsPeriod>('monthly');

  const todayStr = getTodayDateString();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthPrefix = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentWeekKey = getWeekStartKey(todayStr);

  const realizedEntries = useMemo(
    () => entries.filter((e) => !e.isPlanned && e.date <= todayStr),
    [entries, todayStr]
  );

  const periodEntries = useMemo(() => {
    if (period === 'weekly') {
      return realizedEntries.filter((e) => getWeekStartKey(e.date) === currentWeekKey);
    }
    if (period === 'monthly') {
      return realizedEntries.filter((e) => e.date.startsWith(currentMonthPrefix));
    }
    return realizedEntries.filter((e) => e.date.startsWith(String(currentYear)));
  }, [realizedEntries, period, currentWeekKey, currentMonthPrefix, currentYear]);

  const summary = useMemo(() => summarizeEntries(periodEntries), [periodEntries]);

  // Daily Work Hours & Daily Earnings chart data (grouped by day for selected period)
  const dailyChartData = useMemo(() => {
    const map = new Map<
      string,
      { date: string; label: string; normalHours: number; overtimeHours: number; extraEarnings: number }
    >();

    for (const e of periodEntries) {
      if (e.workType === 'paid_leave' || e.workType === 'unpaid_leave') continue;
      const existing = map.get(e.date) ?? {
        date: e.date,
        label: e.date.slice(5).split('-').reverse().join('.'),
        normalHours: 0,
        overtimeHours: 0,
        extraEarnings: 0,
      };
      const regularMin = Math.max(0, e.calculatedDurationMinutes - e.overtimeDurationMinutes);
      existing.normalHours = Number((existing.normalHours + regularMin / 60).toFixed(2));
      existing.overtimeHours = Number(
        (existing.overtimeHours + e.overtimeDurationMinutes / 60).toFixed(2)
      );
      existing.extraEarnings = Number((existing.extraEarnings + e.estimatedEarnings).toFixed(2));
      map.set(e.date, existing);
    }

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [periodEntries]);

  // Monthly Earnings Comparison across months that have entries in current year
  const monthlyComparisonData = useMemo(() => {
    const monthTotals = new Map<number, number>();
    for (const e of realizedEntries) {
      if (!e.date.startsWith(String(currentYear))) continue;
      const mIdx = Number(e.date.slice(5, 7)) - 1;
      monthTotals.set(mIdx, (monthTotals.get(mIdx) ?? 0) + e.estimatedEarnings);
    }

    return Array.from(monthTotals.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([mIdx, extra]) => ({
        month: MONTH_SHORT_TR[mIdx],
        sabitMaas: settings.monthlySalary,
        ekKazanc: Math.max(0, Number(extra.toFixed(2))),
      }));
  }, [realizedEntries, currentYear, settings.monthlySalary]);

  const isDark =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const accentColor = isDark ? '#39D98A' : '#159B61';
  const mutedBarColor = isDark ? '#35413A' : '#CBD5CE';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#929B95' : '#77827B';

  const hasData = periodEntries.length > 0 && summary.totalMinutes > 0;

  return (
    <div className="space-y-6">
      {/* Header & Period Switcher */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#17221B] dark:text-[#F4F7F5] tracking-tight">
            İstatistik ve Kazanç Analizi
          </h1>
          <p className="text-xs text-[#77827B] dark:text-[#929B95]">
            Gerçekleşen mesai kayıtlarına dayalı performans özeti
          </p>
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-black/[0.06] dark:border-white/[0.07] sm:w-72">
          {(
            [
              { id: 'weekly', label: 'Haftalık' },
              { id: 'monthly', label: 'Aylık' },
              { id: 'yearly', label: 'Yıllık' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPeriod(tab.id)}
              className={`min-h-[38px] rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                period === tab.id
                  ? 'bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211]'
                  : 'text-[#77827B] dark:text-[#929B95] hover:text-[#17221B] dark:hover:text-[#F4F7F5]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Empty State when no real records exist for period */}
      {!hasData ? (
        <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-black/[0.06] dark:border-white/[0.07] px-6 py-14 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] flex items-center justify-center mb-4 text-[#77827B] dark:text-[#929B95]">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
            Bu dönem için henüz analiz verisi yok
          </h2>
          <p className="mt-1.5 text-xs text-[#77827B] dark:text-[#929B95] max-w-sm mx-auto leading-relaxed">
            Seçili dönemde gerçekleşmiş mesai kaydı bulunmuyor. Kayıt ekledikçe çalışma saatlerin ve kazanç grafiklerin burada otomatik oluşacak.
          </p>
          <button
            type="button"
            onClick={() => openNewEntryModal(todayStr)}
            className="mt-5 min-h-[44px] px-5 rounded-2xl bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211] text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Mesai Ekle</span>
          </button>
        </section>
      ) : (
        <>
          {/* Detailed Metric Cards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-black/[0.06] dark:border-white/[0.07] p-4 sm:p-5">
              <p className="text-xs text-[#77827B] dark:text-[#929B95]">Toplam çalışma</p>
              <p className="mt-2 font-mono text-xl font-bold text-[#17221B] dark:text-[#F4F7F5] tabular-nums">
                {formatDuration(summary.totalMinutes)}
              </p>
            </div>

            <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-black/[0.06] dark:border-white/[0.07] p-4 sm:p-5">
              <p className="text-xs text-[#77827B] dark:text-[#929B95]">Fazla mesai saati</p>
              <p className="mt-2 font-mono text-xl font-bold text-[#159B61] dark:text-[#39D98A] tabular-nums">
                {formatDuration(summary.overtimeMinutes)}
              </p>
            </div>

            <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-black/[0.06] dark:border-white/[0.07] p-4 sm:p-5">
              <p className="text-xs text-[#77827B] dark:text-[#929B95]">Fazla mesai kazancı</p>
              <p className="mt-2 font-mono text-xl font-bold text-[#159B61] dark:text-[#39D98A] tabular-nums">
                {formatCurrency(summary.overtimeEarnings, settings.currency)}
              </p>
            </div>

            <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-black/[0.06] dark:border-white/[0.07] p-4 sm:p-5">
              <p className="text-xs text-[#77827B] dark:text-[#929B95]">Hafta sonu & tatil</p>
              <p className="mt-2 font-mono text-xl font-bold text-[#17221B] dark:text-[#F4F7F5] tabular-nums">
                {formatCurrency(summary.weekendAndHolidayEarnings, settings.currency)}
              </p>
            </div>
          </section>

          {/* Secondary Metric Strip */}
          <section className="rounded-2xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-black/[0.06] dark:border-white/[0.07] p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-black/[0.06] dark:divide-white/[0.06]">
            <div className="pt-1 sm:pt-0">
              <p className="text-xs text-[#77827B] dark:text-[#929B95]">Çalışılan gün sayısı</p>
              <p className="mt-1 font-mono text-lg font-bold text-[#17221B] dark:text-[#F4F7F5] tabular-nums">
                {summary.workedDaysCount} gün
              </p>
            </div>
            <div className="pt-3 sm:pt-0 sm:pl-4">
              <p className="text-xs text-[#77827B] dark:text-[#929B95]">Ortalama günlük çalışma</p>
              <p className="mt-1 font-mono text-lg font-bold text-[#17221B] dark:text-[#F4F7F5] tabular-nums">
                {formatDuration(summary.averageDailyMinutes)}
              </p>
            </div>
            <div className="pt-3 sm:pt-0 sm:pl-4">
              <p className="text-xs text-[#77827B] dark:text-[#929B95]">En uzun çalışma günü</p>
              <p className="mt-1 font-mono text-lg font-bold text-[#17221B] dark:text-[#F4F7F5] tabular-nums">
                {formatDuration(summary.longestDayMinutes)}
                {summary.longestDayDate && (
                  <span className="ml-2 text-xs font-sans font-normal text-[#77827B] dark:text-[#929B95]">
                    · {formatTurkishDate(summary.longestDayDate)}
                  </span>
                )}
              </p>
            </div>
          </section>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Daily Work Hours */}
            <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-black/[0.06] dark:border-white/[0.07] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#17221B] dark:text-[#F4F7F5]">
                    Günlük Çalışma Saati
                  </h2>
                  <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">
                    Normal ve fazla mesai dağılımı (saat)
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: tickColor }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: tickColor }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#191E1B' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        borderRadius: '14px',
                        fontSize: '12px',
                        color: isDark ? '#F4F7F5' : '#17221B',
                      }}
                      formatter={(value, name) => [
                        `${Number(value ?? 0)} sa`,
                        name === 'normalHours' ? 'Normal' : 'Fazla Mesai',
                      ]}
                    />
                    <Bar dataKey="normalHours" stackId="a" fill={mutedBarColor} radius={[0, 0, 4, 4]} />
                    <Bar dataKey="overtimeHours" stackId="a" fill={accentColor} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Daily Extra Earnings */}
            <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-black/[0.06] dark:border-white/[0.07] p-5 sm:p-6">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-[#17221B] dark:text-[#F4F7F5]">
                  Günlük Ek Kazanç
                </h2>
                <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">
                  Fazla mesai ve tatil çalışmalarından elde edilen ek gelir
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mesaiEarnGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={accentColor} stopOpacity={0.32} />
                        <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: tickColor }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: tickColor }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#191E1B' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        borderRadius: '14px',
                        fontSize: '12px',
                        color: isDark ? '#F4F7F5' : '#17221B',
                      }}
                      formatter={(value) => [
                        formatCurrency(Number(value ?? 0), settings.currency),
                        'Ek Kazanç',
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="extraEarnings"
                      stroke={accentColor}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#mesaiEarnGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* Monthly Earnings Comparison */}
          {monthlyComparisonData.length > 0 && (
            <section className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-black/[0.06] dark:border-white/[0.07] p-5 sm:p-6">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-[#17221B] dark:text-[#F4F7F5]">
                  Aylık Kazanç Karşılaştırması ({currentYear})
                </h2>
                <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">
                  Aylık sabit maaş ve ek mesai kazancı karşılaştırması
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyComparisonData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: tickColor }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: tickColor }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#191E1B' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        borderRadius: '14px',
                        fontSize: '12px',
                        color: isDark ? '#F4F7F5' : '#17221B',
                      }}
                      formatter={(value, name) => [
                        formatCurrency(Number(value ?? 0), settings.currency),
                        name === 'sabitMaas' ? 'Sabit Maaş' : 'Ek Kazanç',
                      ]}
                    />
                    <Bar dataKey="sabitMaas" stackId="m" fill={mutedBarColor} radius={[0, 0, 4, 4]} />
                    <Bar dataKey="ekKazanc" stackId="m" fill={accentColor} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
