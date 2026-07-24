import type { AppData, DayPlan, WeightEntry } from '../types';
import { ACTIVITY_LEVELS, OCCUPATIONS, WEIGHT_PLANS } from '../constants';
import { calcAge, localDateStr, todayStr } from './dates';

/**
 * Mifflin–St Jeor BMR formula.
 * Returns kcal/day or null if any parameter is missing.
 */
export function calcBMR(
  weightKg: number | null,
  heightCm: number | null,
  ageYears: number | null,
  gender: string | null,
): number | null {
  if (!weightKg || !heightCm || !ageYears || !gender) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(gender === 'Male' ? base + 5 : base - 161);
}

/**
 * Calculates TDEE from BMR and an activity multiplier, plus any additive
 * occupational calories (kcal burned at work, above resting).
 */
export function calcTDEE(
  bmr: number | null,
  activityFactor: number,
  occupationKcal: number = 0,
): number | null {
  if (!bmr) return null;
  return Math.round(bmr * activityFactor) + occupationKcal;
}

/** Applies the calorie delta for the selected plan level to the TDEE. */
export function calcTarget(
  tdee: number | null,
  planType: string,
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
 * Returns the activity-level id in effect on a given date.
 *
 *   1. If the date has its own single-day entry in `dayActivities`, use it.
 *   2. Else find the most recent forward-propagating entry in `activityLog`
 *      with `entry.date <= queryDate` and use it.
 *   3. Else fall back to the current default in `settings.activityId`.
 *
 * Mirrors `getPlanForDate` so activity levels can change over time the same
 * way plans do, while old data (no activity history) transparently falls
 * back to the single `settings.activityId`.
 */
export function getActivityIdForDate(data: AppData, dateStr: string): string {
  const dayMatch = (data.dayActivities ?? []).find((a) => a.date === dateStr);
  if (dayMatch) return dayMatch.activityId;

  const eligible = (data.activityLog ?? []).filter((a) => a.date <= dateStr);
  if (eligible.length) {
    const latest = eligible.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
    return latest.activityId;
  }
  return data.settings.activityId;
}

/**
 * Returns the occupation *and its weekly schedule* in effect on a given date.
 * Mirrors `getActivityIdForDate`: single-day override → forward-propagating
 * log → settings defaults (desk / 8h / 5 days for old data). Any schedule
 * field missing on an entry falls back to the settings default.
 */
export function getOccupationForDate(
  data: AppData,
  dateStr: string,
): { occupationId: string; hoursPerDay: number; daysPerWeek: number } {
  const defHours = data.settings.workHoursPerDay ?? 8;
  const defDays  = data.settings.workDaysPerWeek ?? 5;

  const dayMatch = (data.dayOccupations ?? []).find((o) => o.date === dateStr);
  const eligible = (data.occupationLog ?? []).filter((o) => o.date <= dateStr);
  const entry = dayMatch
    ?? (eligible.length ? eligible.slice().sort((a, b) => b.date.localeCompare(a.date))[0] : null);

  if (!entry) {
    return { occupationId: data.settings.occupationId ?? 'desk', hoursPerDay: defHours, daysPerWeek: defDays };
  }
  return {
    occupationId: entry.occupationId,
    hoursPerDay:  entry.hoursPerDay ?? defHours,
    daysPerWeek:  entry.daysPerWeek ?? defDays,
  };
}

/** Convenience: just the occupation id in effect on a date. */
export function getOccupationIdForDate(data: AppData, dateStr: string): string {
  return getOccupationForDate(data, dateStr).occupationId;
}

/** Weekly work hours = hours/day × days/week. */
export function weeklyWorkHours(hoursPerDay: number, daysPerWeek: number): number {
  return hoursPerDay * daysPerWeek;
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
  weightKg: number | null | undefined,
  abdomenCm: number | null | undefined,
  gender: string | null | undefined,
): number | null {
  if (!weightKg || !abdomenCm || !gender) return null;
  if (weightKg <= 0 || abdomenCm <= 0) return null;
  const pct = gender === 'Male'
    ? -26.97 - 0.265 * weightKg + 0.784 * abdomenCm
    : -9.15 - 0.033 * weightKg + 0.500 * abdomenCm;
  if (!isFinite(pct)) return null;
  return Math.round(pct * 10) / 10;
}

/** Returns all calorie entries for a specific local calendar date (YYYY-MM-DD). */
export function getCaloriesForDate(calLog: AppData['calLog'], dateStr: string) {
  return calLog.filter((e) => localDateStr(e.datetime) === dateStr);
}

/** Sums the kcal values of an array of calorie entries. */
export function sumCalories(entries: AppData['calLog']): number {
  return entries.reduce((s, e) => s + (Number(e.kcal) || 0), 0);
}

/** Returns the active ActivityLevel object. */
export function getActivity(activityId: string) {
  return ACTIVITY_LEVELS.find((a) => a.id === activityId) ?? ACTIVITY_LEVELS[2];
}

/** Returns the Occupation object, defaulting to the desk baseline entry. */
export function getOccupation(occupationId: string | undefined) {
  return OCCUPATIONS.find((o) => o.id === occupationId) ?? OCCUPATIONS[0];
}

/**
 * Additive daily calories burned at work, relative to a desk-job baseline,
 * averaged across the whole week:
 *   kcal/day ≈ (MET − DESK.met) × weightKg × (weeklyHours / 7)
 * Desk is subtracted (not resting) because a desk job's activity is already
 * assumed by the standard TDEE activity multiplier — so only work more active
 * than a desk adds calories, and a desk job adds 0. Weekly hours are spread
 * over 7 days so the daily calorie budget reflects the weekly average.
 * Returns 0 when the job is at/below desk, or when weight is unknown.
 */
export function calcOccupationKcal(
  occupationId: string | undefined,
  weightKg:     number | null | undefined,
  weeklyHours:  number | null | undefined,
): number {
  if (!weightKg || weightKg <= 0) return 0;
  const delta = getOccupation(occupationId).met - getOccupation('desk').met;
  if (delta <= 0) return 0;
  const wk = weeklyHours != null && weeklyHours > 0 ? Math.min(weeklyHours, 168) : 40;
  return Math.round(delta * weightKg * (wk / 7));
}

/**
 * Returns the calorie window { min, max } for the selected plan level.
 * For maintenance min === max === TDEE.
 * For lose/gain the window reflects the full band (e.g. 1750–2000 for Mild loss).
 */
export function calcTargetRange(
  tdee: number | null,
  planType: string,
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
  const job = getOccupationForDate(data, dateStr);
  const occ = calcOccupationKcal(job.occupationId, w.weight, weeklyWorkHours(job.hoursPerDay, job.daysPerWeek));
  return calcTDEE(bmr, getActivity(getActivityIdForDate(data, dateStr)).factor, occ);
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
