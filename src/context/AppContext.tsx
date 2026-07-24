import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';
import type { ActivityEntry, AppData, CalorieEntry, DayPlan, FoodItem, OccupationEntry, PlanType, Profile, Settings, WeightEntry } from '../types';
import { clearStoredData, defaultData, isValidBackup, loadData, saveData } from '../utils/storage';
import { localDateStr, todayStr } from '../utils/dates';
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
  setPlanForDate: (date: string, planType: PlanType, planLevel: number) => void;
  setActivityForDate: (date: string, activityId: string) => void;
  setOccupationForDate: (date: string, occupationId: string, hoursPerDay: number, daysPerWeek: number) => void;
  replaceData: (data: AppData) => void;
  resetData: () => void;
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

  /**
   * Save a plan for a date.
   *
   *   - If `date` is today (or in the future), append/upsert it to
   *     `planLog` so today + future days inherit it. Also update the
   *     `settings` default so the Profile UI stays in sync.
   *   - If `date` is in the past, append/upsert it to `dayPlans` only —
   *     it applies to that one day and never propagates anywhere else.
   */
  const setPlanForDate = useCallback(
    (date: string, planType: PlanType, planLevel: number) =>
      update((d) => {
        const isPast = date < todayStr();
        const next: DayPlan = { date, planType, planLevel };

        if (isPast) {
          const list = d.dayPlans ?? [];
          const idx  = list.findIndex((p) => p.date === date);
          const dayPlans =
            idx !== -1 ? list.map((p, i) => (i === idx ? next : p)) : [...list, next];
          return { ...d, dayPlans };
        }

        const list = d.planLog ?? [];
        const idx  = list.findIndex((p) => p.date === date);
        const planLog =
          idx !== -1 ? list.map((p, i) => (i === idx ? next : p)) : [...list, next];
        // Also update the default in settings so Profile/Home reflect today's pick.
        const settings = { ...d.settings, planType, planLevel };
        return { ...d, planLog, settings };
      }),
    [update],
  );

  /**
   * Save an activity level for a date. Mirrors `setPlanForDate`:
   *
   *   - If `date` is today (or in the future), append/upsert it to
   *     `activityLog` so today + future days inherit it. Also update the
   *     `settings` default so the Profile/Home UI stays in sync.
   *   - If `date` is in the past, append/upsert it to `dayActivities`
   *     only — it applies to that one day and never propagates.
   */
  const setActivityForDate = useCallback(
    (date: string, activityId: string) =>
      update((d) => {
        const isPast = date < todayStr();
        const next: ActivityEntry = { date, activityId };

        if (isPast) {
          const list = d.dayActivities ?? [];
          const idx  = list.findIndex((a) => a.date === date);
          const dayActivities =
            idx !== -1 ? list.map((a, i) => (i === idx ? next : a)) : [...list, next];
          return { ...d, dayActivities };
        }

        const list = d.activityLog ?? [];
        const idx  = list.findIndex((a) => a.date === date);
        let activityLog =
          idx !== -1 ? list.map((a, i) => (i === idx ? next : a)) : [...list, next];

        // First-ever forward activity change: until now every past day resolved
        // to the single `settings.activityId`. Adding this entry would leave
        // already-logged earlier days falling back to the *new* level (they have
        // no eligible activityLog entry), retroactively rewriting their TDEE /
        // calorie windows. To keep history intact, anchor the *old* profile
        // activity level at the earliest previously-logged day so those days
        // stay on the level that was actually in effect then.
        const priorId = d.settings.activityId;
        const hasPriorCalDays = d.calLog.some((e) => localDateStr(e.datetime) < date);
        if (list.length === 0 && hasPriorCalDays && priorId !== activityId) {
          const priorDates = [
            ...d.calLog.map((e) => localDateStr(e.datetime)),
            ...d.weightLog.map((w) => w.date),
          ].filter((ds) => ds < date);
          const anchorDate = priorDates.slice().sort()[0];
          activityLog = [{ date: anchorDate, activityId: priorId }, ...activityLog];
        }

        // Keep the settings default in sync so Profile/Home reflect today's pick.
        const settings = { ...d.settings, activityId };
        return { ...d, activityLog, settings };
      }),
    [update],
  );

  /**
   * Save an occupation for a date. Mirrors `setActivityForDate`:
   *   - today/future → `occupationLog` (forward-propagating) + settings default.
   *   - past         → `dayOccupations` (that one day only).
   */
  const setOccupationForDate = useCallback(
    (date: string, occupationId: string, hoursPerDay: number, daysPerWeek: number) =>
      update((d) => {
        const isPast = date < todayStr();
        const next: OccupationEntry = { date, occupationId, hoursPerDay, daysPerWeek };

        if (isPast) {
          const list = d.dayOccupations ?? [];
          const idx  = list.findIndex((o) => o.date === date);
          const dayOccupations =
            idx !== -1 ? list.map((o, i) => (i === idx ? next : o)) : [...list, next];
          return { ...d, dayOccupations };
        }

        const list = d.occupationLog ?? [];
        const idx  = list.findIndex((o) => o.date === date);
        let occupationLog =
          idx !== -1 ? list.map((o, i) => (i === idx ? next : o)) : [...list, next];

        // First forward change: anchor the old occupation (job + schedule) at the
        // earliest logged day so already-logged days keep their TDEE instead of
        // retroactively adopting the new one via the settings fallback.
        const priorId    = d.settings.occupationId ?? 'desk';
        const priorHours  = d.settings.workHoursPerDay ?? 8;
        const priorDays   = d.settings.workDaysPerWeek ?? 5;
        const changed = priorId !== occupationId || priorHours !== hoursPerDay || priorDays !== daysPerWeek;
        const hasPriorCalDays = d.calLog.some((e) => localDateStr(e.datetime) < date);
        if (list.length === 0 && hasPriorCalDays && changed) {
          const priorDates = [
            ...d.calLog.map((e) => localDateStr(e.datetime)),
            ...d.weightLog.map((w) => w.date),
          ].filter((ds) => ds < date);
          const anchorDate = priorDates.slice().sort()[0];
          occupationLog = [
            { date: anchorDate, occupationId: priorId, hoursPerDay: priorHours, daysPerWeek: priorDays },
            ...occupationLog,
          ];
        }

        const settings = { ...d.settings, occupationId, workHoursPerDay: hoursPerDay, workDaysPerWeek: daysPerWeek };
        return { ...d, occupationLog, settings };
      }),
    [update],
  );

  const replaceData = useCallback(
    (next: AppData) => {
      saveData(next);
      setData(next);
    },
    [],
  );

  const resetData = useCallback(() => {
    clearStoredData();
    setData(defaultData());
  }, []);

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
        setPlanForDate,
        setActivityForDate,
        setOccupationForDate,
        replaceData,
        resetData,
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

/**
 * Parses a JSON string into an AppData by merging onto defaults.
 * Throws on invalid JSON or unrecognised structure.
 */
export function parseBackupJson(raw: string): AppData {
  const parsed: unknown = JSON.parse(raw);
  if (!isValidBackup(parsed)) {
    throw new Error('File does not look like a Slender backup.');
  }
  return Object.assign(defaultData(), parsed as Partial<AppData>);
}
