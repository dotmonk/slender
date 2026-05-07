import type { AppData, WeightEntry } from '../types';
import { ACTIVITY_LEVELS, WEIGHT_PLANS } from '../constants';
import { calcAge } from './dates';

/**
 * Mifflin–St Jeor BMR formula.
 * Returns kcal/day or null if any parameter is missing.
 */
export function calcBMR(
  weightKg: number | null,
  heightCm: number | null,
  ageYears: number | null,
  gender:   string | null,
): number | null {
  if (!weightKg || !heightCm || !ageYears || !gender) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(gender === 'Male' ? base + 5 : base - 161);
}

/** Calculates TDEE from BMR and an activity multiplier. */
export function calcTDEE(bmr: number | null, activityFactor: number): number | null {
  if (!bmr) return null;
  return Math.round(bmr * activityFactor);
}

/** Applies the calorie delta for the selected plan level to the TDEE. */
export function calcTarget(
  tdee:      number | null,
  planType:  string,
  planLevel: number,
): number | null {
  if (!tdee) return null;
  const plan = WEIGHT_PLANS[planType];
  if (!plan) return tdee;
  const lvl = plan.levels[planLevel];
  if (!lvl) return tdee;
  return tdee + lvl.delta;
}

/** Returns the most recently logged weight entry, or null. */
export function getLatestWeight(weightLog: WeightEntry[]): WeightEntry | null {
  if (!weightLog.length) return null;
  return [...weightLog].sort((a, b) => b.date.localeCompare(a.date))[0];
}

/** Returns the weight entry for a specific date, or null. */
export function getWeightForDate(weightLog: WeightEntry[], dateStr: string): WeightEntry | null {
  return weightLog.find((w) => w.date === dateStr) ?? null;
}

/** Returns all calorie entries for a specific date (YYYY-MM-DD). */
export function getCaloriesForDate(calLog: AppData['calLog'], dateStr: string) {
  return calLog.filter((e) => e.datetime.startsWith(dateStr));
}

/** Sums the kcal values of an array of calorie entries. */
export function sumCalories(entries: AppData['calLog']): number {
  return entries.reduce((s, e) => s + (Number(e.kcal) || 0), 0);
}

/** Returns the active ActivityLevel object. */
export function getActivity(activityId: string) {
  return ACTIVITY_LEVELS.find((a) => a.id === activityId) ?? ACTIVITY_LEVELS[2];
}

/**
 * Returns the calorie window { min, max } for the selected plan level.
 * For maintenance min === max === TDEE.
 * For lose/gain the window reflects the full band (e.g. 1750–2000 for Mild loss).
 */
export function calcTargetRange(
  tdee:      number | null,
  planType:  string,
  planLevel: number,
): { min: number; max: number } | null {
  if (!tdee) return null;
  const plan = WEIGHT_PLANS[planType];
  if (!plan) return { min: tdee, max: tdee };
  const lvl = plan.levels[planLevel];
  if (!lvl) return { min: tdee, max: tdee };
  return { min: tdee + lvl.deltaMin, max: tdee + lvl.deltaMax };
}

/**
 * One-stop helper: derives TDEE from the full app data.
 */
export function deriveTDEE(data: AppData): number | null {
  const lw = getLatestWeight(data.weightLog);
  if (!lw) return null;
  const age = calcAge(data.profile.birthdate);
  const bmr = calcBMR(lw.weight, data.profile.height, age, data.profile.gender);
  return calcTDEE(bmr, getActivity(data.settings.activityId).factor);
}

/**
 * One-stop helper: derives target daily calories from the full app data.
 * Uses the latest weight log entry for BMR.
 */
export function deriveTarget(data: AppData): number | null {
  const tdee = deriveTDEE(data);
  return calcTarget(tdee, data.settings.planType, data.settings.planLevel);
}

/**
 * One-stop helper: derives the calorie window from the full app data.
 */
export function deriveTargetRange(data: AppData): { min: number; max: number } | null {
  const tdee = deriveTDEE(data);
  return calcTargetRange(tdee, data.settings.planType, data.settings.planLevel);
}

/** Returns true when all required profile fields are filled in. */
export function profileComplete(data: AppData): boolean {
  const { height, birthdate, gender } = data.profile;
  return !!(height && birthdate && gender);
}

// Re-export so consumers can import calcAge from one place if they prefer.
export { calcAge };
