import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calendar, ChevronDown, Minus, Plus, Trash2, X } from 'lucide-react';
import { useMesai } from '../context/MesaiContext';
import { adService } from '../services/adService';
import { WorkEntryInput, WorkType } from '../types/mesai';
import { NumericInput, parseLocaleNumber } from './NumericInput';
import {
  WORK_TYPE_LABELS,
  calculateEntryPreview,
  detectEntryOverlaps,
  formatCurrency,
  formatDuration,
  getTodayDateString,
  timeToMinutes,
} from '../utils/calculations';

const QUICK_HOURS = [1, 2, 4, 8];

function minutesToTimeString(totalMinutes: number): string {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const WorkEntryModal: React.FC = () => {
  const {
    settings,
    entries,
    modalState,
    closeEntryModal,
    addEntry,
    updateEntry,
    requestDeleteEntry,
  } = useMesai();

  const { isOpen, editingEntry, defaultDate } = modalState;

  const [date, setDate] = useState(defaultDate);
  const [workType, setWorkType] = useState<WorkType>('overtime');
  const [overtimeRatePercent, setOvertimeRatePercent] = useState<50 | 100>(50);
  const [hoursInput, setHoursInput] = useState<string>('2');

  // Advanced / optional states (collapsed by default for simplicity)
  const [useTimeRange, setUseTimeRange] = useState(false);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');
  const [breakMinutesInput, setBreakMinutesInput] = useState('0');
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pick a non-overlapping start time automatically when using simple hour entry
  const findNextFreeStartTime = (targetDate: string, preferredStart: string): string => {
    const dayEntries = entries.filter((e) => e.date === targetDate && e.id !== editingEntry?.id);
    if (dayEntries.length === 0) return preferredStart;
    let latestEnd = timeToMinutes(preferredStart);
    for (const e of dayEntries) {
      if (e.workType === 'paid_leave' || e.workType === 'unpaid_leave') continue;
      const s = timeToMinutes(e.startTime);
      const end = timeToMinutes(e.endTime);
      const absEnd = end < s ? end + 1440 : end;
      if (absEnd > latestEnd && absEnd < 1440) {
        latestEnd = absEnd;
      }
    }
    return minutesToTimeString(latestEnd);
  };

  useEffect(() => {
    if (!isOpen) return;
    setSubmitError(null);

    if (editingEntry) {
      setDate(editingEntry.date);
      setWorkType(editingEntry.workType);
      setOvertimeRatePercent(
        editingEntry.overtimeRatePercent ??
          (editingEntry.workType === 'weekend' || editingEntry.workType === 'holiday'
            ? 100
            : 50)
      );
      setHoursInput(
        String(Number((editingEntry.calculatedDurationMinutes / 60).toFixed(2)))
      );
      setStartTime(editingEntry.startTime);
      setEndTime(editingEntry.endTime);
      setBreakMinutesInput(String(editingEntry.breakMinutes));
      setUseTimeRange(editingEntry.breakMinutes > 0);
      setNotes(editingEntry.notes);
      setShowNotes(Boolean(editingEntry.notes));
    } else {
      const targetDate = defaultDate || getTodayDateString();
      const [y, m, d] = targetDate.split('-').map(Number);
      const dayOfWeek = new Date(y, m - 1, d).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      setDate(targetDate);
      setWorkType(isWeekend ? 'weekend' : 'overtime');
      setOvertimeRatePercent(isWeekend ? 100 : 50);

      const defaultHours = isWeekend ? settings.dailyWorkHours || 8 : 2;
      setHoursInput(String(defaultHours));

      const preferredStart = isWeekend
        ? settings.workStartTime || '09:00'
        : settings.workEndTime || '18:00';
      const autoStart = findNextFreeStartTime(targetDate, preferredStart);
      setStartTime(autoStart);
      setEndTime(
        minutesToTimeString(timeToMinutes(autoStart) + Math.round(defaultHours * 60))
      );
      setBreakMinutesInput('0');
      setUseTimeRange(false);
      setNotes('');
      setShowNotes(false);
    }
  }, [isOpen, editingEntry, defaultDate, settings]);

  const isLeave = workType === 'paid_leave' || workType === 'unpaid_leave';

  const effectiveEndTime = useMemo(() => {
    if (useTimeRange) return endTime;
    const hrs = parseLocaleNumber(hoursInput);
    if (hrs === null || hrs <= 0) return startTime;
    return minutesToTimeString(timeToMinutes(startTime) + Math.round(hrs * 60));
  }, [useTimeRange, hoursInput, startTime, endTime]);

  const effectiveBreak =
    useTimeRange && !isLeave ? Math.max(0, Math.round(parseLocaleNumber(breakMinutesInput) ?? 0)) : 0;

  const inputPayload: WorkEntryInput = useMemo(
    () => ({
      id: editingEntry?.id,
      date,
      startTime,
      endTime: effectiveEndTime,
      breakMinutes: effectiveBreak,
      workType,
      overtimeRatePercent: isLeave ? undefined : overtimeRatePercent,
      notes,
    }),
    [
      editingEntry?.id,
      date,
      startTime,
      effectiveEndTime,
      effectiveBreak,
      workType,
      isLeave,
      overtimeRatePercent,
      notes,
    ]
  );

  const preview = useMemo(
    () => calculateEntryPreview(inputPayload, settings, entries),
    [inputPayload, settings, entries]
  );

  const overlaps = useMemo(
    () => (useTimeRange ? detectEntryOverlaps(inputPayload, entries) : []),
    [useTimeRange, inputPayload, entries]
  );

  if (!isOpen) return null;

  const selectCategory = (cat: 'overtime' | 'normal' | 'weekend' | 'leave') => {
    if (cat === 'overtime') {
      setWorkType('overtime');
      setOvertimeRatePercent(50);
      if (!editingEntry) setHoursInput('2');
    } else if (cat === 'normal') {
      setWorkType('normal');
      setOvertimeRatePercent(50);
      if (!editingEntry) setHoursInput(String(settings.dailyWorkHours || 8));
    } else if (cat === 'weekend') {
      setWorkType('weekend');
      setOvertimeRatePercent(100);
      if (!editingEntry) setHoursInput(String(settings.dailyWorkHours || 8));
    } else {
      setWorkType('paid_leave');
      setBreakMinutesInput('0');
    }
  };

  const activeCategory: 'overtime' | 'normal' | 'weekend' | 'leave' =
    workType === 'paid_leave' || workType === 'unpaid_leave'
      ? 'leave'
      : workType === 'weekend' || workType === 'holiday'
      ? 'weekend'
      : workType === 'normal'
      ? 'normal'
      : 'overtime';

  const parsedHoursValue = parseLocaleNumber(hoursInput) ?? 0;

  const adjustHours = (delta: number) => {
    const base = parsedHoursValue > 0 ? parsedHoursValue : 0;
    const next = Math.min(24, Math.max(0.5, Math.round((base + delta) * 2) / 2));
    setHoursInput(String(next));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!date) {
      setSubmitError('Lütfen bir tarih seçin.');
      return;
    }
    if (!useTimeRange && !isLeave) {
      const parsed = parseLocaleNumber(hoursInput);
      if (parsed === null || parsed <= 0 || parsed > 24) {
        setSubmitError('Lütfen 0,5 ile 24 saat arasında bir süre girin.');
        return;
      }
    }
    if (!preview.isValid) {
      setSubmitError(preview.validationError || 'Lütfen geçerli bir süre girin.');
      return;
    }

    setIsSubmitting(true);
    let savedNewEntry = false;
    try {
      if (editingEntry) {
        await updateEntry(editingEntry.id, inputPayload);
      } else {
        await addEntry(inputPayload);
        savedNewEntry = true;
      }
      closeEntryModal();
    } catch {
      setSubmitError('Kayıt sırasında bir sorun oluştu. Lütfen tekrar deneyin.');
      return;
    } finally {
      setIsSubmitting(false);
    }

    if (savedNewEntry) {
      void adService.recordSuccessfulWorkEntrySave();
    }
  };

  const handleDelete = () => {
    if (!editingEntry) return;
    requestDeleteEntry(editingEntry);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
      onClick={closeEntryModal}
    >
      <div
        className="w-full sm:max-w-md max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#C8D3CD] dark:border-white/[0.09] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1.5 rounded-full bg-[#77827B]/30 dark:bg-[#929B95]/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#D7E0DA] dark:border-white/[0.06]">
          <h2 className="text-base font-bold text-[#17221B] dark:text-[#F4F7F5]">
            {editingEntry ? 'Kaydı Düzenle' : 'Mesai Ekle'}
          </h2>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Tarih"
              className="min-h-[36px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-2.5 font-mono text-xs text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
            />
            <button
              type="button"
              onClick={closeEntryModal}
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-[#77827B] dark:text-[#929B95] hover:bg-[#EEF2EF] dark:hover:bg-[#222925]"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Simplified Body */}
        <form onSubmit={handleSave} className="overflow-y-auto px-5 py-4 space-y-4">
          {/* 1. Mesai Türü (4 Sade Seçenek) */}
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: 'overtime', label: 'Fazla Mesai' },
                { id: 'normal', label: 'Normal Mesai' },
                { id: 'weekend', label: 'Hafta Sonu / Tatil' },
                { id: 'leave', label: 'İzin' },
              ] as const
            ).map((item) => {
              const active = activeCategory === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectCategory(item.id)}
                  className={`min-h-[44px] px-3 rounded-2xl text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211]'
                      : 'bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Sub-selector only when Weekend/Holiday or Leave is selected */}
          {activeCategory === 'weekend' && (
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07]">
              <button
                type="button"
                onClick={() => setWorkType('weekend')}
                className={`min-h-[34px] rounded-lg text-xs font-medium transition-colors ${
                  workType === 'weekend'
                    ? 'bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5]'
                    : 'text-[#77827B] dark:text-[#929B95]'
                }`}
              >
                Hafta sonu
              </button>
              <button
                type="button"
                onClick={() => setWorkType('holiday')}
                className={`min-h-[34px] rounded-lg text-xs font-medium transition-colors ${
                  workType === 'holiday'
                    ? 'bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5]'
                    : 'text-[#77827B] dark:text-[#929B95]'
                }`}
              >
                Resmî tatil
              </button>
            </div>
          )}

          {activeCategory === 'leave' && (
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07]">
              <button
                type="button"
                onClick={() => setWorkType('paid_leave')}
                className={`min-h-[34px] rounded-lg text-xs font-medium transition-colors ${
                  workType === 'paid_leave'
                    ? 'bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5]'
                    : 'text-[#77827B] dark:text-[#929B95]'
                }`}
              >
                Ücretli izin
              </button>
              <button
                type="button"
                onClick={() => setWorkType('unpaid_leave')}
                className={`min-h-[34px] rounded-lg text-xs font-medium transition-colors ${
                  workType === 'unpaid_leave'
                    ? 'bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5]'
                    : 'text-[#77827B] dark:text-[#929B95]'
                }`}
              >
                Ücretsiz izin
              </button>
            </div>
          )}

          {/* 2. Saat & %50 / %100 Seçimi */}
          {!isLeave && (
            <>
              {!useTimeRange ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#77827B] dark:text-[#929B95]">
                      Kaç saat?
                    </label>
                    <button
                      type="button"
                      onClick={() => setUseTimeRange(true)}
                      className="text-xs font-medium text-[#159B61] dark:text-[#39D98A] flex items-center gap-1"
                    >
                      <span>Saat aralığı gir</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] p-1.5">
                    <button
                      type="button"
                      onClick={() => adjustHours(-0.5)}
                      disabled={parsedHoursValue <= 0.5}
                      aria-label="Saati yarım saat azalt"
                      className="min-h-[44px] min-w-[48px] flex items-center justify-center rounded-xl bg-[#FFFFFF] dark:bg-[#191E1B] text-[#17221B] dark:text-[#F4F7F5] border border-[#C8D3CD] dark:border-white/[0.08] active:scale-95 transition-transform disabled:opacity-35"
                    >
                      <Minus className="w-4 h-4 stroke-[2.5]" />
                    </button>

                    <div className="flex-1 flex items-center justify-center gap-1.5 px-2">
                      <NumericInput
                        allowDecimal
                        aria-label="Mesai saati"
                        value={hoursInput}
                        onChange={(val) => {
                          setSubmitError(null);
                          setHoursInput(val);
                        }}
                        placeholder="0"
                        className="w-16 bg-transparent text-center font-mono text-xl font-bold text-[#17221B] dark:text-[#F4F7F5] tabular-nums focus:outline-none"
                      />
                      <span className="text-xs font-medium text-[#77827B] dark:text-[#929B95] select-none">
                        saat
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => adjustHours(0.5)}
                      disabled={parsedHoursValue >= 24}
                      aria-label="Saati yarım saat artır"
                      className="min-h-[44px] min-w-[48px] flex items-center justify-center rounded-xl bg-[#FFFFFF] dark:bg-[#191E1B] text-[#17221B] dark:text-[#F4F7F5] border border-[#C8D3CD] dark:border-white/[0.08] active:scale-95 transition-transform disabled:opacity-35"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {QUICK_HOURS.map((h) => {
                      const active = parseLocaleNumber(hoursInput) === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setHoursInput(String(h))}
                          className={`min-h-[40px] rounded-xl font-mono text-xs font-semibold transition-colors ${
                            active
                              ? 'bg-[#17221B] dark:bg-[#F4F7F5] text-white dark:text-[#101211]'
                              : 'bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5]'
                          }`}
                        >
                          {h} saat
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#77827B] dark:text-[#929B95]">
                      Saat aralığı
                    </label>
                    <button
                      type="button"
                      onClick={() => setUseTimeRange(false)}
                      className="text-xs font-medium text-[#159B61] dark:text-[#39D98A]"
                    >
                      Sadece saat gir
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-[#77827B] dark:text-[#929B95] mb-1">
                        Başlangıç
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-2.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#77827B] dark:text-[#929B95] mb-1">
                        Bitiş
                      </label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-2.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#77827B] dark:text-[#929B95] mb-1">
                        Mola (dk)
                      </label>
                      <NumericInput
                        value={breakMinutesInput}
                        onChange={setBreakMinutesInput}
                        placeholder="0"
                        className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-2.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* %50 / %100 Seçimi */}
              <div>
                <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                  Mesai oranı
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOvertimeRatePercent(50)}
                    className={`min-h-[46px] rounded-2xl px-3 flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors ${
                      overtimeRatePercent === 50
                        ? 'bg-[#D97706] dark:bg-[#F59E0B] text-white dark:text-[#101211]'
                        : 'bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5]'
                    }`}
                  >
                    <span className="font-mono font-bold">%50</span>
                    <span className="text-xs opacity-80">(1.5x)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOvertimeRatePercent(100)}
                    className={`min-h-[46px] rounded-2xl px-3 flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors ${
                      overtimeRatePercent === 100
                        ? 'bg-[#7C3AED] dark:bg-[#A78BFA] text-white dark:text-[#101211]'
                        : 'bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5]'
                    }`}
                  >
                    <span className="font-mono font-bold">%100</span>
                    <span className="text-xs opacity-80">(2.0x)</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Optional Note Toggle */}
          {!showNotes ? (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="text-xs font-medium text-[#77827B] dark:text-[#929B95] hover:text-[#17221B] dark:hover:text-[#F4F7F5]"
            >
              + Not ekle (isteğe bağlı)
            </button>
          ) : (
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Not (ör. akşam mesaisi)"
              className="w-full min-h-[42px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 text-sm text-[#17221B] dark:text-[#F4F7F5] placeholder:text-[#77827B]/60 dark:placeholder:text-[#929B95]/60 focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
            />
          )}

          {preview.isPlanned && (
            <div className="flex items-center gap-2 rounded-xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3 py-2 text-xs text-[#77827B] dark:text-[#929B95]">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Gelecek tarihli kayıtlar planlı olarak saklanır.</span>
            </div>
          )}

          {overlaps.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-500/12 border border-amber-500/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{overlaps[0].message}</div>
            </div>
          )}

          {/* Single Clean Summary Row */}
          <div className="rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-4 py-3.5 flex items-center justify-between gap-3">
            <div className="text-xs text-[#77827B] dark:text-[#929B95]">
              {preview.isValid
                ? isLeave
                  ? WORK_TYPE_LABELS[workType]
                  : `${formatDuration(preview.netMinutes)} · %${overtimeRatePercent}`
                : 'Geçersiz süre'}
            </div>
            <div className="font-mono text-lg font-bold text-[#159B61] dark:text-[#39D98A] tabular-nums">
              {preview.isValid
                ? `${preview.estimatedEarnings > 0 ? '+' : ''}${formatCurrency(
                    preview.estimatedEarnings,
                    settings.currency
                  )}`
                : '—'}
            </div>
          </div>

          {(submitError || (!preview.isValid && preview.validationError)) && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              {submitError || preview.validationError}
            </p>
          )}

          {/* Action Buttons */}
          <div className="pt-1 pb-safe flex items-center gap-2.5">
            {editingEntry && (
              <button
                type="button"
                onClick={handleDelete}
                className="min-h-[48px] px-4 rounded-2xl text-sm font-medium flex items-center justify-center gap-1.5 transition-colors bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-red-600 dark:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sil</span>
              </button>
            )}
            <button
              type="submit"
              disabled={!preview.isValid}
              className="flex-1 min-h-[48px] rounded-2xl bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211] font-semibold text-sm disabled:opacity-40 transition-transform active:scale-[0.98]"
            >
              {editingEntry ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
