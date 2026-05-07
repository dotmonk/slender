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
}

export interface WeightEntry {
  date:   string; // YYYY-MM-DD
  weight: number;
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
}

// ── Constants shape ──────────────────────────────────────────────────────────

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
