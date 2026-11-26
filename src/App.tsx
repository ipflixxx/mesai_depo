/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { MesaiWordmark } from './components/MesaiWordmark';
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
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3EE] dark:bg-[#202522]">
        <MesaiWordmark size="lg" />
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
