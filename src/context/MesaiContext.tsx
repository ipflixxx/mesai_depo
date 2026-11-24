import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import {
  loadEntriesSync,
  loadSettingsSync,
  storageService,
} from '../services/storageService';
import { UserSettings, WorkEntry, WorkEntryInput } from '../types/mesai';
import {
  DEFAULT_SETTINGS,
  getTodayDateString,
  recalculateAllEntries,
} from '../utils/calculations';

interface EntryModalState {
  isOpen: boolean;
  editingEntry: WorkEntry | null;
  defaultDate: string;
}

interface MesaiContextValue {
  settings: UserSettings;
  entries: WorkEntry[];
  isHydrating: boolean;
  modalState: EntryModalState;
  openNewEntryModal: (date?: string) => void;
  openEditEntryModal: (entry: WorkEntry) => void;
  closeEntryModal: () => void;
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  completeOnboarding: (initialSettings: UserSettings) => Promise<void>;
  addEntry: (input: WorkEntryInput) => Promise<void>;
  updateEntry: (id: string, input: WorkEntryInput) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  restoreBackup: (newSettings: UserSettings, newEntries: WorkEntry[]) => Promise<void>;
  resetAllData: () => Promise<void>;
}

const MesaiContext = createContext<MesaiContextValue | null>(null);

export const MesaiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(() => loadSettingsSync());
  const [entries, setEntries] = useState<WorkEntry[]>(() => loadEntriesSync());
  const [isHydrating, setIsHydrating] = useState(true);
  const [modalState, setModalState] = useState<EntryModalState>({
    isOpen: false,
    editingEntry: null,
    defaultDate: getTodayDateString(),
  });

  useTheme(settings.themeMode);

  useEffect(() => {
    let active = true;
    storageService
      .loadInitial()
      .then(({ settings: loadedSettings, entries: loadedEntries }) => {
        if (!active) return;
        setSettings(loadedSettings);
        const synced = recalculateAllEntries(loadedEntries, loadedSettings);
        setEntries(synced);
      })
      .finally(() => {
        if (active) setIsHydrating(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openNewEntryModal = useCallback((date?: string) => {
    setModalState({
      isOpen: true,
      editingEntry: null,
      defaultDate: date || getTodayDateString(),
    });
  }, []);

  const openEditEntryModal = useCallback((entry: WorkEntry) => {
    setModalState({
      isOpen: true,
      editingEntry: entry,
      defaultDate: entry.date,
    });
  }, []);

  const closeEntryModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false, editingEntry: null }));
  }, []);

  const updateSettings = useCallback(
    async (partial: Partial<UserSettings>) => {
      const nextSettings: UserSettings = { ...settings, ...partial };
      setSettings(nextSettings);
      const recalculated = recalculateAllEntries(entries, nextSettings);
      setEntries(recalculated);
      await Promise.all([
        storageService.saveSettings(nextSettings),
        storageService.saveEntries(recalculated),
      ]);
    },
    [settings, entries]
  );

  const completeOnboarding = useCallback(async (initialSettings: UserSettings) => {
    const finalSettings: UserSettings = {
      ...initialSettings,
      onboardingCompleted: true,
    };
    setSettings(finalSettings);
    await storageService.saveSettings(finalSettings);
  }, []);

  const addEntry = useCallback(
    async (input: WorkEntryInput) => {
      const now = new Date().toISOString();
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const rawEntry: WorkEntry = {
        id,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        breakMinutes: input.breakMinutes,
        workType: input.workType,
        overtimeRatePercent: input.overtimeRatePercent,
        notes: input.notes.trim(),
        calculatedDurationMinutes: 0,
        overtimeDurationMinutes: 0,
        estimatedEarnings: 0,
        isPlanned: false,
        createdAt: now,
        updatedAt: now,
      };

      const updated = recalculateAllEntries([...entries, rawEntry], settings);
      setEntries(updated);
      await storageService.saveEntries(updated);
    },
    [entries, settings]
  );

  const updateEntry = useCallback(
    async (id: string, input: WorkEntryInput) => {
      const now = new Date().toISOString();
      const nextRaw = entries.map((e) =>
        e.id === id
          ? {
              ...e,
              date: input.date,
              startTime: input.startTime,
              endTime: input.endTime,
              breakMinutes: input.breakMinutes,
              workType: input.workType,
              overtimeRatePercent: input.overtimeRatePercent,
              notes: input.notes.trim(),
              updatedAt: now,
            }
          : e
      );
      const updated = recalculateAllEntries(nextRaw, settings);
      setEntries(updated);
      await storageService.saveEntries(updated);
    },
    [entries, settings]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      const remaining = entries.filter((e) => e.id !== id);
      const updated = recalculateAllEntries(remaining, settings);
      setEntries(updated);
      await storageService.saveEntries(updated);
    },
    [entries, settings]
  );

  const restoreBackup = useCallback(
    async (newSettings: UserSettings, newEntries: WorkEntry[]) => {
      const cleanSettings = { ...DEFAULT_SETTINGS, ...newSettings, onboardingCompleted: true };
      const recalculated = recalculateAllEntries(newEntries, cleanSettings);
      setSettings(cleanSettings);
      setEntries(recalculated);
      await Promise.all([
        storageService.saveSettings(cleanSettings),
        storageService.saveEntries(recalculated),
      ]);
    },
    []
  );

  const resetAllData = useCallback(async () => {
    await storageService.clearAll();
    setSettings({ ...DEFAULT_SETTINGS });
    setEntries([]);
  }, []);

  return (
    <MesaiContext.Provider
      value={{
        settings,
        entries,
        isHydrating,
        modalState,
        openNewEntryModal,
        openEditEntryModal,
        closeEntryModal,
        updateSettings,
        completeOnboarding,
        addEntry,
        updateEntry,
        deleteEntry,
        restoreBackup,
        resetAllData,
      }}
    >
      {children}
    </MesaiContext.Provider>
  );
};

export function useMesai(): MesaiContextValue {
  const ctx = useContext(MesaiContext);
  if (!ctx) {
    throw new Error('useMesai must be used inside MesaiProvider');
  }
  return ctx;
}
