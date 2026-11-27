import {
  CalculationPreview,
  CurrencyCode,
  OverlapConflict,
  PeriodSummary,
  UserSettings,
  WorkEntry,
  WorkEntryInput,
  WorkType,
} from '../types/mesai';

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  normal: 'Normal mesai',
  overtime: 'Fazla mesai',
  weekend: 'Hafta sonu mesaisi',
  holiday: 'Resmî tatil mesaisi',
  paid_leave: 'İzin',
  unpaid_leave: 'Ücretsiz izin',
};

export const CURRENCY_CONFIG: Record<CurrencyCode, { symbol: string; locale: string }> = {
  TRY: { symbol: '₺', locale: 'tr-TR' },
  USD: { symbol: '$', locale: 'tr-TR' },
  EUR: { symbol: '€', locale: 'tr-TR' },
};

export const DEFAULT_SETTINGS: UserSettings = {
  userName: '',
  monthlySalary: 0,
  salaryType: 'net',
  currency: 'TRY',
  paymentDay: 15,
  dailyWorkHours: 8,
  weeklyWorkDays: 5,
  weeklyWorkHours: 40,
  workStartTime: '09:00',
  workEndTime: '18:00',
  breakMinutes: 60,
  overtimeMultiplier: 1.5,
  weekendMultiplier: 2.0,
  overtimeCalculationMode: 'daily',
  themeMode: 'dark',
  onboardingCompleted: false,
  alarm: {
    enabled: false,
    hour: 18,
    minute: 0,
    daysOfWeek: [1, 2, 3, 4, 5],
  },
};

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isFutureDate(dateStr: string): boolean {
  return dateStr > getTodayDateString();
}

export function timeToMinutes(time: string): number {
  const parts = time.split(':');
  if (parts.length !== 2) return 0;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Haftalık çalışma saati * 52 / 12 = Aylık normal çalışma saati
 * Aylık maaş / Aylık normal çalışma saati = Saatlik ücret
 */
export function calculateMonthlyNormalHours(settings: UserSettings): number {
  const weekly = settings.weeklyWorkHours > 0
    ? settings.weeklyWorkHours
    : settings.dailyWorkHours * settings.weeklyWorkDays;
  return (weekly * 52) / 12;
}

export function calculateHourlyRate(settings: UserSettings): number {
  if (!settings.monthlySalary || settings.monthlySalary <= 0) return 0;
  const monthlyHours = calculateMonthlyNormalHours(settings);
  if (monthlyHours <= 0) return 0;
  return settings.monthlySalary / monthlyHours;
}

/**
 * Computes raw span and net duration in minutes, supporting overnight shifts.
 */
export function calculateShiftMinutes(
  startTime: string,
  endTime: string,
  breakMinutes: number,
  workType: WorkType,
  dailyWorkHours: number
): {
  totalSpanMinutes: number;
  netMinutes: number;
  isOvernight: boolean;
  isValid: boolean;
  validationError?: string;
} {
  if (workType === 'paid_leave' || workType === 'unpaid_leave') {
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    if (startTime && endTime && startMin !== endMin) {
      const isOvernight = endMin < startMin;
      const span = isOvernight ? 24 * 60 - startMin + endMin : endMin - startMin;
      const net = Math.max(0, span - Math.max(0, breakMinutes));
      return { totalSpanMinutes: span, netMinutes: net, isOvernight, isValid: true };
    }
    const defaultLeaveMinutes = Math.max(0, Math.round(dailyWorkHours * 60));
    return {
      totalSpanMinutes: defaultLeaveMinutes,
      netMinutes: defaultLeaveMinutes,
      isOvernight: false,
      isValid: true,
    };
  }

  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  if (startMin === endMin) {
    return {
      totalSpanMinutes: 0,
      netMinutes: 0,
      isOvernight: false,
      isValid: false,
      validationError: 'Başlangıç ve bitiş saati aynı olamaz.',
    };
  }

  const isOvernight = endMin < startMin;
  const totalSpanMinutes = isOvernight
    ? 24 * 60 - startMin + endMin
    : endMin - startMin;

  if (breakMinutes < 0) {
    return {
      totalSpanMinutes,
      netMinutes: 0,
      isOvernight,
      isValid: false,
      validationError: 'Mola süresi negatif olamaz.',
    };
  }

  if (breakMinutes >= totalSpanMinutes) {
    return {
      totalSpanMinutes,
      netMinutes: 0,
      isOvernight,
      isValid: false,
      validationError: 'Mola süresi toplam çalışma süresinden uzun veya eşit olamaz.',
    };
  }

  const netMinutes = totalSpanMinutes - breakMinutes;
  return {
    totalSpanMinutes,
    netMinutes,
    isOvernight,
    isValid: true,
  };
}

/**
 * Returns ISO week key (YYYY-MM-DD of Monday) for a given YYYY-MM-DD date.
 */
export function getWeekStartKey(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0=Sun, 1=Mon
  const diffToMonday = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diffToMonday);
  const wy = dt.getFullYear();
  const wm = String(dt.getMonth() + 1).padStart(2, '0');
  const wd = String(dt.getDate()).padStart(2, '0');
  return `${wy}-${wm}-${wd}`;
}

