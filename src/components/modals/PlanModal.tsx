import { useApp } from '../../context/AppContext';
import { WEIGHT_PLANS } from '../../constants';
import { getPlanForDate } from '../../utils/calculations';
import { displayDate, todayStr } from '../../utils/dates';
import type { PlanType } from '../../types';

interface Props {
  open:    boolean;
  date:    string;          // YYYY-MM-DD this modal edits the plan for
  onClose: () => void;
}

export default function PlanModal({ open, date, onClose }: Props) {
  const { data, setPlanForDate } = useApp();

  if (!open) return null;

  const plan        = getPlanForDate(data, date);
  const currentPlan = WEIGHT_PLANS[plan.planType];
  const isPast      = date < todayStr();

  function selectType(t: PlanType) {
    setPlanForDate(date, t, 0);
  }
  function selectLevel(i: number) {
    setPlanForDate(date, plan.planType as PlanType, i);
  }

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">Change plan</div>
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
