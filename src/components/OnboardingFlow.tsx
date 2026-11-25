import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Moon, Smartphone, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMesai } from '../context/MesaiContext';
import { CurrencyCode, SalaryType, ThemeMode, UserSettings } from '../types/mesai';
import {
  DEFAULT_SETTINGS,
  calculateHourlyRate,
  formatCurrency,
} from '../utils/calculations';

const TOTAL_STEPS = 4;

export const OnboardingFlow: React.FC = () => {
  const { settings, completeOnboarding, updateSettings } = useMesai();
  const [step, setStep] = useState<number>(1);
  const [isDone, setIsDone] = useState<boolean>(false);

  const [form, setForm] = useState<UserSettings>({
    ...DEFAULT_SETTINGS,
    ...settings,
    currency: settings.currency || 'TRY',
    overtimeMultiplier: settings.overtimeMultiplier || 1.5,
    weekendMultiplier: settings.weekendMultiplier || 2.0,
    themeMode: settings.themeMode || 'dark',
  });
  const [salaryText, setSalaryText] = useState<string>(
    form.monthlySalary > 0 ? String(form.monthlySalary) : ''
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.__mesaiHandleAndroidBack = () => {
      if (isDone) {
        setIsDone(false);
        return 'handled';
      }
      if (step > 1) {
        setError(null);
        setStep((s) => s - 1);
        return 'handled';
      }
      return 'exit';
    };
    return () => {
      delete window.__mesaiHandleAndroidBack;
    };
  }, [isDone, step]);

  const handleThemeSelect = (mode: ThemeMode) => {
    setForm((prev) => ({ ...prev, themeMode: mode }));
    void updateSettings({ themeMode: mode });
  };

  const handleDailyOrDaysChange = (dailyHours: number, weeklyDays: number) => {
    const safeDaily = Math.max(1, Math.min(24, dailyHours));
    const safeDays = Math.max(1, Math.min(7, weeklyDays));
    setForm((prev) => ({
      ...prev,
      dailyWorkHours: safeDaily,
      weeklyWorkDays: safeDays,
      weeklyWorkHours: Number((safeDaily * safeDays).toFixed(1)),
    }));
  };

  const validateAndNext = () => {
    setError(null);
    if (step === 1) {
      const parsedSalary = Number(salaryText.replace(',', '.'));
      if (!form.userName.trim()) {
        setError('Lütfen adınızı girin.');
        return;
      }
      if (!Number.isFinite(parsedSalary) || parsedSalary <= 0) {
        setError('Lütfen geçerli bir aylık maaş tutarı girin.');
        return;
      }
      setForm((prev) => ({ ...prev, monthlySalary: parsedSalary }));
    }

    if (step === 2) {
      if (form.dailyWorkHours <= 0 || form.weeklyWorkDays <= 0) {
        setError('Çalışma süresi ve gün sayısı 0’dan büyük olmalıdır.');
        return;
      }
    }

    if (step === 3) {
      if (form.overtimeMultiplier < 1 || form.weekendMultiplier < 1) {
        setError('Mesai çarpanları en az 1.0 olmalıdır.');
        return;
      }
    }

    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      setIsDone(true);
    }
  };

  const handleFinish = async () => {
    const parsedSalary = Number(salaryText.replace(',', '.')) || form.monthlySalary;
    await completeOnboarding({
      ...form,
      monthlySalary: parsedSalary,
      onboardingCompleted: true,
    });
  };

  const hourlyPreview = calculateHourlyRate({
    ...form,
    monthlySalary: Number(salaryText.replace(',', '.')) || form.monthlySalary,
  });

  if (isDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F8F6] dark:bg-[#101211] px-4 py-8 pt-safe pb-safe">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-black/[0.06] dark:border-white/[0.07] p-7 text-center"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#159B61]/12 dark:bg-[#39D98A]/15 flex items-center justify-center mb-5">
            <Check className="w-7 h-7 text-[#159B61] dark:text-[#39D98A]" />
          </div>
          <h1 className="text-2xl font-bold text-[#17221B] dark:text-[#F4F7F5] tracking-tight">
            Her şey hazır!
          </h1>
          <p className="mt-2 text-sm text-[#77827B] dark:text-[#929B95] leading-relaxed">
            Çalışma düzenin kaydedildi. Artık mesailerini girerek kazancını anında takip edebilirsin.
          </p>

          <div className="mt-6 rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] p-4 text-left space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[#77827B] dark:text-[#929B95]">
              <span>Aylık maaş</span>
              <span className="font-mono font-semibold text-[#17221B] dark:text-[#F4F7F5] tabular-nums">
                {formatCurrency(Number(salaryText) || form.monthlySalary, form.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#77827B] dark:text-[#929B95]">
              <span>Hesaplanan saatlik ücret</span>
              <span className="font-mono font-semibold text-[#159B61] dark:text-[#39D98A] tabular-nums">
                {formatCurrency(hourlyPreview, form.currency, 2)} / sa
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#77827B] dark:text-[#929B95]">
              <span>Fazla mesai çarpanı</span>
              <span className="font-mono font-semibold text-[#17221B] dark:text-[#F4F7F5] tabular-nums">
                {form.overtimeMultiplier}x
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="mt-6 w-full min-h-[48px] rounded-2xl bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211] font-semibold text-sm tracking-tight transition-transform active:scale-[0.98]"
          >
            Ana Ekrana Geç
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F6F8F6] dark:bg-[#101211] px-4 py-6 sm:py-10 pt-safe pb-safe">
      <div className="w-full max-w-lg mx-auto">
        {/* Brand & Progress */}
        <div className="flex items-center justify-between mb-8">
          <span className="font-display text-lg font-extrabold tracking-tight text-[#17221B] dark:text-[#F4F7F5]">
            MESAİ
          </span>
          <span className="font-mono text-xs text-[#77827B] dark:text-[#929B95] tabular-nums">
            Adım {step} / {TOTAL_STEPS}
          </span>
        </div>

        {/* Hero Heading */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#17221B] dark:text-[#F4F7F5] tracking-tight text-balance">
            Mesaini ve kazancını kontrol altına al.
          </h1>
          <p className="mt-2 text-sm text-[#77827B] dark:text-[#929B95]">
            Çalışma düzenini tanımla, kazancını otomatik hesaplayalım.
          </p>
        </div>

        {/* Step Progress Bars */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-colors duration-200 ${
                idx <= step
                  ? 'bg-[#159B61] dark:bg-[#39D98A]'
                  : 'bg-[#EEF2EF] dark:bg-[#222925]'
              }`}
            />
          ))}
        </div>

        {/* Step Card */}
        <div className="rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-black/[0.06] dark:border-white/[0.07] p-5 sm:p-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
              className="space-y-5"
            >
              {step === 1 && (
                <>
                  <div>
                    <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
                      Maaş bilgileri
                    </h2>
                    <p className="text-xs text-[#77827B] dark:text-[#929B95] mt-0.5">
                      Saatlik ücretini ve sabit gelirini hesaplamak için kullanılır.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                        Adın
                      </label>
                      <input
                        type="text"
                        value={form.userName}
                        onChange={(e) => setForm({ ...form, userName: e.target.value })}
                        placeholder="Örn. Emre"
                        className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] px-3.5 text-sm text-[#17221B] dark:text-[#F4F7F5] placeholder:text-[#77827B]/60 dark:placeholder:text-[#929B95]/60 focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                        Aylık maaş
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={salaryText}
                        onChange={(e) => setSalaryText(e.target.value)}
                        placeholder="Örn. 35000"
                        className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] px-3.5 font-mono text-base font-semibold text-[#17221B] dark:text-[#F4F7F5] placeholder:text-[#77827B]/60 dark:placeholder:text-[#929B95]/60 focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                          Maaş türü
                        </label>
                        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#EEF2EF] dark:bg-[#222925]">
                          {(['net', 'gross'] as SalaryType[]).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setForm({ ...form, salaryType: type })}
                              className={`min-h-[36px] rounded-lg text-xs font-medium transition-colors ${
                                form.salaryType === type
                                  ? 'bg-[#FFFFFF] dark:bg-[#191E1B] text-[#17221B] dark:text-[#F4F7F5]'
                                  : 'text-[#77827B] dark:text-[#929B95]'
                              }`}
                            >
                              {type === 'net' ? 'Net' : 'Brüt'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                          Para birimi
                        </label>
                        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#EEF2EF] dark:bg-[#222925]">
                          {(['TRY', 'USD', 'EUR'] as CurrencyCode[]).map((cur) => (
                            <button
                              key={cur}
                              type="button"
                              onClick={() => setForm({ ...form, currency: cur })}
                              className={`min-h-[36px] rounded-lg text-xs font-mono font-medium transition-colors ${
                                form.currency === cur
                                  ? 'bg-[#FFFFFF] dark:bg-[#191E1B] text-[#17221B] dark:text-[#F4F7F5]'
                                  : 'text-[#77827B] dark:text-[#929B95]'
                              }`}
                            >
                              {cur}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                        Maaş ödeme günü (Ayın günü)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={form.paymentDay}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            paymentDay: Math.max(1, Math.min(31, Number(e.target.value) || 1)),
                          })
                        }
                        className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] px-3.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                      />
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
                      Çalışma düzeni
                    </h2>
                    <p className="text-xs text-[#77827B] dark:text-[#929B95] mt-0.5">
                      Normal mesai sınırlarını ve varsayılan mola süreni belirle.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                          Haftalık çalışma günü
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={7}
                          value={form.weeklyWorkDays}
                          onChange={(e) =>
                            handleDailyOrDaysChange(
                              form.dailyWorkHours,
                              Number(e.target.value) || 5
                            )
                          }
                          className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] px-3.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                          Günlük çalışma (saat)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min={1}
                          max={24}
                          value={form.dailyWorkHours}
                          onChange={(e) =>
                            handleDailyOrDaysChange(
                              Number(e.target.value) || 8,
                              form.weeklyWorkDays
                            )
                          }
                          className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] px-3.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                        Haftalık toplam normal saat
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min={1}
                        max={100}
                        value={form.weeklyWorkHours}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            weeklyWorkHours: Math.max(1, Number(e.target.value) || 40),
                          })
                        }
                        className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] px-3.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                          Mesai başlangıç
                        </label>
                        <input
                          type="time"
                          value={form.workStartTime}
                          onChange={(e) =>
                            setForm({ ...form, workStartTime: e.target.value })
                          }
                          className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] px-3.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                          Mesai bitiş
                        </label>
                        <input
                          type="time"
                          value={form.workEndTime}
                          onChange={(e) =>
                            setForm({ ...form, workEndTime: e.target.value })
                          }
                          className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] px-3.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                        Günlük mola süresi (dakika)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={240}
                        value={form.breakMinutes}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            breakMinutes: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-full min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] px-3.5 font-mono text-sm text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                      />
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div>
                    <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
                      Fazla mesai çarpanları
                    </h2>
                    <p className="text-xs text-[#77827B] dark:text-[#929B95] mt-0.5">
                      Ek mesai ve hafta sonu kazanç katsayılarını ayarla.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                        Fazla mesai saatlik ücret çarpanı
                      </label>
                      <div className="flex gap-2">
                        {[1.25, 1.5, 2.0].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setForm({ ...form, overtimeMultiplier: val })}
                            className={`flex-1 min-h-[44px] rounded-xl font-mono text-sm font-medium transition-colors ${
                              form.overtimeMultiplier === val
                                ? 'bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211]'
                                : 'bg-[#EEF2EF] dark:bg-[#222925] text-[#17221B] dark:text-[#F4F7F5]'
                            }`}
                          >
                            {val}x
                          </button>
                        ))}
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          value={form.overtimeMultiplier}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              overtimeMultiplier: Math.max(1, Number(e.target.value) || 1.5),
                            })
                          }
                          className="w-20 min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] px-3 text-center font-mono text-sm text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                        Hafta sonu & resmî tatil çarpanı
                      </label>
                      <div className="flex gap-2">
                        {[1.5, 2.0, 2.5].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setForm({ ...form, weekendMultiplier: val })}
                            className={`flex-1 min-h-[44px] rounded-xl font-mono text-sm font-medium transition-colors ${
                              form.weekendMultiplier === val
                                ? 'bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211]'
                                : 'bg-[#EEF2EF] dark:bg-[#222925] text-[#17221B] dark:text-[#F4F7F5]'
                            }`}
                          >
                            {val}x
                          </button>
                        ))}
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          value={form.weekendMultiplier}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              weekendMultiplier: Math.max(1, Number(e.target.value) || 2.0),
                            })
                          }
                          className="w-20 min-h-[44px] rounded-xl bg-[#EEF2EF] dark:bg-[#222925] px-3 text-center font-mono text-sm text-[#17221B] dark:text-[#F4F7F5] focus:outline-none focus:ring-2 focus:ring-[#159B61] dark:focus:ring-[#39D98A]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#77827B] dark:text-[#929B95] mb-1.5">
                        Normal mesai aşım hesaplama yöntemi
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setForm({ ...form, overtimeCalculationMode: 'daily' })
                          }
                          className={`min-h-[44px] rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                            form.overtimeCalculationMode === 'daily'
                              ? 'bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211]'
                              : 'bg-[#EEF2EF] dark:bg-[#222925] text-[#17221B] dark:text-[#F4F7F5]'
                          }`}
                        >
                          Günlük hedef ({form.dailyWorkHours} sa)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({ ...form, overtimeCalculationMode: 'weekly' })
                          }
                          className={`min-h-[44px] rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                            form.overtimeCalculationMode === 'weekly'
                              ? 'bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211]'
                              : 'bg-[#EEF2EF] dark:bg-[#222925] text-[#17221B] dark:text-[#F4F7F5]'
                          }`}
                        >
                          Haftalık hedef ({form.weeklyWorkHours} sa)
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <div>
                    <h2 className="text-base font-semibold text-[#17221B] dark:text-[#F4F7F5]">
                      Görünüm teması
                    </h2>
                    <p className="text-xs text-[#77827B] dark:text-[#929B95] mt-0.5">
                      Gözüne en rahat gelen temayı seç, istediğin zaman Ayarlar’dan değiştirebilirsin.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {(
                      [
                        {
                          id: 'dark',
                          label: 'Koyu',
                          desc: 'Yüksek kontrastlı gece dostu arayüz',
                          icon: Moon,
                        },
                        {
                          id: 'light',
                          label: 'Açık',
                          desc: 'Gün ışığında yüksek okunabilirlik',
                          icon: Sun,
                        },
                        {
                          id: 'system',
                          label: 'Sistem',
                          desc: 'Cihazının tema tercihini otomatik izler',
                          icon: Smartphone,
                        },
                      ] as const
                    ).map((opt) => {
                      const Icon = opt.icon;
                      const active = form.themeMode === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleThemeSelect(opt.id)}
                          className={`w-full min-h-[60px] flex items-center justify-between rounded-2xl p-4 border text-left transition-colors ${
                            active
                              ? 'border-[#159B61] dark:border-[#39D98A] bg-[#159B61]/8 dark:bg-[#39D98A]/10'
                              : 'border-black/[0.06] dark:border-white/[0.06] bg-[#EEF2EF]/60 dark:bg-[#222925]/60'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                active
                                  ? 'bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211]'
                                  : 'bg-[#FFFFFF] dark:bg-[#191E1B] text-[#77827B] dark:text-[#929B95]'
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-[#17221B] dark:text-[#F4F7F5]">
                                {opt.label}
                              </div>
                              <div className="text-xs text-[#77827B] dark:text-[#929B95]">
                                {opt.desc}
                              </div>
                            </div>
                          </div>
                          {active && (
                            <Check className="w-5 h-5 text-[#159B61] dark:text-[#39D98A] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {error && (
            <p className="mt-4 text-xs font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {/* Action Bar */}
          <div className="mt-7 flex items-center gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep((s) => s - 1);
                }}
                className="min-h-[48px] px-4 rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] text-[#17221B] dark:text-[#F4F7F5] text-sm font-medium flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Geri</span>
              </button>
            )}
            <button
              type="button"
              onClick={validateAndNext}
              className="flex-1 min-h-[48px] px-5 rounded-2xl bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211] text-sm font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
            >
              <span>{step === TOTAL_STEPS ? 'Kurulumu Tamamla' : 'Devam Et'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-[#77827B] dark:text-[#929B95]">
        Zamanını takip et, emeğinin karşılığını gör.
      </p>
    </div>
  );
};
