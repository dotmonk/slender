import type { AppData, Settings } from '../types';

const STORAGE_KEY = 'slender_data';

function defaultData(): AppData {
  return {
    profile:   { height: null, birthdate: null, gender: null },
    settings:  { theme: 'light', activityId: 'mod', planType: 'maintain', planLevel: 0 } as Settings,
    weightLog: [],
    calLog:    [],
    foodList:  [],
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
