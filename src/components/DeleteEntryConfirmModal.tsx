import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useMesai } from '../context/MesaiContext';
import {
  formatCurrency,
  formatDuration,
  formatLocalizedDate,
  getWorkTypeLabel,
} from '../utils/calculations';

export const DeleteEntryConfirmModal: React.FC = () => {
  const {
    settings,
    language,
    t,
    pendingDeleteEntry,
    cancelDeleteEntry,
    confirmDeleteEntry,
  } = useMesai();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!pendingDeleteEntry) return null;

  const isLeave =
    pendingDeleteEntry.workType === 'paid_leave' ||
    pendingDeleteEntry.workType === 'unpaid_leave';

  const handleConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await confirmDeleteEntry();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-entry-modal-title"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
      onClick={() => {
        if (!isDeleting) cancelDeleteEntry();
      }}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#C8D3CD] dark:border-white/[0.09] p-5 pb-safe sm:pb-5 space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-red-500/12 border border-red-500/25 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="delete-entry-modal-title"
                className="text-base font-bold text-[#17221B] dark:text-[#F4F7F5]"
              >
                {t.deleteModal.title}
              </h2>
              <p className="text-xs text-[#77827B] dark:text-[#929B95]">
                {t.deleteModal.irreversible}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={cancelDeleteEntry}
            disabled={isDeleting}
            aria-label={t.common.close}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-[#77827B] dark:text-[#929B95] hover:bg-[#EEF2EF] dark:hover:bg-[#222925] disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs sm:text-[13px] text-[#2A302D] dark:text-[#E5EAE7] leading-relaxed">
          {t.deleteModal.confirmBody}
        </p>

        <div className="rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] px-3.5 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#17221B] dark:text-[#F4F7F5] truncate">
              {formatLocalizedDate(pendingDeleteEntry.date, false, language)}
            </p>
            <p className="text-[11px] text-[#77827B] dark:text-[#929B95] truncate mt-0.5">
              {getWorkTypeLabel(pendingDeleteEntry.workType, language)}
              {pendingDeleteEntry.notes ? ` · ${pendingDeleteEntry.notes}` : ''}
            </p>
          </div>
          <div className="text-end shrink-0 font-mono text-xs tabular-nums">
            {!isLeave && (
              <p className="text-[#77827B] dark:text-[#929B95]">
                {formatDuration(pendingDeleteEntry.calculatedDurationMinutes, language)}
              </p>
            )}
            {pendingDeleteEntry.estimatedEarnings !== 0 && (
              <p
                dir="ltr"
                className={`font-bold ${
                  pendingDeleteEntry.estimatedEarnings < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-[#159B61] dark:text-[#39D98A]'
                }`}
              >
                {pendingDeleteEntry.estimatedEarnings > 0 ? '+' : ''}
                {formatCurrency(pendingDeleteEntry.estimatedEarnings, settings.currency, 0, language)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={cancelDeleteEntry}
            disabled={isDeleting}
            className="flex-1 min-h-[46px] rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-sm font-semibold text-[#17221B] dark:text-[#F4F7F5] hover:opacity-85 transition-opacity disabled:opacity-40"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 min-h-[46px] rounded-2xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? t.common.deleting : t.common.delete}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
