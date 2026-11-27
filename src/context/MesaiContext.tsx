import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { APP_ID, APP_VERSION_CODE, APP_VERSION_NAME, DEFAULT_DISTRIBUTION_CHANNEL } from '../config/appInfo';
import { useTheme } from '../hooks/useTheme';
import {
  checkForAndroidUpdate,
  getAppRuntimeInfo,
} from '../services/androidUpdateService';
import {
  saveNativeAlarmConfig,
  syncNativeRecordedDates,
} from '../native/mesaiAlarm';
import {
  loadEntriesSync,
  loadSettingsSync,
  storageService,
} from '../services/storageService';
import { adService } from '../services/adService';
import { UserSettings, WorkEntry, WorkEntryInput } from '../types/mesai';
import { AppRuntimeInfo, UpdateCheckResult } from '../types/update';
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
  pendingDeleteEntry: WorkEntry | null;
  runtimeInfo: AppRuntimeInfo;
  updateResult: UpdateCheckResult | null;
  isCheckingUpdate: boolean;
  isUpdateModalOpen: boolean;
  checkForUpdates: (silent?: boolean) => Promise<UpdateCheckResult>;
  openUpdateModal: () => void;
  closeUpdateModal: () => void;
  openNewEntryModal: (date?: string) => void;
  openEditEntryModal: (entry: WorkEntry) => void;
  closeEntryModal: () => void;
  requestDeleteEntry: (entry: WorkEntry) => void;
  cancelDeleteEntry: () => void;
  confirmDeleteEntry: () => Promise<void>;
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
  const [pendingDeleteEntry, setPendingDeleteEntry] = useState<WorkEntry | null>(null);

  const [runtimeInfo, setRuntimeInfo] = useState<AppRuntimeInfo>({
    appId: APP_ID,
    versionName: APP_VERSION_NAME,
    versionCode: APP_VERSION_CODE,
    channel: DEFAULT_DISTRIBUTION_CHANNEL,
    isNativeAndroid: false,
  });
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const initialUpdateCheckedRef = useRef(false);

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

  const initialAlarmSyncedRef = useRef(false);

  useEffect(() => {
    if (isHydrating) return;
    const uniqueDates = Array.from(new Set(entries.map((e) => e.date)));
    void syncNativeRecordedDates(uniqueDates);
    if (!initialAlarmSyncedRef.current && settings.alarm) {
      initialAlarmSyncedRef.current = true;
      void saveNativeAlarmConfig(settings.alarm, uniqueDates);
    }
  }, [entries, isHydrating, settings.alarm]);

  const checkForUpdates = useCallback(async (silent = false): Promise<UpdateCheckResult> => {
    setIsCheckingUpdate(true);
    try {
      const info = await getAppRuntimeInfo();
      setRuntimeInfo(info);
      const res = await checkForAndroidUpdate(info);
      setUpdateResult(res);
      if (res.hasUpdate) {
        setIsUpdateModalOpen(true);
      } else if (!silent && res.error) {
        // Keep error accessible via updateResult.error for manual check UI
      }
      return res;
    } finally {
      setIsCheckingUpdate(false);
    }
  }, []);

  useEffect(() => {
    if (isHydrating || initialUpdateCheckedRef.current) return;
    initialUpdateCheckedRef.current = true;
    void checkForUpdates(true);
    void adService.initAdsIfNeeded();
  }, [isHydrating, checkForUpdates]);

  const openUpdateModal = useCallback(() => {
    if (updateResult?.hasUpdate) {
      setIsUpdateModalOpen(true);
    }
  }, [updateResult]);

  const closeUpdateModal = useCallback(() => {
    if (updateResult?.mandatory) return;
    setIsUpdateModalOpen(false);
  }, [updateResult]);

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

  const requestDeleteEntry = useCallback((entry: WorkEntry) => {
    setPendingDeleteEntry(entry);
  }, []);

  const cancelDeleteEntry = useCallback(() => {
    setPendingDeleteEntry(null);
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

  const confirmDeleteEntry = useCallback(async () => {
    if (!pendingDeleteEntry) return;
    const targetId = pendingDeleteEntry.id;
    await deleteEntry(targetId);
    setPendingDeleteEntry(null);
    setModalState((prev) =>
      prev.isOpen && prev.editingEntry?.id === targetId
        ? { ...prev, isOpen: false, editingEntry: null }
        : prev
    );
  }, [pendingDeleteEntry, deleteEntry]);

  const restoreBackup = useCallback(
    async (newSettings: UserSettings, newEntries: WorkEntry[]) => {
      const cleanSettings: UserSettings = {
        ...DEFAULT_SETTINGS,
        ...newSettings,
        alarm: {
          ...DEFAULT_SETTINGS.alarm!,
          ...(newSettings.alarm ?? {}),
        },
        onboardingCompleted: true,
      };
      const recalculated = recalculateAllEntries(newEntries, cleanSettings);
      setSettings(cleanSettings);
      setEntries(recalculated);
      await Promise.all([
        storageService.saveSettings(cleanSettings),
        storageService.saveEntries(recalculated),
      ]);
      const dates = Array.from(new Set(recalculated.map((e) => e.date)));
      await syncNativeRecordedDates(dates);
      if (cleanSettings.alarm) {
        await saveNativeAlarmConfig(cleanSettings.alarm, dates);
      }
    },
    []
  );

  const resetAllData = useCallback(async () => {
    await storageService.clearAll();
    setSettings({ ...DEFAULT_SETTINGS });
    setEntries([]);
    await syncNativeRecordedDates([]);
    await saveNativeAlarmConfig(DEFAULT_SETTINGS.alarm!, []);
  }, []);

  return (
    <MesaiContext.Provider
      value={{
        settings,
        entries,
        isHydrating,
        modalState,
        pendingDeleteEntry,
        runtimeInfo,
        updateResult,
        isCheckingUpdate,
        isUpdateModalOpen,
        checkForUpdates,
        openUpdateModal,
        closeUpdateModal,
        openNewEntryModal,
        openEditEntryModal,
        closeEntryModal,
        requestDeleteEntry,
        cancelDeleteEntry,
        confirmDeleteEntry,
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
