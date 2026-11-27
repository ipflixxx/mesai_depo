import React, { useEffect } from 'react';
import { BarChart3, Calculator, Home, Settings, Wallet } from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMesai } from '../context/MesaiContext';
import { AndroidUpdateModal } from './AndroidUpdateModal';
import { DeleteEntryConfirmModal } from './DeleteEntryConfirmModal';
import { WorkEntryModal } from './WorkEntryModal';

const NAV_ITEMS = [
  { to: '/', label: 'Ana Sayfa', icon: Home, end: true },
  { to: '/istatistik', label: 'İstatistik', icon: BarChart3, end: false },
  { to: '/takvim', label: 'Kazanç', icon: Wallet, end: false },
  { to: '/hesaplama', label: 'Hesaplama', icon: Calculator, end: false },
  { to: '/ayarlar', label: 'Ayarlar', icon: Settings, end: false },
];

declare global {
  interface Window {
    __mesaiHandleAndroidBack?: () => 'handled' | 'blocked' | 'exit';
  }
}

export const AppShell: React.FC = () => {
  const {
    runtimeInfo,
    updateResult,
    isUpdateModalOpen,
    closeUpdateModal,
    modalState,
    closeEntryModal,
    pendingDeleteEntry,
    cancelDeleteEntry,
  } = useMesai();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    window.__mesaiHandleAndroidBack = () => {
      if (isUpdateModalOpen) {
        if (updateResult?.mandatory) {
          return 'blocked';
        }
        closeUpdateModal();
        return 'handled';
      }

      if (pendingDeleteEntry) {
        cancelDeleteEntry();
        return 'handled';
      }

      if (modalState.isOpen) {
        closeEntryModal();
        return 'handled';
      }

      if (location.pathname !== '/') {
        navigate('/');
        return 'handled';
      }

      return 'exit';
    };

    return () => {
      delete window.__mesaiHandleAndroidBack;
    };
  }, [
    isUpdateModalOpen,
    updateResult?.mandatory,
    closeUpdateModal,
    pendingDeleteEntry,
    cancelDeleteEntry,
    modalState.isOpen,
    closeEntryModal,
    location.pathname,
    navigate,
  ]);

  return (
    <div className="min-h-screen bg-[#F6F8F6] dark:bg-[#101211] text-[#17221B] dark:text-[#F4F7F5] flex flex-col pt-safe">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 w-full max-w-4xl mx-auto px-3 min-[360px]:px-4 sm:px-6 pt-5 pb-24 sm:pt-7">
          <Outlet />
        </main>
      </div>

      {/* Bottom Fixed Tab Bar (5 tabs: Ana Sayfa > İstatistik > Kazanç > Hesaplama > Ayarlar) */}
      <nav
        aria-label="Ana gezinme"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF]/92 dark:bg-[#191E1B]/92 backdrop-blur-md border-t border-[#CBD5CF] dark:border-white/[0.07] pb-safe"
      >
        <div className="grid grid-cols-5 gap-0.5 sm:gap-1 h-16 max-w-2xl mx-auto px-1.5 sm:px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `my-1.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 min-h-[44px] px-1 transition-colors ${
                    isActive
                      ? 'bg-[#EEF2EF] dark:bg-[#222925] border border-[#CFD8D2] dark:border-white/[0.07] text-[#159B61] dark:text-[#39D98A]'
                      : 'text-[#77827B] dark:text-[#929B95] hover:text-[#17221B] dark:hover:text-[#F4F7F5]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.9]'}`} />
                    <span className="text-[10px] sm:text-[11px] font-medium tracking-tight whitespace-nowrap">
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      <WorkEntryModal />
      <DeleteEntryConfirmModal />
      <AndroidUpdateModal
        isOpen={isUpdateModalOpen}
        runtimeInfo={runtimeInfo}
        updateResult={updateResult}
        onClose={closeUpdateModal}
      />
    </div>
  );
};
