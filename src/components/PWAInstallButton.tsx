import React, { useState } from 'react';
import { Download, Share, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'compact' | 'full' }> = ({
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={
          variant === 'full'
            ? 'w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211] font-semibold text-sm px-4 py-2.5 transition-transform active:scale-[0.98] whitespace-nowrap'
            : 'min-h-[44px] flex items-center gap-2 rounded-xl bg-[#EEF2EF] dark:bg-[#222925] text-[#17221B] dark:text-[#F4F7F5] text-xs font-medium px-3.5 py-2 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0'
        }
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Uygulamayı Yükle</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={
            variant === 'full'
              ? 'w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[#EEF2EF] dark:bg-[#222925] text-[#17221B] dark:text-[#F4F7F5] font-medium text-sm px-4 py-2.5 whitespace-nowrap'
              : 'min-h-[44px] flex items-center gap-1.5 rounded-xl bg-[#EEF2EF] dark:bg-[#222925] text-[#17221B] dark:text-[#F4F7F5] text-xs font-medium px-3 py-2 whitespace-nowrap shrink-0'
          }
        >
          <Share className="w-3.5 h-3.5 shrink-0" />
          <span>Ana Ekrana Ekle</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-[#FFFFFF] dark:bg-[#191E1B] border border-black/[0.06] dark:border-white/[0.08] p-6 pb-8 sm:pb-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-[#17221B] dark:text-[#F4F7F5]">
                  Ana Ekrana Ekle
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#77827B] dark:text-[#929B95] hover:bg-[#EEF2EF] dark:hover:bg-[#222925]"
                  aria-label="Kapat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ol className="space-y-3 text-sm text-[#77827B] dark:text-[#929B95]">
                <li>1. Safari alt çubuğundaki Paylaş simgesine dokunun.</li>
                <li>2. Menüden &ldquo;Ana Ekrana Ekle&rdquo; seçeneğini seçin.</li>
                <li>3. Sağ üstten &ldquo;Ekle&rdquo; butonuna dokunun.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-[#159B61] dark:bg-[#39D98A] text-white dark:text-[#101211] font-semibold text-sm"
              >
                Anladım
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="bg-[#EEF2EF] dark:bg-[#222925] border-b border-black/[0.06] dark:border-white/[0.06] px-4 py-2 text-xs text-[#17221B] dark:text-[#F4F7F5] flex items-center justify-center gap-2">
      <WifiOff className="w-3.5 h-3.5 text-[#77827B] dark:text-[#929B95] shrink-0" />
      <span>Çevrimdışı mod — Tüm verileriniz cihazınızda güvenle saklanıyor.</span>
    </div>
  );
};