export function resolveOvertimeMultiplier(
  overtimeRatePercent: 50 | 100 | undefined,
  fallbackMultiplier: number
): number {
  if (overtimeRatePercent === 50) return 1.5;
  if (overtimeRatePercent === 100) return 2.0;
  return fallbackMultiplier;
}

/**
 * Calculates preview for a single entry considering existing entries on the same day/week
 * so normal hours are never double-counted.
 */
export function calculateEntryPreview(
  input: WorkEntryInput,
  settings: UserSettings,
  existingEntries: WorkEntry[]
): CalculationPreview {
  const hourlyRate = calculateHourlyRate(settings);
  const shift = calculateShiftMinutes(
    input.startTime,
    input.endTime,
    input.breakMinutes,
    input.workType,
    settings.dailyWorkHours
  );

  const planned = isFutureDate(input.date);

  if (!shift.isValid) {
    return {
      netMinutes: 0,
      regularMinutes: 0,
      overtimeMinutes: 0,
      estimatedEarnings: 0,
      isOvernight: shift.isOvernight,
      isPlanned: planned,
      hourlyRate,
      appliedMultiplier: 1,
      isValid: false,
      validationError: shift.validationError,
    };
  }

  const netMinutes = shift.netMinutes;
  let regularMinutes = 0;
  let overtimeMinutes = 0;
  let appliedMultiplier = 1;
  let estimatedEarnings = 0;

  if (input.workType === 'paid_leave') {
    regularMinutes = netMinutes;
    overtimeMinutes = 0;
    estimatedEarnings = 0;
  } else if (input.workType === 'unpaid_leave') {
    regularMinutes = 0;
    overtimeMinutes = 0;
    appliedMultiplier = -1;
    estimatedEarnings = -(hourlyRate * (netMinutes / 60));
  } else if (input.workType === 'overtime') {
    regularMinutes = 0;
    overtimeMinutes = netMinutes;
    appliedMultiplier = resolveOvertimeMultiplier(
      input.overtimeRatePercent,
      settings.overtimeMultiplier
    );
    estimatedEarnings = hourlyRate * appliedMultiplier * (netMinutes / 60);
  } else if (input.workType === 'weekend' || input.workType === 'holiday') {
    regularMinutes = 0;
    overtimeMinutes = netMinutes;
    appliedMultiplier = resolveOvertimeMultiplier(
      input.overtimeRatePercent,
      settings.weekendMultiplier
    );
    estimatedEarnings = hourlyRate * appliedMultiplier * (netMinutes / 60);
  } else {
    // 'normal' mesai: excess over daily or weekly target becomes overtime without double-counting
    const others = existingEntries.filter(
      (e) => e.id !== input.id && e.workType === 'normal'
    );

    if (settings.overtimeCalculationMode === 'weekly') {
      const targetWeek = getWeekStartKey(input.date);
      const alreadyNormalWeekMinutes = others
        .filter((e) => getWeekStartKey(e.date) === targetWeek)
        .reduce((acc, e) => acc + Math.max(0, e.calculatedDurationMinutes - e.overtimeDurationMinutes), 0);
      const weeklyTargetMinutes = Math.round(settings.weeklyWorkHours * 60);
      const remainingRegular = Math.max(0, weeklyTargetMinutes - alreadyNormalWeekMinutes);
      regularMinutes = Math.min(netMinutes, remainingRegular);
      overtimeMinutes = Math.max(0, netMinutes - regularMinutes);
    } else {
      const alreadyNormalDayMinutes = others
        .filter((e) => e.date === input.date)
        .reduce((acc, e) => acc + Math.max(0, e.calculatedDurationMinutes - e.overtimeDurationMinutes), 0);
      const dailyTargetMinutes = Math.round(settings.dailyWorkHours * 60);
      const remainingRegular = Math.max(0, dailyTargetMinutes - alreadyNormalDayMinutes);
      regularMinutes = Math.min(netMinutes, remainingRegular);
      overtimeMinutes = Math.max(0, netMinutes - regularMinutes);
    }

    const otMult = resolveOvertimeMultiplier(
      input.overtimeRatePercent,
      settings.overtimeMultiplier
    );
    appliedMultiplier = overtimeMinutes > 0 ? otMult : 1;
    estimatedEarnings =
      overtimeMinutes > 0
        ? hourlyRate * otMult * (overtimeMinutes / 60)
        : 0;
  }

  return {
    netMinutes,
    regularMinutes,
    overtimeMinutes,
    estimatedEarnings,
    isOvernight: shift.isOvernight,
    isPlanned: planned,
    hourlyRate,
    appliedMultiplier,
    isValid: true,
  };
}

