export type SalaryType = 'net' | 'gross';

export type CurrencyCode = 'TRY' | 'USD' | 'EUR';

export type ThemeMode = 'dark' | 'light' | 'system';

export type OvertimeCalculationMode = 'daily' | 'weekly';

export type WorkType =
  | 'normal'
  | 'overtime'
  | 'weekend'
  | 'holiday'
  | 'paid_leave'
  | 'unpaid_leave';

export interface UserSettings {
  userName: string;
  monthlySalary: number;
  salaryType: SalaryType;
  currency: CurrencyCode;
  paymentDay: number;
  dailyWorkHours: number;
  weeklyWorkDays: number;
  weeklyWorkHours: number;
  workStartTime: string;
  workEndTime: string;
  breakMinutes: number;
  overtimeMultiplier: number;
  weekendMultiplier: number;
  overtimeCalculationMode: OvertimeCalculationMode;
  themeMode: ThemeMode;
  onboardingCompleted: boolean;
}

export interface WorkEntry {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakMinutes: number;
  workType: WorkType;
  overtimeRatePercent?: 50 | 100;
  notes: string;
  calculatedDurationMinutes: number;
  overtimeDurationMinutes: number;
  estimatedEarnings: number;
  isPlanned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkEntryInput {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  workType: WorkType;
  overtimeRatePercent?: 50 | 100;
  notes: string;
}

export interface CalculationPreview {
  netMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  estimatedEarnings: number;
  isOvernight: boolean;
  isPlanned: boolean;
  hourlyRate: number;
  appliedMultiplier: number;
  isValid: boolean;
  validationError?: string;
}

export interface OverlapConflict {
  conflictingEntry: WorkEntry;
  message: string;
}

export interface PeriodSummary {
  totalMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  weekendMinutes: number;
  holidayMinutes: number;
  leaveDays: number;
  unpaidLeaveDeduction: number;
  overtimeEarnings: number;
  weekendAndHolidayEarnings: number;
  totalExtraEarnings: number;
  workedDaysCount: number;
  averageDailyMinutes: number;
  longestDayDate: string | null;
  longestDayMinutes: number;
  plannedCount: number;
}

export interface BackupPayload {
  app: 'MESAI';
  version: string;
  exportedAt: string;
  settings: UserSettings;
  entries: WorkEntry[];
}
