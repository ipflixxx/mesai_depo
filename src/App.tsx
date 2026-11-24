/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { OnboardingFlow } from './components/OnboardingFlow';
import { MesaiProvider, useMesai } from './context/MesaiContext';
import { CalculatorsPage } from './pages/CalculatorsPage';
import { CalendarPage } from './pages/CalendarPage';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { StatsPage } from './pages/StatsPage';

const AppContent: React.FC = () => {
  const { settings, isHydrating } = useMesai();

  if (isHydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F8F6] dark:bg-[#101211]">
        <div className="font-display text-xl font-extrabold tracking-tight text-[#17221B] dark:text-[#F4F7F5]">
          MESAİ
        </div>
      </div>
    );
  }

  if (!settings.onboardingCompleted) {
    return <OnboardingFlow />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/istatistik" element={<StatsPage />} />
          <Route path="/takvim" element={<CalendarPage />} />
          <Route path="/hesaplama" element={<CalculatorsPage />} />
          <Route path="/ayarlar" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default function App() {
  return (
    <MesaiProvider>
      <AppContent />
    </MesaiProvider>
  );
}