/**
 * Re-evaluates all entries chronologically so daily/weekly normal overtime thresholds
 * and earnings stay exact and never double-count any minute.
 */
export function recalculateAllEntries(
  entries: WorkEntry[],
  settings: UserSettings
): WorkEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  const hourlyRate = calculateHourlyRate(settings);
  const dailyRegularUsed = new Map<string, number>();
  const weeklyRegularUsed = new Map<string, number>();

  const dailyTarget = Math.round(settings.dailyWorkHours * 60);
  const weeklyTarget = Math.round(settings.weeklyWorkHours * 60);

  return sorted.map((entry) => {
    const shift = calculateShiftMinutes(
      entry.startTime,
      entry.endTime,
      entry.breakMinutes,
      entry.workType,
      settings.dailyWorkHours
    );
    const netMinutes = shift.isValid ? shift.netMinutes : entry.calculatedDurationMinutes;
    const planned = isFutureDate(entry.date);

    let overtimeMinutes = 0;
    let estimatedEarnings = 0;

    if (entry.workType === 'paid_leave') {
      overtimeMinutes = 0;
      estimatedEarnings = 0;
    } else if (entry.workType === 'unpaid_leave') {
      overtimeMinutes = 0;
      estimatedEarnings = -(hourlyRate * (netMinutes / 60));
    } else if (entry.workType === 'overtime') {
      overtimeMinutes = netMinutes;
      const mult = resolveOvertimeMultiplier(
        entry.overtimeRatePercent,
        settings.overtimeMultiplier
      );
      estimatedEarnings = hourlyRate * mult * (netMinutes / 60);
    } else if (entry.workType === 'weekend' || entry.workType === 'holiday') {
      overtimeMinutes = netMinutes;
      const mult = resolveOvertimeMultiplier(
        entry.overtimeRatePercent,
        settings.weekendMultiplier
      );
      estimatedEarnings = hourlyRate * mult * (netMinutes / 60);
    } else {
      // normal
      let regularMinutes = 0;
      if (settings.overtimeCalculationMode === 'weekly') {
        const wk = getWeekStartKey(entry.date);
        const used = weeklyRegularUsed.get(wk) ?? 0;
        const remaining = Math.max(0, weeklyTarget - used);
        regularMinutes = Math.min(netMinutes, remaining);
        overtimeMinutes = Math.max(0, netMinutes - regularMinutes);
        weeklyRegularUsed.set(wk, used + regularMinutes);
      } else {
        const used = dailyRegularUsed.get(entry.date) ?? 0;
        const remaining = Math.max(0, dailyTarget - used);
        regularMinutes = Math.min(netMinutes, remaining);
        overtimeMinutes = Math.max(0, netMinutes - regularMinutes);
        dailyRegularUsed.set(entry.date, used + regularMinutes);
      }
      const mult = resolveOvertimeMultiplier(
        entry.overtimeRatePercent,
        settings.overtimeMultiplier
      );
      estimatedEarnings =
        overtimeMinutes > 0
          ? hourlyRate * mult * (overtimeMinutes / 60)
          : 0;
    }

    return {
      ...entry,
      calculatedDurationMinutes: netMinutes,
      overtimeDurationMinutes: overtimeMinutes,
      estimatedEarnings,
      isPlanned: planned,
    };
  });
}

/**
 * Checks if a candidate work entry overlaps with existing entries (including overnight spillover).
 */
export function detectEntryOverlaps(
  input: WorkEntryInput,
  existingEntries: WorkEntry[]
): OverlapConflict[] {
  if (input.workType === 'paid_leave' || input.workType === 'unpaid_leave') {
    return [];
  }

  const startMin = timeToMinutes(input.startTime);
  const endMinRaw = timeToMinutes(input.endTime);
  if (startMin === endMinRaw) return [];

  const toAbsoluteInterval = (dateStr: string, sTime: string, eTime: string): [number, number] => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayEpoch = Math.floor(Date.UTC(y, m - 1, d) / 60000);
    const s = timeToMinutes(sTime);
    const e = timeToMinutes(eTime);
    const endAbs = e < s ? dayEpoch + 1440 + e : dayEpoch + e;
    return [dayEpoch + s, endAbs];
  };

  const [candStart, candEnd] = toAbsoluteInterval(input.date, input.startTime, input.endTime);
  const conflicts: OverlapConflict[] = [];

  for (const existing of existingEntries) {
    if (existing.id === input.id) continue;
    if (existing.workType === 'paid_leave' || existing.workType === 'unpaid_leave') continue;

    const [exStart, exEnd] = toAbsoluteInterval(existing.date, existing.startTime, existing.endTime);
    if (candStart < exEnd && candEnd > exStart) {
      conflicts.push({
        conflictingEntry: existing,
        message: `${existing.date} tarihindeki ${existing.startTime}–${existing.endTime} (${WORK_TYPE_LABELS[existing.workType]}) kaydıyla çakışıyor.`,
      });
    }
  }

  return conflicts;
}

