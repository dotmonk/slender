# Slender

A lightweight, privacy-first weight and calorie tracker that runs entirely in your browser. No accounts, no server — all data lives in `localStorage` on your device.

Installable as a Progressive Web App (PWA) on iPhone and Android. Automatically updated on every push to `main` via GitHub Actions → GitHub Pages.

**Live app:** https://dotmonk.github.io/slender/

---

## Features

- **Daily log** — Log weight (kg) and calorie entries per day, navigate backwards through history
- **Food library** — Save reusable food items with description and calories; pick from the list when logging, with adjustable quantity before saving
- **BMR & TDEE** — Calculated with the Mifflin–St Jeor formula from your profile (height, birthdate, gender) and your latest logged weight
- **Activity levels** — Five levels from Sedentary to Extra Active, each adjusting your TDEE
- **Weight plan** — Lose / Maintain / Gain with Mild / Standard / Aggressive tiers (extreme tiers carry a safety warning)
- **Charts** — Line chart for weight history, bar chart for daily calories with a target line; selectable 7 / 30 / 90-day range
- **PWA** — Installable on home screen, works offline, auto-updates silently on new deploys
- **Grayscale theme** — Light and dark mode, no colours, CSS effects throughout

---

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript |
| Build | Vite 5 |
| Charts | Chart.js 4 + react-chartjs-2 |
| Styles | Plain CSS with custom properties |
| Storage | `localStorage` |
| Deploy | GitHub Actions → GitHub Pages |
| PWA | `public/sw.js` + `public/manifest.json` |

---

## Local development

```bash
npm install
npm run dev          # http://localhost:5173/slender/
```

```bash
npm run build        # type-check + production build → dist/
npm run preview      # preview the production build locally
```

---

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`, which:

1. Runs `npm ci`
2. Injects a build timestamp into the service worker cache key (triggers auto-update on clients)
3. Runs `npm run build`
4. Uploads `dist/` to GitHub Pages

To enable GitHub Pages for the first time: **Settings → Pages → Source → GitHub Actions**.

---

## Project structure

```
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── icon.svg            # App icon
│   └── sw.js               # Service worker (cache-first, auto-update)
└── src/
    ├── main.tsx             # Entry point, SW registration
    ├── App.tsx              # Root component, section routing, modal state
    ├── types.ts             # All TypeScript types and interfaces
    ├── constants.ts         # Activity levels, weight plans
    ├── context/
    │   └── AppContext.tsx   # Global state (useContext + useState) + useApp() hook
    ├── utils/
    │   ├── calculations.ts  # BMR, TDEE, target calories, helpers
    │   ├── dates.ts         # Date formatting and range utilities
    │   ├── storage.ts       # localStorage read / write
    │   └── id.ts            # UID generator
    ├── styles/
    │   └── global.css       # CSS custom properties, theming, all component styles
    └── components/
        ├── Header.tsx
        ├── BottomNav.tsx
        ├── ui/              # Card, StatBox, EmptyState, DateNavigator, ProgressBar
        ├── sections/        # Home, Log, Foods, Charts, Profile
        └── modals/          # CalorieModal, FoodModal
```

---

## Data model

Everything is stored under the key `slender_data` in `localStorage` as JSON:

```ts
{
  profile:   { height, birthdate, gender },
  settings:  { theme, activityId, planType, planLevel },
  weightLog: [{ date, weight }],
  calLog:    [{ id, datetime, desc, kcal }],
  foodList:  [{ id, desc, kcal }]
}
```
