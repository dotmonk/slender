import type { AppData, Settings } from '../types';

/** Legacy localStorage key — read once during migration, then removed. */
export const LEGACY_STORAGE_KEY = 'slender_data';

const DB_NAME = 'slender';
const DB_VERSION = 1;
const STORE_NAME = 'kv';
const DATA_KEY = 'appData';

export function defaultData(): AppData {
  return {
    profile:   { height: null, birthdate: null, gender: null },
    settings:  { theme: 'light', activityId: 'mod', planType: 'maintain', planLevel: 0, occupationId: 'desk', workHoursPerDay: 8, workDaysPerWeek: 5 } as Settings,
    weightLog: [],
    calLog:    [],
    foodList:  [],
    planLog:   [],
    dayPlans:  [],
    activityLog:    [],
    dayActivities:  [],
    occupationLog:  [],
    dayOccupations: [],
  };
}

/** Merge a partial payload onto defaults so new fields always exist. */
export function normalizeData(partial: Partial<AppData> | null | undefined): AppData {
  return Object.assign(defaultData(), partial ?? {});
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error('IndexedDB open failed'));
    };
    req.onblocked = () => {
      console.warn('[Slender] IndexedDB open blocked');
    };
  });
  return dbPromise;
}

function idbGet(): Promise<AppData | undefined> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(DATA_KEY);
        req.onsuccess = () => resolve(req.result as AppData | undefined);
        req.onerror = () => reject(req.error);
      }),
  );
}

function idbPut(data: AppData): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(data, DATA_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDB write aborted'));
      }),
  );
}

function idbDelete(): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(DATA_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDB delete aborted'));
      }),
  );
}

function readLegacyLocalStorage(): AppData | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return normalizeData(JSON.parse(raw) as Partial<AppData>);
  } catch {
    return null;
  }
}

function clearLegacyLocalStorage(): void {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (e) {
    console.warn('[Slender] Failed to clear legacy localStorage:', e);
  }
}

/**
 * Load app data from IndexedDB. If IDB is empty but legacy localStorage still
 * has data, migrate it once, then remove the localStorage copy.
 */
export async function loadData(): Promise<AppData> {
  try {
    const existing = await idbGet();
    if (existing) return normalizeData(existing);

    const legacy = readLegacyLocalStorage();
    if (legacy) {
      await idbPut(legacy);
      clearLegacyLocalStorage();
      return legacy;
    }

    return defaultData();
  } catch (e) {
    console.warn('[Slender] Failed to load from IndexedDB, trying localStorage:', e);
    const legacy = readLegacyLocalStorage();
    return legacy ?? defaultData();
  }
}

export async function saveData(data: AppData): Promise<void> {
  try {
    await idbPut(data);
    // If a prior failed migration left legacy data around, drop it once IDB works.
    try {
      if (localStorage.getItem(LEGACY_STORAGE_KEY) != null) clearLegacyLocalStorage();
    } catch { /* ignore */ }
  } catch (e) {
    console.warn('[Slender] Failed to persist data:', e);
  }
}

/**
 * Validates a parsed JSON payload looks vaguely like AppData.
 * Returns a normalised AppData on success, or null if not a valid backup.
 */
export function isValidBackup(parsed: unknown): parsed is Partial<AppData> {
  if (!parsed || typeof parsed !== 'object') return false;
  const p = parsed as Record<string, unknown>;
  // Must have at least one of these top-level keys to look like a backup.
  return (
    'profile'   in p ||
    'settings'  in p ||
    'weightLog' in p ||
    'calLog'    in p ||
    'foodList'  in p ||
    'planLog'   in p ||
    'dayPlans'  in p ||
    'activityLog'   in p ||
    'dayActivities' in p ||
    'occupationLog'  in p ||
    'dayOccupations' in p
  );
}

export async function clearStoredData(): Promise<void> {
  try {
    await idbDelete();
  } catch (e) {
    console.warn('[Slender] Failed to clear IndexedDB data:', e);
  }
  clearLegacyLocalStorage();
}
