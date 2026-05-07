import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';
import type { AppData, CalorieEntry, FoodItem, Profile, Settings, WeightEntry } from '../types';
import { loadData, saveData } from '../utils/storage';
import { uid } from '../utils/id';

// ── Context shape ─────────────────────────────────────────────────────────────

interface AppContextType {
  data: AppData;
  updateProfile: (profile: Profile) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  upsertWeight: (entry: WeightEntry) => void;
  deleteWeight: (date: string) => void;
  addCalEntry: (entry: Omit<CalorieEntry, 'id'>) => void;
  updateCalEntry: (entry: CalorieEntry) => void;
  deleteCalEntry: (id: string) => void;
  addFood: (food: Omit<FoodItem, 'id'>) => void;
  updateFood: (food: FoodItem) => void;
  deleteFood: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadData);

  /** Applies an immutable update, then persists. */
  const update = useCallback((updater: (d: AppData) => AppData) => {
    setData((prev) => {
      const next = updater(prev);
      saveData(next);
      return next;
    });
  }, []);

  const updateProfile = useCallback(
    (profile: Profile) => update((d) => ({ ...d, profile })),
    [update],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) =>
      update((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
    [update],
  );

  const upsertWeight = useCallback(
    (entry: WeightEntry) =>
      update((d) => {
        const idx = d.weightLog.findIndex((w) => w.date === entry.date);
        const weightLog =
          idx !== -1
            ? d.weightLog.map((w, i) => (i === idx ? entry : w))
            : [...d.weightLog, entry];
        return { ...d, weightLog };
      }),
    [update],
  );

  const deleteWeight = useCallback(
    (date: string) =>
      update((d) => ({ ...d, weightLog: d.weightLog.filter((w) => w.date !== date) })),
    [update],
  );

  const addCalEntry = useCallback(
    (entry: Omit<CalorieEntry, 'id'>) =>
      update((d) => ({ ...d, calLog: [...d.calLog, { ...entry, id: uid() }] })),
    [update],
  );

  const updateCalEntry = useCallback(
    (entry: CalorieEntry) =>
      update((d) => ({
        ...d,
        calLog: d.calLog.map((e) => (e.id === entry.id ? entry : e)),
      })),
    [update],
  );

  const deleteCalEntry = useCallback(
    (id: string) =>
      update((d) => ({ ...d, calLog: d.calLog.filter((e) => e.id !== id) })),
    [update],
  );

  const addFood = useCallback(
    (food: Omit<FoodItem, 'id'>) =>
      update((d) => ({ ...d, foodList: [...d.foodList, { ...food, id: uid() }] })),
    [update],
  );

  const updateFood = useCallback(
    (food: FoodItem) =>
      update((d) => ({
        ...d,
        foodList: d.foodList.map((f) => (f.id === food.id ? food : f)),
      })),
    [update],
  );

  const deleteFood = useCallback(
    (id: string) =>
      update((d) => ({ ...d, foodList: d.foodList.filter((f) => f.id !== id) })),
    [update],
  );

  return (
    <AppContext.Provider
      value={{
        data,
        updateProfile,
        updateSettings,
        upsertWeight,
        deleteWeight,
        addCalEntry,
        updateCalEntry,
        deleteCalEntry,
        addFood,
        updateFood,
        deleteFood,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
