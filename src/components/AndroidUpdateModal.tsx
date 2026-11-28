import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { useMesai } from '../context/MesaiContext';
import { formatTemplate } from '../i18n';
import { MesaiUpdater } from '../native/mesaiUpdater';
import { formatBytes } from '../services/androidUpdateService';
import {
  AppRuntimeInfo,
  UpdateCheckResult,
  UpdateDownloadPhase,
  UpdateProgressEvent,
} from '../types/update';

interface AndroidUpdateModalProps {
  isOpen: boolean;
  runtimeInfo: AppRuntimeInfo;
  updateResult: UpdateCheckResult | null;
  onClose: () => void;
}

export const AndroidUpdateModal: React.FC<AndroidUpdateModalProps> = ({
  isOpen,
  runtimeInfo,
  updateResult,
  onClose,
}) => {
  const { t } = useMesai();
  const [phase, setPhase] = useState<UpdateDownloadPhase>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPhase('idle');
      setProgress(0);
      setStatusMessage(null);
      setErrorMessage(null);
      return;
    }

    if (!runtimeInfo.isNativeAndroid) return;

    let handle: { remove: () => Promise<void> } | null = null;
    MesaiUpdater.addListener('updateDownloadProgress', (ev: UpdateProgressEvent) => {
      setPhase(ev.phase);
      setProgress(Math.max(0, Math.min(100, ev.progress)));
      if (ev.phase === 'downloading') {
        setStatusMessage(
          formatTemplate(t.updater.downloadingProgress, { progress: ev.progress })
        );
      } else if (ev.phase === 'verifying') {
        setStatusMessage(t.updater.verifying);
      } else if (ev.phase === 'installing') {
        setStatusMessage(t.updater.installing);
      }
    })
      .then((listener) => {
        handle = listener;
      })
      .catch(() => {
        // Ignore listener registration errors in non-native environments
      });

    return () => {
      if (handle) {
        void handle.remove();
      }
    };
  }, [isOpen, runtimeInfo.isNativeAndroid, t.updater]);

  if (!isOpen || !updateResult || !updateResult.hasUpdate) {
    return null;
  }

  const isPlayChannel = updateResult.channel === 'play';
  const manifest = updateResult.manifest;
  const isMandatory = updateResult.mandatory;
  const isBusy =
    phase === 'downloading' || phase === 'verifying' || phase === 'installing';

  const handleStartUpdate = async () => {
    setErrorMessage(null);
    setStatusMessage(null);

    if (isPlayChannel) {
      if (!runtimeInfo.isNativeAndroid) {
        setStatusMessage(t.updater.playAndroidOnly);
        return;
      }
      try {
        setPhase('installing');
        await MesaiUpdater.startPlayStoreUpdate({ immediate: isMandatory });
        if (!isMandatory) {
          onClose();
        }
      } catch (err) {
        setPhase('error');
        setErrorMessage(
          err instanceof Error ? err.message : t.updater.errPlayStart
        );
      }
      return;
    }

    if (!manifest) return;

    if (!runtimeInfo.isNativeAndroid) {
      setStatusMessage(t.updater.directAndroidOnly);
      return;
    }

    try {
      setPhase('downloading');
      setProgress(0);
      setStatusMessage(t.updater.downloadingStart);

      const res = await MesaiUpdater.downloadAndInstallApk({
        url: manifest.apkUrl,
        sha256: manifest.sha256,
        versionName: manifest.versionName,
      });

      if (res.status === 'permission_required') {
        setPhase('permission_required');
        setStatusMessage(t.updater.permissionRequired);
        return;
      }

      setPhase('installing');
      setProgress(100);
      setStatusMessage(t.updater.sha256Verified);
    } catch (err) {
      setPhase('error');
      setErrorMessage(
        err instanceof Error ? err.message : t.updater.errApkDownload
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={() => {
        if (!isMandatory && !isBusy) onClose();
      }}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-[#C8D3CD] dark:border-white/[0.09] p-6 pb-8 sm:pb-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                isMandatory
                  ? 'bg-[#D97706]/15 dark:bg-[#F59E0B]/15 text-[#D97706] dark:text-[#F59E0B]'
                  : 'bg-[#159B61]/15 dark:bg-[#39D98A]/15 text-[#159B61] dark:text-[#39D98A]'
              }`}
            >
              {isMandatory ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Smartphone className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#77827B] dark:text-[#929B95]">
                {isMandatory ? t.updater.mandatoryBadge : t.updater.optionalBadge}
              </p>
              <h2 className="text-lg font-bold text-[#17221B] dark:text-[#F4F7F5] tracking-tight">
                {t.updater.modalTitle}
              </h2>
            </div>
          </div>

          {!isMandatory && !isBusy && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t.common.close}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#77827B] dark:text-[#929B95] hover:bg-[#EEF2EF] dark:hover:bg-[#222925]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Version transition summary */}
        <div className="rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">
              {t.updater.currentVersion}
            </p>
            <p
              dir="ltr"
              className="mt-0.5 font-mono text-sm font-semibold text-[#17221B] dark:text-[#F4F7F5] tabular-nums"
            >
              v{updateResult.currentVersionName}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#77827B] dark:text-[#929B95] shrink-0 rtl:rotate-180" />
          <div className="text-end">
            <p className="text-[11px] text-[#77827B] dark:text-[#929B95]">
              {t.updater.newVersion}
            </p>
            <p
              dir="ltr"
              className="mt-0.5 font-mono text-sm font-bold text-[#159B61] dark:text-[#39D98A] tabular-nums"
            >
              {manifest
                ? `v${manifest.versionName}`
                : updateResult.playStoreAvailableVersionCode
                ? formatTemplate(t.updater.buildNumber, {
                    code: updateResult.playStoreAvailableVersionCode,
                  })
                : t.updater.newVersionFallback}
            </p>
          </div>
        </div>

        {/* Release Notes */}
        {manifest && manifest.releaseNotes.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[#17221B] dark:text-[#F4F7F5]">
              {t.updater.releaseNotes}
            </h3>
            <ul className="max-h-36 overflow-y-auto space-y-1.5 rounded-2xl bg-[#EEF2EF]/70 dark:bg-[#222925]/60 border border-[#CFD8D2] dark:border-white/[0.07] p-3.5 text-xs text-[#17221B] dark:text-[#F4F7F5] leading-relaxed">
              {manifest.releaseNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#159B61] dark:bg-[#39D98A] shrink-0" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Security & SHA-256 info for direct APK channel */}
        {!isPlayChannel && manifest && (
          <div className="rounded-2xl border border-[#CFD8D2] dark:border-white/[0.07] p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-medium text-[#17221B] dark:text-[#F4F7F5]">
                <ShieldCheck className="w-4 h-4 text-[#159B61] dark:text-[#39D98A]" />
                {t.updater.sha256Integrity}
              </span>
              <span
                dir="ltr"
                className="font-mono text-[#77827B] dark:text-[#929B95] tabular-nums"
              >
                {formatBytes(manifest.sizeBytes)}
              </span>
            </div>
            <p
              dir="ltr"
              className="font-mono text-[11px] text-[#77827B] dark:text-[#929B95] truncate"
            >
              {manifest.sha256}
            </p>
          </div>
        )}

        {/* Progress Bar */}
        {isBusy && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#17221B] dark:text-[#F4F7F5]">
                {statusMessage}
              </span>
              <span
                dir="ltr"
                className="font-mono font-semibold text-[#159B61] dark:text-[#39D98A] tabular-nums"
              >
                {progress}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-[#EEF2EF] dark:bg-[#222925] overflow-hidden">
              <div
                className="h-full bg-[#159B61] dark:bg-[#39D98A] transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Status / Permission / Error Feedback */}
        {!isBusy && statusMessage && (
          <div className="rounded-2xl bg-[#159B61]/10 dark:bg-[#39D98A]/10 p-3.5 flex items-start gap-2.5 text-xs text-[#17221B] dark:text-[#F4F7F5]">
            <CheckCircle2 className="w-4 h-4 text-[#159B61] dark:text-[#39D98A] shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="leading-relaxed">{statusMessage}</p>
              {phase === 'permission_required' && runtimeInfo.isNativeAndroid && (
                <button
                  type="button"
                  onClick={() => void MesaiUpdater.openUnknownSourcesSettings()}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#159B61] dark:text-[#39D98A]"
                >
                  <span>{t.updater.openInstallPerm}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl bg-red-500/10 p-3.5 text-xs text-red-600 dark:text-red-400 leading-relaxed">
            {errorMessage}
          </div>
        )}

        {isMandatory && (
          <p className="text-[11px] text-[#77827B] dark:text-[#929B95] leading-relaxed">
            {t.updater.mandatoryNote}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2.5 pt-1">
          {!isMandatory && (
            <button
              type="button"
              disabled={isBusy}
              onClick={onClose}
              className="flex-1 min-h-[46px] rounded-2xl bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-[#17221B] dark:text-[#F4F7F5] text-sm font-semibold disabled:opacity-50"
            >
              {t.common.later}
            </button>
          )}
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void handleStartUpdate()}
            className="flex-1 min-h-[46px] rounded-2xl bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211] text-sm font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            <span>
              {isPlayChannel
                ? t.updater.updateViaPlay
                : phase === 'error'
                ? t.common.retry
                : t.updater.downloadUpdate}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
