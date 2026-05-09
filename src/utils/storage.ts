import type { AppData, Settings } from '../types';

export const STORAGE_KEY = 'slender_data';

export function defaultData(): AppData {
  return {
    profile:   { height: null, birthdate: null, gender: null },
    settings:  { theme: 'light', activityId: 'mod', planType: 'maintain', planLevel: 0 } as Settings,
    weightLog: [],
    calLog:    [],
    foodList:  [],
    planLog:   [],
    dayPlans:  [],
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    // Merge so new fields added in future versions always have defaults
    return Object.assign(defaultData(), JSON.parse(raw) as Partial<AppData>);
  } catch {
    return defaultData();
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
    'dayPlans'  in p
  );
}

export function clearStoredData(): void {
  try { localStorage.removeItem(STORAGE_KEY); }
  catch (e) { console.warn('[Slender] Failed to clear data:', e); }
}
