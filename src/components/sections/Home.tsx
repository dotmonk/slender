import { useApp } from '../../context/AppContext';
import Card from '../ui/Card';
import StatBox from '../ui/StatBox';
import ProgressBar from '../ui/ProgressBar';
import {
  getLatestWeight, getCaloriesForDate, sumCalories,
  deriveTargetRangeForDate, profileComplete,
  calcBMR, calcTDEE, calcTarget, getActivity, calcAge,
  calcBodyFat, getPlanForDate, getActivityIdForDate,
} from '../../utils/calculations';
import { todayStr, displayDate } from '../../utils/dates';
import type { Section } from '../../types';

interface Props {
  onNavigate:     (s: Section) => void;
  onOpenCalModal: () => void;
}

export default function Home({ onNavigate }: Props) {
  const { data } = useApp();

  const today        = todayStr();
  const todayEntries = getCaloriesForDate(data.calLog, today);
  const consumed     = sumCalories(todayEntries);
  const range        = deriveTargetRangeForDate(data, today);
  const todayPlan    = getPlanForDate(data, today);
  const isMaintain   = todayPlan.planType === 'maintain';

  // Progress bar uses upper bound so the bar fills toward the max of the window
  const progressMax = range?.max ?? 0;
  const pct         = progressMax > 0 ? Math.min(Math.round((consumed / progressMax) * 100), 100) : 0;

  // For BMR/TDEE budget card — uses latest weight (which now drives the window)
  const lw   = getLatestWeight(data.weightLog);
  const age  = calcAge(data.profile.birthdate);
  const bmr  = calcBMR(lw?.weight ?? null, data.profile.height, age, data.profile.gender);
  const activity = getActivity(getActivityIdForDate(data, today));
  const tdee = calcTDEE(bmr, activity.factor);
  const tgt  = calcTarget(tdee, todayPlan.planType, todayPlan.planLevel);

  const bmi = lw && data.profile.height
    ? (lw.weight / Math.pow(data.profile.height / 100, 2)).toFixed(1)
    : null;
  const bf  = lw ? calcBodyFat(lw.weight, lw.abdomen, data.profile.gender) : null;

  // Calorie summary label
  function calSummaryLabel() {
    if (!range) return null;
    if (isMaintain) return `${range.max} kcal target`;
    return `${range.min}–${range.max} kcal window`;
  }
  const summaryLabel = calSummaryLabel();

  // Remaining label
  function remainingLabel() {
    if (!range) return null;
    const rem = range.max - consumed;
    if (isMaintain) return rem >= 0 ? `${rem} remaining` : `${Math.abs(rem)} over`;
    // For lose/gain show position within window
    if (consumed < range.min) return `${range.min - consumed} below window`;
    if (consumed > range.max) return `${consumed - range.max} above window`;
    return 'In window ✓';
  }

  return (
    <div className="section">
      {!profileComplete(data) && (
        <div className="setup-banner">
          Complete your{' '}
          <a onClick={() => onNavigate('profile')}>Profile</a>{' '}
          to unlock BMR and calorie targets.
        </div>
      )}

      {/* ── Calories today ── */}
      <Card title="Calories Today">
        <div className="stat-row">
          <StatBox value={consumed} label="Consumed" />
          {range && isMaintain  && <StatBox value={range.max} label="Target" />}
          {range && !isMaintain && <StatBox value={`${range.min}–${range.max}`} label="Window" />}
          {range && <StatBox value={remainingLabel() ?? '—'} label={isMaintain ? 'Remaining' : 'Status'} />}
        </div>
        <ProgressBar value={consumed} max={progressMax} />
        <div className="cal-summary">
          <span>{todayEntries.length} entries</span>
          {summaryLabel && <span>{summaryLabel}</span>}
        </div>
      </Card>

      {/* ── Weight ── */}
      <Card title="Weight">
        {lw ? (
          <>
            <div className="stat-row">
              <StatBox value={`${lw.weight} kg`} label="Current" />
              {bmi && <StatBox value={bmi} label="BMI" />}
              {bf != null && <StatBox value={`${bf}%`} label="Body fat" />}
            </div>
            <small>Last logged: {displayDate(lw.date)}</small>
          </>
        ) : (
          <p style={{ color: 'var(--text3)', fontSize: '.88rem' }}>
            No weight logged yet.{' '}
            <a style={{ color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}
               onClick={() => onNavigate('log')}>
              Log weight →
            </a>
          </p>
        )}
      </Card>

      {/* ── Daily budget ── */}
      <Card title="Daily Budget">
        {profileComplete(data) && lw ? (
          <>
            <div className="stat-row">
              {bmr  != null && <StatBox value={bmr}  label="BMR"  />}
              {tdee != null && <StatBox value={tdee} label="TDEE" />}
              {tgt  != null && <StatBox value={tgt}  label="Midpoint" />}
            </div>
            <small>
              {activity.label} ·{' '}
              {todayPlan.planType.charAt(0).toUpperCase() + todayPlan.planType.slice(1)}
            </small>
          </>
        ) : (
          <p style={{ color: 'var(--text3)', fontSize: '.88rem' }}>
            {!profileComplete(data)
              ? 'Set up your profile to see budget.'
              : 'Log a weight entry to calculate BMR.'}
          </p>
        )}
      </Card>
    </div>
  );
}
