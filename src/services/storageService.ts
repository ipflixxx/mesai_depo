import { UserSettings, WorkEntry } from '../types/mesai';
import { DEFAULT_SETTINGS } from '../utils/calculations';

const DB_NAME = 'mesai_app_db';
const DB_VERSION = 1;
const STORE_KV = 'kv_store';
const SETTINGS_KEY = 'mesai_user_settings_v1';
const ENTRIES_KEY = 'mesai_work_entries_v1';

export interface StorageRepository {
  loadInitial(): Promise<{ settings: UserSettings; entries: WorkEntry[] }>;
  saveSettings(settings: UserSettings): Promise<void>;
  saveEntries(entries: WorkEntry[]): Promise<void>;
  clearAll(): Promise<void>;
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_KV)) {
          db.createObjectStore(STORE_KV);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDatabase();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_KV, 'readonly');
      const store = tx.objectStore(STORE_KV);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_KV, 'readwrite');
      const store = tx.objectStore(STORE_KV);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function idbClear(): Promise<void> {
  const db = await openDatabase();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_KV, 'readwrite');
      tx.objectStore(STORE_KV).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function lsGet<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function lsSet<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota errors cleanly
  }
}

export function loadSettingsSync(): UserSettings {
  const saved = lsGet<Partial<UserSettings>>(SETTINGS_KEY);
  return saved ? { ...DEFAULT_SETTINGS, ...saved } : { ...DEFAULT_SETTINGS };
}

export function loadEntriesSync(): WorkEntry[] {
  const saved = lsGet<WorkEntry[]>(ENTRIES_KEY);
  return Array.isArray(saved) ? saved : [];
}

class LocalHybridStorageRepository implements StorageRepository {
  async loadInitial(): Promise<{ settings: UserSettings; entries: WorkEntry[] }> {
    const [idbSettings, idbEntries] = await Promise.all([
      idbGet<Partial<UserSettings>>(SETTINGS_KEY),
      idbGet<WorkEntry[]>(ENTRIES_KEY),
    ]);

    const lsSettings = lsGet<Partial<UserSettings>>(SETTINGS_KEY);
    const lsEntries = lsGet<WorkEntry[]>(ENTRIES_KEY);

    const mergedSettings: UserSettings = {
      ...DEFAULT_SETTINGS,
      ...(idbSettings ?? lsSettings ?? {}),
    };

    const resolvedEntries: WorkEntry[] = Array.isArray(idbEntries)
      ? idbEntries
      : Array.isArray(lsEntries)
      ? lsEntries
      : [];

    return {
      settings: mergedSettings,
      entries: resolvedEntries,
    };
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    lsSet(SETTINGS_KEY, settings);
    await idbSet(SETTINGS_KEY, settings);
  }

  async saveEntries(entries: WorkEntry[]): Promise<void> {
    lsSet(ENTRIES_KEY, entries);
    await idbSet(ENTRIES_KEY, entries);
  }

  async clearAll(): Promise<void> {
    try {
      window.localStorage.removeItem(SETTINGS_KEY);
      window.localStorage.removeItem(ENTRIES_KEY);
    } catch {
      // noop
    }
    await idbClear();
  }
}

export const storageService: StorageRepository = new LocalHybridStorageRepository();
