import type { ActivityLevel, WeightPlan } from './types';

export const ACTIVITY_LEVELS: ActivityLevel[] = [
  { id: 'sed',   label: 'Sedentary',        desc: 'Little or no exercise',             factor: 1.2   },
  { id: 'light', label: 'Lightly Active',    desc: 'Light exercise 1–3 days/week',      factor: 1.375 },
  { id: 'mod',   label: 'Moderately Active', desc: 'Moderate exercise 3–5 days/week',   factor: 1.55  },
  { id: 'very',  label: 'Very Active',        desc: 'Hard exercise 6–7 days/week',       factor: 1.725 },
  { id: 'extra', label: 'Extra Active',       desc: 'Very hard exercise & physical job', factor: 1.9   },
];

export const WEIGHT_PLANS: Record<string, WeightPlan> = {
  decrease: {
    label: 'Lose',
    levels: [
      { label: 'Mild',       sub: '−250–500 kcal/day',  delta: -375, deltaMin: -500,  deltaMax: -250, warning: false },
      { label: 'Standard',   sub: '−500–750 kcal/day',  delta: -625, deltaMin: -750,  deltaMax: -500, warning: false },
      { label: 'Aggressive', sub: '−750–1000 kcal/day', delta: -875, deltaMin: -1000, deltaMax: -750, warning: true  },
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
      { label: 'Mild',       sub: '+250–500 kcal/day',  delta: 375, deltaMin: 250, deltaMax: 500,  warning: false },
      { label: 'Standard',   sub: '+500–750 kcal/day',  delta: 625, deltaMin: 500, deltaMax: 750,  warning: false },
      { label: 'Aggressive', sub: '+750–1000 kcal/day', delta: 875, deltaMin: 750, deltaMax: 1000, warning: true  },
    ],
  },
};
