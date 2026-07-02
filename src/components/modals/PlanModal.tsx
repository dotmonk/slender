import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ACTIVITY_LEVELS, OCCUPATIONS, WEIGHT_PLANS } from '../../constants';
import { getPlanForDate, getActivityIdForDate, getOccupationForDate, getOccupation } from '../../utils/calculations';
import { displayDate, todayStr } from '../../utils/dates';
import type { PlanType } from '../../types';

interface Props {
  open:    boolean;
  date:    string;          // YYYY-MM-DD this modal edits the plan for
  onClose: () => void;
}

export default function PlanModal({ open, date, onClose }: Props) {
  const { data, setPlanForDate, setActivityForDate, setOccupationForDate } = useApp();

  // Schedule inputs for this date's job. Seeded from the resolved value and
  // re-synced whenever the target date changes or the modal reopens.
  const job = getOccupationForDate(data, date);
  const [hpd, setHpd] = useState(String(job.hoursPerDay));
  const [dpw, setDpw] = useState(String(job.daysPerWeek));
  useEffect(() => {
    const j = getOccupationForDate(data, date);
    setHpd(String(j.hoursPerDay));
    setDpw(String(j.daysPerWeek));
    // Only resync on date/open changes — not on every data edit, or typing
    // a job change would clobber the fields mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, open]);

  if (!open) return null;

  const plan         = getPlanForDate(data, date);
  const currentPlan  = WEIGHT_PLANS[plan.planType];
  const activityId   = getActivityIdForDate(data, date);
  const occId        = job.occupationId;
  const occAddsKcal  = getOccupation(occId).met > getOccupation('desk').met;
  const isPast       = date < todayStr();

  // Validated numeric schedule (fall back to the resolved value when a field
  // is mid-edit / invalid) so a job switch keeps this date's current hours.
  const hpdNum = (() => { const n = parseFloat(hpd); return !isNaN(n) && n > 0 && n <= 24 ? n : job.hoursPerDay; })();
  const dpwNum = (() => { const n = parseFloat(dpw); return !isNaN(n) && n > 0 && n <= 7  ? n : job.daysPerWeek; })();

  function selectType(t: PlanType) {
    setPlanForDate(date, t, 0);
  }
  function selectLevel(i: number) {
    setPlanForDate(date, plan.planType as PlanType, i);
  }
  function selectActivity(id: string) {
    setActivityForDate(date, id);
  }
  function selectOccupation(id: string) {
    setOccupationForDate(date, id, hpdNum, dpwNum);
  }
  function handleHpd(v: string) {
    setHpd(v);
    const n = parseFloat(v);
    if (!isNaN(n) && n > 0 && n <= 24) setOccupationForDate(date, occId, n, dpwNum);
  }
  function handleDpw(v: string) {
    setDpw(v);
    const n = parseFloat(v);
    if (!isNaN(n) && n > 0 && n <= 7) setOccupationForDate(date, occId, hpdNum, n);
  }

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">Change plan, activity &amp; job</div>
            <div style={{ fontSize: '.78rem', color: 'var(--text3)', marginTop: 2 }}>
              For {displayDate(date)}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="plan-tabs">
          {Object.entries(WEIGHT_PLANS).map(([key, p]) => (
            <div
              key={key}
              className={`plan-tab${plan.planType === key ? ' selected' : ''}`}
              onClick={() => selectType(key as PlanType)}
            >
              {p.label}
            </div>
          ))}
        </div>

        <div className="plan-levels">
          {currentPlan.levels.map((lvl, i) => (
            <div key={i}>
              <label
                className={`plan-level${plan.planLevel === i ? ' selected' : ''}`}
                onClick={() => selectLevel(i)}
              >
                <div className="plan-level-dot" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '.88rem', fontWeight: 600 }}>{lvl.label}</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text3)' }}>{lvl.sub}</div>
                </div>
                {lvl.warning && <span className="badge badge-warn">⚠ Extreme</span>}
              </label>
              {lvl.warning && plan.planLevel === i && (
                <div className="warning-box">
                  An Extreme calorie change (≥1000 kcal/day delta) carries real health
                  risks and is rarely sustainable. Consult a healthcare professional
                  before pursuing this level.
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text2)', marginTop: 18, marginBottom: 8 }}>
          Activity level
        </div>
        <div className="activity-grid">
          {ACTIVITY_LEVELS.map((a) => (
            <label
              key={a.id}
              className={`activity-option${activityId === a.id ? ' selected' : ''}`}
              onClick={() => selectActivity(a.id)}
            >
              <div className="activity-dot" />
              <div>
                <div className="activity-label">{a.label}</div>
                <div className="activity-desc">{a.desc} · ×{a.factor}</div>
              </div>
            </label>
          ))}
        </div>

        <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text2)', marginTop: 18, marginBottom: 8 }}>
          Work / job
        </div>
        <div className="activity-grid">
          {OCCUPATIONS.map((o) => (
            <label
              key={o.id}
              className={`activity-option${occId === o.id ? ' selected' : ''}`}
              onClick={() => selectOccupation(o.id)}
            >
              <div className="activity-dot" />
              <div>
                <div className="activity-label">{o.label}</div>
                <div className="activity-desc">{o.desc}</div>
              </div>
            </label>
          ))}
        </div>

        {occAddsKcal && (
          <>
            <div className="form-row" style={{ marginTop: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="pm-workhpd">Hours per day</label>
                <input
                  id="pm-workhpd" className="form-input" type="number"
                  min={0} max={24} step={0.5} inputMode="decimal"
                  value={hpd}
                  onChange={(e) => handleHpd(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="pm-workdpw">Days per week</label>
                <input
                  id="pm-workdpw" className="form-input" type="number"
                  min={0} max={7} step={1} inputMode="numeric"
                  value={dpw}
                  onChange={(e) => handleDpw(e.target.value)}
                />
              </div>
            </div>
            <div style={{ fontSize: '.78rem', color: 'var(--text3)', marginTop: 6 }}>
              {hpdNum * dpwNum} h/week, averaged across the week.
            </div>
          </>
        )}

        <div style={{ fontSize: '.78rem', color: 'var(--text3)', marginTop: 12, lineHeight: 1.5 }}>
          {isPast
            ? 'Editing a past day changes only that day.'
            : 'Changes apply to today and future days.'}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn btn-primary btn-full" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
