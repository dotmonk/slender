import type { ActivityLevel, Occupation, WeightPlan } from './types';

export const ACTIVITY_LEVELS: ActivityLevel[] = [
  { id: 'sed',   label: 'Sedentary',        desc: 'Little or no exercise',           factor: 1.2   },
  { id: 'light', label: 'Lightly Active',    desc: 'Light exercise 1–3 days/week',    factor: 1.375 },
  { id: 'mod',   label: 'Moderately Active', desc: 'Moderate exercise 3–5 days/week', factor: 1.55  },
  { id: 'very',  label: 'Very Active',        desc: 'Hard exercise 6–7 days/week',     factor: 1.725 },
  { id: 'extra', label: 'Extra Active',       desc: 'Very hard exercise daily',        factor: 1.9   },
];

/**
 * Occupational activity, added on top of BMR × activity factor.
 *
 * Work kcal ≈ (met − DESK.met) × weightKg × hours. The subtraction makes a
 * **desk job the zero baseline** — a desk job's activity is already assumed
 * by the standard TDEE activity multiplier, so only work *more* active than a
 * desk adds calories. Desk is the first entry and the default, so existing
 * data (no occupation recorded) computes exactly as before.
 */
export const OCCUPATIONS: Occupation[] = [
  { id: 'desk',     label: 'Desk / seated',  desc: 'Office, driving — mostly sitting',    met: 1.3 },
  { id: 'feet',     label: 'On your feet',   desc: 'Retail, teaching — standing/walking', met: 2.2 },
  { id: 'physical', label: 'Physical',       desc: 'Chef, nurse, warehouse — active',     met: 3.5 },
  { id: 'heavy',    label: 'Heavy labor',    desc: 'Construction, moving — strenuous',    met: 4.5 },
];

export const WEIGHT_PLANS: Record<string, WeightPlan> = {
  decrease: {
    label: 'Lose',
    levels: [
      { label: 'Mild',       sub: '−250–500 kcal/day',   delta: -375,  deltaMin: -500,  deltaMax: -250, warning: false },
      { label: 'Standard',   sub: '−500–750 kcal/day',   delta: -625,  deltaMin: -750,  deltaMax: -500, warning: false },
      { label: 'Aggressive', sub: '−750–1000 kcal/day',  delta: -875,  deltaMin: -1000, deltaMax: -750, warning: false },
      { label: 'Extreme',    sub: '−1000–1500 kcal/day', delta: -1250, deltaMin: -1500, deltaMax: -1000, warning: true  },
    ],
  },
  maintain: {
    label: 'Maintain',
    levels: [
      { label: 'Maintain Weight', sub: '±0 kcal/day', delta: 0, deltaMin: 0, deltaMax: 0, warning: false },
    ],
  },
  increase: {
    label: 'Gain',
    levels: [
      { label: 'Mild',       sub: '+250–500 kcal/day',   delta: 375,  deltaMin: 250,  deltaMax: 500,  warning: false },
      { label: 'Standard',   sub: '+500–750 kcal/day',   delta: 625,  deltaMin: 500,  deltaMax: 750,  warning: false },
      { label: 'Aggressive', sub: '+750–1000 kcal/day',  delta: 875,  deltaMin: 750,  deltaMax: 1000, warning: false },
      { label: 'Extreme',    sub: '+1000–1500 kcal/day', delta: 1250, deltaMin: 1000, deltaMax: 1500, warning: true  },
    ],
  },
};