/**
 * Aggregates realized entries for any filtered set (week, month, year, or today).
 * Future planned entries are excluded from realized totals and counted in plannedCount.
 */
export function summarizeEntries(entries: WorkEntry[]): PeriodSummary {
  const today = getTodayDateString();
  const realized = entries.filter((e) => !e.isPlanned && e.date <= today);
  const planned = entries.filter((e) => e.isPlanned || e.date > today);

  let totalMinutes = 0;
  let overtimeMinutes = 0;
  let weekendMinutes = 0;
  let holidayMinutes = 0;
  let leaveDays = 0;
  let unpaidLeaveDeduction = 0;
  let overtimeEarnings = 0;
  let weekendAndHolidayEarnings = 0;

  const dayDurationMap = new Map<string, number>();

  for (const e of realized) {
    if (e.workType === 'paid_leave') {
      leaveDays += 1;
      continue;
    }
    if (e.workType === 'unpaid_leave') {
      leaveDays += 1;
      unpaidLeaveDeduction += Math.abs(e.estimatedEarnings);
      continue;
    }

    totalMinutes += e.calculatedDurationMinutes;
    overtimeMinutes += e.overtimeDurationMinutes;

    if (e.workType === 'weekend') {
      weekendMinutes += e.calculatedDurationMinutes;
      weekendAndHolidayEarnings += e.estimatedEarnings;
    } else if (e.workType === 'holiday') {
      holidayMinutes += e.calculatedDurationMinutes;
      weekendAndHolidayEarnings += e.estimatedEarnings;
    } else {
      overtimeEarnings += e.estimatedEarnings;
    }

    dayDurationMap.set(e.date, (dayDurationMap.get(e.date) ?? 0) + e.calculatedDurationMinutes);
  }

  const workedDaysCount = dayDurationMap.size;
  const averageDailyMinutes = workedDaysCount > 0 ? totalMinutes / workedDaysCount : 0;

  let longestDayDate: string | null = null;
  let longestDayMinutes = 0;
  for (const [date, mins] of dayDurationMap.entries()) {
    if (mins > longestDayMinutes) {
      longestDayMinutes = mins;
      longestDayDate = date;
    }
  }

  const regularMinutes = Math.max(0, totalMinutes - overtimeMinutes);
  const totalExtraEarnings = overtimeEarnings + weekendAndHolidayEarnings - unpaidLeaveDeduction;

  return {
    totalMinutes,
    regularMinutes,
    overtimeMinutes,
    weekendMinutes,
    holidayMinutes,
    leaveDays,
    unpaidLeaveDeduction,
    overtimeEarnings,
    weekendAndHolidayEarnings,
    totalExtraEarnings,
    workedDaysCount,
    averageDailyMinutes,
    longestDayDate,
    longestDayMinutes,
    plannedCount: planned.length,
  };
}

export function formatCurrency(amount: number, currency: CurrencyCode, decimals = 0): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.round(safe * Math.pow(10, decimals)) / Math.pow(10, decimals));

  const symbol = CURRENCY_CONFIG[currency]?.symbol ?? '₺';
  return `${formatted} ${symbol}`;
}

export function formatCompactCurrency(amount: number, currency: CurrencyCode): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const symbol = CURRENCY_CONFIG[currency]?.symbol ?? '₺';
  const sign = safe > 0 ? '+' : safe < 0 ? '-' : '';
  const abs = Math.abs(safe);
  const formatted = new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 0,
  }).format(abs);
  return `${sign}${formatted}${symbol}`;
}

export function formatDuration(totalMinutes: number): string {
  const rounded = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (h === 0 && m === 0) return '0 sa';
  if (m === 0) return `${h} sa`;
  if (h === 0) return `${m} dk`;
  return `${h} sa ${m} dk`;
}

export function formatHoursDecimal(totalMinutes: number): string {
  const hours = Math.max(0, totalMinutes) / 60;
  return `${new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(hours)} sa`;
}

export function formatTurkishDate(dateStr: string, withYear = false): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    ...(withYear ? { year: 'numeric' } : {}),
  }).format(dt);
}

export function formatMonthYear(year: number, monthZeroIndexed: number): string {
  const dt = new Date(year, monthZeroIndexed, 1);
  const raw = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(dt);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
