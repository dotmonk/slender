import type { AppData, DayPlan, WeightEntry } from '../types';
import { ACTIVITY_LEVELS, WEIGHT_PLANS } from '../constants';
import { calcAge, todayStr } from './dates';

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

/** Returns the most recent WeightEntry on or before the given date, or null. */
export function getWeightOnOrBefore(weightLog: WeightEntry[], dateStr: string): WeightEntry | null {
  const eligible = weightLog.filter((w) => w.date <= dateStr);
  if (!eligible.length) return null;
  return eligible.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
}

/**
 * Returns the plan in effect on a given date.
 *
 *   1. If the date has its own single-day entry in `dayPlans`, use it.
 *   2. Else find the most recent forward-propagating entry in `planLog`
 *      with `entry.date <= queryDate` and use it.
 *   3. Else fall back to the current default in `settings`.
 *
 * This means:
 *   - Editing a past day adds a `dayPlans` entry → only that day changes.
 *   - Editing today adds a `planLog` entry → today + any future day that
 *     has no later forward entry inherits the new plan.
 */
export function getPlanForDate(
  data: AppData,
  dateStr: string,
): { planType: string; planLevel: number } {
  const dayMatch = (data.dayPlans ?? []).find((p) => p.date === dateStr);
  if (dayMatch) return { planType: dayMatch.planType, planLevel: dayMatch.planLevel };

  const eligible = (data.planLog ?? []).filter((p) => p.date <= dateStr);
  if (eligible.length) {
    const latest = eligible.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
    return { planType: latest.planType, planLevel: latest.planLevel };
  }
  return { planType: data.settings.planType, planLevel: data.settings.planLevel };
}

/**
 * U.S. Army-style body-fat estimate using only weight and abdomen circumference.
 * Returns % body fat rounded to 1 decimal, or null if any input is missing/invalid.
 *
 * Male:    %BF ≈ -26.97 − (0.265 × kg) + (0.784 × abdomen cm)
 * Female:  %BF ≈  -9.15 − (0.033 × kg) + (0.500 × abdomen cm)
 *
 * Note: this is a simplified single-site (abdomen) variant of the tape-test
 * approach. The official U.S. Army Body Composition Program tape test
 * additionally measures neck (and waist + hip for women); this single-site
 * version trades some accuracy for ease of measurement.
 */
export function calcBodyFat(
  weightKg:   number | null | undefined,
  abdomenCm:  number | null | undefined,
  gender:     string | null | undefined,
): number | null {
  if (!weightKg || !abdomenCm || !gender) return null;
  if (weightKg <= 0 || abdomenCm <= 0)    return null;
  const pct = gender === 'Male'
    ? -26.97 - 0.265 * weightKg + 0.784 * abdomenCm
    :  -9.15 - 0.033 * weightKg + 0.500 * abdomenCm;
  if (!isFinite(pct)) return null;
  return Math.round(pct * 10) / 10;
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
 * One-stop helper: derives TDEE from the full app data, using today's
 * latest logged weight.
 */
export function deriveTDEE(data: AppData): number | null {
  return deriveTDEEForDate(data, todayStr());
}

/**
 * Derives TDEE for a specific date, using the most-recent weight on or
 * before that date. Falls back to the latest weight if the date is
 * earlier than the very first weight entry.
 */
export function deriveTDEEForDate(data: AppData, dateStr: string): number | null {
  const w = getWeightOnOrBefore(data.weightLog, dateStr) ?? getLatestWeight(data.weightLog);
  if (!w) return null;
  const age = calcAge(data.profile.birthdate);
  const bmr = calcBMR(w.weight, data.profile.height, age, data.profile.gender);
  return calcTDEE(bmr, getActivity(data.settings.activityId).factor);
}

/**
 * One-stop helper: derives target daily calories from the full app data,
 * using today's latest weight and current plan.
 */
export function deriveTarget(data: AppData): number | null {
  return deriveTargetForDate(data, todayStr());
}

export function deriveTargetForDate(data: AppData, dateStr: string): number | null {
  const tdee = deriveTDEEForDate(data, dateStr);
  const plan = getPlanForDate(data, dateStr);
  return calcTarget(tdee, plan.planType, plan.planLevel);
}

/**
 * One-stop helper: derives the calorie window from the full app data
 * for today (latest weight, current plan).
 */
export function deriveTargetRange(data: AppData): { min: number; max: number } | null {
  return deriveTargetRangeForDate(data, todayStr());
}

/**
 * Derives the calorie window for a specific date, using:
 *  - the most recent weight on or before the date
 *  - the plan in effect on that date (planLog → settings fallback)
 */
export function deriveTargetRangeForDate(
  data: AppData,
  dateStr: string,
): { min: number; max: number } | null {
  const tdee = deriveTDEEForDate(data, dateStr);
  const plan = getPlanForDate(data, dateStr);
  return calcTargetRange(tdee, plan.planType, plan.planLevel);
}

// Re-export DayPlan for convenience.
export type { DayPlan };

/** Returns true when all required profile fields are filled in. */
export function profileComplete(data: AppData): boolean {
  const { height, birthdate, gender } = data.profile;
  return !!(height && birthdate && gender);
}

// Re-export so consumers can import calcAge from one place if they prefer.
export { calcAge };
