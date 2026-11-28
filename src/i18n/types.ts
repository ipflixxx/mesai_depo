export type AppLanguage =
  | 'tr'
  | 'en'
  | 'de'
  | 'fr'
  | 'es'
  | 'ar'
  | 'ru'
  | 'pt'
  | 'it'
  | 'hi';

export interface LanguageMeta {
  code: AppLanguage;
  nativeName: string;
  englishName: string;
  locale: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: readonly LanguageMeta[] = [
  { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish', locale: 'tr-TR', dir: 'ltr' },
  { code: 'en', nativeName: 'English', englishName: 'English', locale: 'en-US', dir: 'ltr' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', locale: 'de-DE', dir: 'ltr' },
  { code: 'fr', nativeName: 'Français', englishName: 'French', locale: 'fr-FR', dir: 'ltr' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', locale: 'es-ES', dir: 'ltr' },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', locale: 'ar', dir: 'rtl' },
  { code: 'ru', nativeName: 'Русский', englishName: 'Russian', locale: 'ru-RU', dir: 'ltr' },
  { code: 'pt', nativeName: 'Português', englishName: 'Portuguese', locale: 'pt-BR', dir: 'ltr' },
  { code: 'it', nativeName: 'Italiano', englishName: 'Italian', locale: 'it-IT', dir: 'ltr' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', locale: 'hi-IN', dir: 'ltr' },
] as const;

export const SUPPORTED_LANGUAGE_CODES: readonly AppLanguage[] = SUPPORTED_LANGUAGES.map(
  (l) => l.code
);

export type SevenDayTuple = readonly [string, string, string, string, string, string, string];

export interface TranslationSchema {
  meta: {
    appTitle: string;
  };
  common: {
    hoursShort: string;
    minutesShort: string;
    hoursCompact: string;
    minutesCompact: string;
    thousandSuffix: string;
    hourFull: string;
    daysUnit: string;
    workDaysUnit: string;
    close: string;
    cancel: string;
    save: string;
    update: string;
    delete: string;
    deleting: string;
    saving: string;
    back: string;
    continueBtn: string;
    retry: string;
    later: string;
    net: string;
    gross: string;
    normal: string;
    leave: string;
    planned: string;
    realized: string;
    addOvertime: string;
  };
  nav: {
    ariaLabel: string;
    home: string;
    stats: string;
    earnings: string;
    calculator: string;
    settings: string;
  };
  workTypes: {
    normal: string;
    overtime: string;
    weekend: string;
    holiday: string;
    paid_leave: string;
    unpaid_leave: string;
  };
  onboarding: {
    stepOf: string;
    heroTitle: string;
    heroSubtitle: string;
    tagline: string;
    languageLabel: string;
    step1Title: string;
    step1Subtitle: string;
    yourName: string;
    namePlaceholder: string;
    monthlySalary: string;
    salaryPlaceholder: string;
    salaryType: string;
    currency: string;
    paymentDay: string;
    step2Title: string;
    step2Subtitle: string;
    weeklyWorkDays: string;
    dailyWorkHours: string;
    weeklyNormalHours: string;
    workStart: string;
    workEnd: string;
    dailyBreakMinutes: string;
    step3Title: string;
    step3Subtitle: string;
    overtimeMultiplier: string;
    weekendMultiplier: string;
    overtimeCalcMode: string;
    dailyTarget: string;
    weeklyTarget: string;
    step4Title: string;
    step4Subtitle: string;
    themeDark: string;
    themeDarkDesc: string;
    themeLight: string;
    themeLightDesc: string;
    themeSystem: string;
    themeSystemDesc: string;
    finishSetup: string;
    doneTitle: string;
    doneSubtitle: string;
    doneMonthlySalary: string;
    doneHourlyRate: string;
    doneOvertimeMultiplier: string;
    goHome: string;
    errors: {
      nameRequired: string;
      salaryRequired: string;
      paymentDayRange: string;
      weeklyDaysRange: string;
      dailyHoursRange: string;
      weeklyHoursRange: string;
      breakRange: string;
      otMultiplierMin: string;
      wkMultiplierMin: string;
    };
  };
  dashboard: {
    hello: string;
    helloNamed: string;
    switchToLight: string;
    switchToDark: string;
    lightThemeTitle: string;
    darkThemeTitle: string;
    thisMonthEarnings: string;
    periodEarnings: string;
    extraAmount: string;
    fixedSalary: string;
    overtimeMinutesLabel: string;
    rateNormal: string;
    rate50: string;
    rate100: string;
    recentSummaryTitle: string;
    detailedAnalysis: string;
    monthlyFixedSalary: string;
    overtimeEarningsLabel: string;
    weekendHolidayEarnings: string;
    unpaidLeaveDeduction: string;
    estimatedTotalForMonth: string;
  };
  calendar: {
    ariaLabel: string;
    viewModeAria: string;
    calendarViewAria: string;
    listViewAria: string;
    calendarTab: string;
    listTab: string;
    todayShort: string;
    todayFull: string;
    prevMonthAria: string;
    nextMonthAria: string;
    weekdays: SevenDayTuple;
    weekdaysFull: SevenDayTuple;
    legendNormal: string;
    legend50: string;
    legend100: string;
    legendLeave: string;
    rate50Title: string;
    rate100Title: string;
    cellAriaWithEntries: string;
    deleteEntryAria: string;
    deleteEntryTitle: string;
    emptyMonth: string;
    colDateAndType: string;
    colDate: string;
    colType: string;
    colDuration: string;
    colEarnings: string;
    colNotes: string;
    colAction: string;
  };
  earningsPage: {
    title: string;
    subtitle: string;
    monthEarned: string;
    fixedSalaryLabel: string;
    from50: string;
    from100: string;
    overtimeSuffix: string;
    thisMonthExtra: string;
    allTimeExtra: string;
    monthRecordsTitle: string;
    recordsCount: string;
    noRecordsThisMonth: string;
  };
  stats: {
    title: string;
    subtitle: string;
    weekly: string;
    monthly: string;
    yearly: string;
    emptyTitle: string;
    emptyDesc: string;
    totalWork: string;
    overtimeHours: string;
    overtimeEarnings: string;
    weekendAndHoliday: string;
    workedDays: string;
    averageDailyWork: string;
    longestWorkDay: string;
    dailyWorkHoursTitle: string;
    dailyWorkHoursDesc: string;
    tooltipNormal: string;
    tooltipOvertime: string;
    dailyExtraEarningsTitle: string;
    dailyExtraEarningsDesc: string;
    tooltipExtraEarnings: string;
    monthlyComparisonTitle: string;
    monthlyComparisonDesc: string;
    tooltipFixedSalary: string;
    tooltipExtra: string;
  };
  calculators: {
    title: string;
    subtitle: string;
    tabRaise: string;
    tabSeverance: string;
    tabOvertime: string;
    tabLeave: string;
    raiseTitle: string;
    raiseDesc: string;
    raiseModePercent: string;
    raiseModeTarget: string;
    currentMonthlySalary: string;
    raisePercentLabel: string;
    targetSalaryLabel: string;
    newMonthlySalary: string;
    raiseRateResult: string;
    monthlyDiff: string;
    annualDiff: string;
    newHourly: string;
    severanceTitle: string;
    severanceDesc: string;
    hireDate: string;
    exitDate: string;
    monthlyGrossSalary: string;
    monthlyBenefits: string;
    includeNoticeLabel: string;
    included: string;
    excluded: string;
    estimatedTotalSeverance: string;
    workDuration: string;
    durationFormat: string;
    invalidDate: string;
    netSeveranceLabel: string;
    underOneYear: string;
    grossNoticeLabel: string;
    severanceNote: string;
    overtimeTitle: string;
    overtimeDesc: string;
    monthlySalaryLabel: string;
    weeklyNormalHours: string;
    overtimeHoursLabel: string;
    earnedOvertimeAmount: string;
    normalHourly: string;
    leaveTitle: string;
    leaveDesc: string;
    tenureYears: string;
    unusedLeaveDays: string;
    annualLeaveEntitlement: string;
    unusedLeavePayout: string;
    leaveNote: string;
  };
  entryModal: {
    editTitle: string;
    addTitle: string;
    dateAria: string;
    catOvertime: string;
    catNormal: string;
    catWeekend: string;
    catLeave: string;
    subWeekend: string;
    subHoliday: string;
    subPaidLeave: string;
    subUnpaidLeave: string;
    howManyHours: string;
    enterTimeRange: string;
    enterHoursOnly: string;
    decreaseHalfHourAria: string;
    increaseHalfHourAria: string;
    hoursAria: string;
    quickHourChip: string;
    timeRangeLabel: string;
    startTime: string;
    endTime: string;
    breakMinutes: string;
    overtimeRateLabel: string;
    addNoteToggle: string;
    notePlaceholder: string;
    plannedNotice: string;
    invalidDuration: string;
    errSelectDate: string;
    errHoursRange: string;
    errGenericSave: string;
    errSameStartEnd: string;
    errNegativeBreak: string;
    errBreakTooLong: string;
    overlapMessage: string;
  };
  deleteModal: {
    title: string;
    irreversible: string;
    confirmBody: string;
  };
  settings: {
    title: string;
    subtitle: string;
    languageTitle: string;
    languageDesc: string;
    languageSystemAuto: string;
    personalInfo: string;
    perHour: string;
    userName: string;
    monthlySalary: string;
    salaryType: string;
    currency: string;
    paymentDay: string;
    workSchedule: string;
    weeklyDays: string;
    dailyHours: string;
    weeklyHours: string;
    start: string;
    end: string;
    breakMin: string;
    otMultiplier: string;
    wkMultiplier: string;
    otCalcBasis: string;
    dailyTarget: string;
    weeklyTarget: string;
    autoRecalcNote: string;
    saveInfoBtn: string;
    savedSuccess: string;
    appearance: string;
    themeDark: string;
    themeLight: string;
    themeSystem: string;
    dataManagement: string;
    exportCsv: string;
    pdfReport: string;
    jsonBackup: string;
    jsonRestore: string;
    restoreSuccess: string;
    restoreFailed: string;
    appSection: string;
    aboutTitle: string;
    aboutDirect: string;
    aboutPlay: string;
    privacyTitle: string;
    privacyBody: string;
    adsTitle: string;
    adsBody: string;
    checkingVersion: string;
    viewNewUpdate: string;
    checkUpdates: string;
    upToDate: string;
    newVersionFound: string;
    playUpdateAvailable: string;
    confirmReset: string;
    resetAllData: string;
    errors: {
      invalidSalary: string;
      paymentDayRange: string;
      weeklyDaysRange: string;
      dailyHoursRange: string;
      weeklyHoursRange: string;
      breakRange: string;
      otMultiplierMin: string;
      wkMultiplierMin: string;
    };
  };
  alarm: {
    sectionAria: string;
    title: string;
    desc: string;
    toggleAria: string;
    statusLabel: string;
    active: string;
    inactive: string;
    unsavedChanges: string;
    nextAlarm: string;
    noNextTrigger: string;
    todayAlreadyRecorded: string;
    alarmTime: string;
    repeatDays: string;
    bgPermissionsTitle: string;
    notifPermDesc: string;
    exactAlarmDesc: string;
    batteryDesc: string;
    grantNotifPerm: string;
    exactAlarmBtn: string;
    batteryBtn: string;
    errSelectOneDay: string;
    savedActive: string;
    savedInactive: string;
    errSaveFailed: string;
    errTestFailed: string;
    saveAlarmBtn: string;
    stopAlarmBtn: string;
    testAlarmBtn: string;
    native: {
      channelName: string;
      channelDesc: string;
      fallbackChannelName: string;
      fallbackChannelDesc: string;
      titleReminder: string;
      bodyReminder: string;
      titleTest: string;
      bodyTestRinging: string;
      titleTestDone: string;
      bodyTestDone: string;
      bodyTestFallback: string;
      stopAction: string;
    };
  };
  updater: {
    mandatoryBadge: string;
    optionalBadge: string;
    modalTitle: string;
    currentVersion: string;
    newVersion: string;
    buildNumber: string;
    newVersionFallback: string;
    releaseNotes: string;
    sha256Integrity: string;
    downloadingProgress: string;
    verifying: string;
    installing: string;
    playAndroidOnly: string;
    directAndroidOnly: string;
    downloadingStart: string;
    permissionRequired: string;
    sha256Verified: string;
    errPlayStart: string;
    errApkDownload: string;
    openInstallPerm: string;
    mandatoryNote: string;
    updateViaPlay: string;
    downloadUpdate: string;
    serviceErrors: {
      invalidManifest: string;
      appIdMismatch: string;
      invalidVersion: string;
      untrustedUrl: string;
      invalidSha256: string;
      playCheckFailed: string;
      noReleaseYet: string;
      serverHttpError: string;
      connectionError: string;
    };
  };
  export: {
    csvHeaders: readonly [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string
    ];
    errInvalidBackup: string;
    errCorruptBackupSettings: string;
    pdfTagline: string;
    pdfReportTitle: string;
    pdfPreparedFor: string;
    pdfPersonalSummary: string;
    pdfTotalEarnings: string;
    pdfFixedSub: string;
    pdfExtraEarnings: string;
    pdfHourlySub: string;
    pdfTotalAndOvertime: string;
    pdfOvertimeSub: string;
    pdfRecordsTitle: string;
    pdfColDate: string;
    pdfColTime: string;
    pdfColType: string;
    pdfColNet: string;
    pdfColOvertime: string;
    pdfColExtra: string;
    pdfEmpty: string;
    pdfGrossNote: string;
    pdfPrivacyNote: string;
  };
}
