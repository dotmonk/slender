export type Gender   = 'Male' | 'Female';
export type PlanType = 'decrease' | 'maintain' | 'increase';
export type Section  = 'home' | 'log' | 'foods' | 'charts' | 'profile';
export type Theme    = 'light' | 'dark';

export interface Profile {
  height:    number | null;
  birthdate: string | null; // YYYY-MM-DD
  gender:    Gender | null;
}

export interface Settings {
  theme:      Theme;
  activityId: string;
  planType:   PlanType;
  planLevel:  number;
  /**
   * Occupational activity. Kept optional so backups/stored data written
   * before this feature load unchanged (undefined → desk baseline, +0 kcal).
   * Work is entered as a weekly average (hours/day × days/week) and averaged
   * over 7 days when applied to the daily calorie budget.
   */
  occupationId?:   string;
  workHoursPerDay?: number; // hours on a typical work day (default 8)
  workDaysPerWeek?: number; // work days per week (default 5)
}

export interface WeightEntry {
  date:    string; // YYYY-MM-DD
  weight:  number;
  abdomen?: number; // optional waist circumference at navel, cm — used for body-fat estimate
}

export interface DayPlan {
  date:      string; // YYYY-MM-DD — date this plan setting starts applying from
  planType:  PlanType;
  planLevel: number;
}

export interface ActivityEntry {
  date:       string; // YYYY-MM-DD — date this activity setting starts applying from
  activityId: string;
}

export interface OccupationEntry {
  date:         string; // YYYY-MM-DD — date this occupation starts applying from
  occupationId: string;
  // Weekly work schedule in effect from this date. Optional so older entries
  // (job only) fall back to the settings defaults.
  hoursPerDay?: number;
  daysPerWeek?: number;
}

export interface CalorieEntry {
  id:       string;
  datetime: string; // ISO-8601
  desc:     string;
  kcal:     number;
}

export interface FoodItem {
  id:   string;
  desc: string;
  kcal: number;
}

export interface AppData {
  profile:   Profile;
  settings:  Settings;
  weightLog: WeightEntry[];
  calLog:    CalorieEntry[];
  foodList:  FoodItem[];
  /**
   * Forward-propagating plan changes. An entry at date D means
   * "from D onward (until the next planLog entry), this is the plan."
   * Only added when the user changes the plan on the current day.
   */
  planLog:   DayPlan[];
  /**
   * Per-date single-day plans. Created when the user edits the plan on
   * a past day — that change applies only to that one date and never
   * affects any other date's lookup.
   */
  dayPlans:  DayPlan[];
  /**
   * Forward-propagating activity-level changes. An entry at date D means
   * "from D onward (until the next activityLog entry), this is the
   * activity level." Mirrors `planLog`; only added when the user changes
   * activity on the current (or a future) day.
   */
  activityLog?:   ActivityEntry[];
  /**
   * Per-date single-day activity levels. Created when the user edits the
   * activity level on a past day — that change applies only to that one
   * date. Mirrors `dayPlans`.
   */
  dayActivities?: ActivityEntry[];
  /**
   * Forward-propagating occupation changes. Mirrors `activityLog`; only
   * added when the user changes their job on the current (or a future) day.
   */
  occupationLog?:  OccupationEntry[];
  /**
   * Per-date single-day occupations. Created when the user edits the job on
   * a past day — applies only to that date. Mirrors `dayActivities`.
   */
  dayOccupations?: OccupationEntry[];
}

// ── Constants shape ──────────────────────────────────────────────────────────

export interface Occupation {
  id:    string;
  label: string;
  desc:  string;
  met:   number; // metabolic equivalent while working; work kcal = (met − 1) × kg × hours
}

export interface ActivityLevel {
  id:     string;
  label:  string;
  desc:   string;
  factor: number;
}

export interface PlanLevel {
  label:    string;
  sub:      string;
  delta:    number; // midpoint, kept for backwards compat
  deltaMin: number; // lower-calorie bound of the window (e.g. −500 for Mild loss)
  deltaMax: number; // upper-calorie bound of the window (e.g. −250 for Mild loss)
  warning:  boolean;
}

export interface WeightPlan {
  label:  string;
  levels: PlanLevel[];
}

// ── Modal state ───────────────────────────────────────────────────────────────

export interface CalModalState {
  open:        boolean;
  editId:      string | null;
  prefillDate: string;
}

export interface FoodModalState {
  open:   boolean;
  editId: string | null;
}
