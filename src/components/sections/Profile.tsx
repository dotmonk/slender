import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import Card from '../ui/Card';
import StatBox from '../ui/StatBox';
import { ACTIVITY_LEVELS, WEIGHT_PLANS } from '../../constants';
import {
  getLatestWeight, calcBMR, calcTDEE, calcTarget, calcTargetRange,
  getActivity, calcAge,
} from '../../utils/calculations';
import type { Gender, PlanType } from '../../types';

export default function Profile() {
  const { data, updateProfile, updateSettings } = useApp();
  const p = data.profile;
  const s = data.settings;

  // Local form state (avoids controlled-input lag)
  const [height,    setHeight]    = useState(p.height?.toString()    ?? '');
  const [birthdate, setBirthdate] = useState(p.birthdate             ?? '');
  const [gender,    setGender]    = useState<Gender | ''>(p.gender   ?? '');
  const [toast,     setToast]     = useState('');

  // Sync if external data changes (e.g. first load)
  useEffect(() => {
    setHeight(p.height?.toString() ?? '');
    setBirthdate(p.birthdate ?? '');
    setGender(p.gender ?? '');
  }, [p.height, p.birthdate, p.gender]);

  const lw         = getLatestWeight(data.weightLog);
  const age        = calcAge(birthdate || null);
  const bmr        = calcBMR(lw?.weight ?? null, Number(height) || null, age, gender || null);
  const tdee       = calcTDEE(bmr, getActivity(s.activityId).factor);
  const tgt        = calcTarget(tdee, s.planType, s.planLevel);
  const tgtRange   = calcTargetRange(tdee, s.planType, s.planLevel);
  const isMaintain = s.planType === 'maintain';

  function saveProfile() {
    const h = parseInt(height);
    if (!h || !birthdate || !gender) {
      alert('Please fill in all personal info fields.');
      return;
    }
    updateProfile({ height: h, birthdate, gender: gender as Gender });
    setToast('Profile saved ✓');
    setTimeout(() => setToast(''), 2500);
  }

  function selectActivity(id: string) { updateSettings({ activityId: id }); }
  function selectPlanType(type: PlanType) { updateSettings({ planType: type, planLevel: 0 }); }
  function selectPlanLevel(i: number) { updateSettings({ planLevel: i }); }

  const currentPlan   = WEIGHT_PLANS[s.planType];
  const currentLevel  = currentPlan?.levels[s.planLevel];

  return (
    <div className="section">
      <h2 style={{ marginBottom: 14 }}>Profile &amp; Goals</h2>

      {/* ── Personal info ── */}
      <Card title="Personal Info">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="p-height">Height (cm)</label>
            <input
              id="p-height" className="form-input" type="number"
              placeholder="e.g. 178" min={100} max={250} inputMode="numeric"
              value={height} onChange={(e) => setHeight(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="p-gender">Gender</label>
            <select id="p-gender" className="form-input form-select"
              value={gender} onChange={(e) => setGender(e.target.value as Gender | '')}>
              <option value="">Select…</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="p-birthdate">Birthdate</label>
          <input
            id="p-birthdate" className="form-input" type="date"
            value={birthdate} onChange={(e) => setBirthdate(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-full" onClick={saveProfile}>
          Save Profile
        </button>
        {toast && <div style={{ marginTop: 8, fontSize: '.82rem', color: 'var(--text3)' }}>{toast}</div>}
      </Card>

      {/* ── BMR ── */}
      {bmr != null && (
        <Card title="Basal Metabolic Rate">
          <div className="stat-row">
            <StatBox value={bmr} label="kcal / day" />
            {age != null && <StatBox value={age} label="Age" />}
            {lw  && <StatBox value={lw.weight} label="kg" />}
          </div>
          <small>Mifflin–St Jeor formula · uses your latest logged weight</small>
        </Card>
      )}

      {/* ── Activity ── */}
      <Card title="Activity Level">
        <div className="activity-grid">
          {ACTIVITY_LEVELS.map((a) => (
            <label
              key={a.id}
              className={`activity-option${s.activityId === a.id ? ' selected' : ''}`}
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
      </Card>

      {/* ── TDEE ── */}
      {tdee != null && (
        <Card title="Total Daily Energy Expenditure">
          <div className="stat-row">
            <StatBox value={tdee} label="kcal / day" />
          </div>
          <small>{getActivity(s.activityId).label} — calories to maintain current weight</small>
        </Card>
      )}

      {/* ── Weight plan ── */}
      <Card title="Weight Plan">
        <div className="plan-tabs">
          {Object.entries(WEIGHT_PLANS).map(([key, plan]) => (
            <div
              key={key}
              className={`plan-tab${s.planType === key ? ' selected' : ''}`}
              onClick={() => selectPlanType(key as PlanType)}
            >
              {plan.label}
            </div>
          ))}
        </div>

        <div className="plan-levels">
          {currentPlan.levels.map((lvl, i) => (
            <div key={i}>
              <label
                className={`plan-level${s.planLevel === i ? ' selected' : ''}`}
                onClick={() => selectPlanLevel(i)}
              >
                <div className="plan-level-dot" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '.88rem', fontWeight: 600 }}>{lvl.label}</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text3)' }}>{lvl.sub}</div>
                </div>
                {lvl.warning && <span className="badge badge-warn">⚠ Extreme</span>}
              </label>
              {lvl.warning && s.planLevel === i && (
                <div className="warning-box">
                  Extreme calorie changes may be unsafe. Consult a healthcare professional
                  before pursuing this level.
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Target / Range ── */}
      {isMaintain && tgt != null && (
        <div className="target-display">
          <div className="big-num">{tgt}</div>
          <div className="big-lbl">Target calories / day</div>
        </div>
      )}

      {!isMaintain && tgtRange != null && (
        <div className="target-display">
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'baseline' }}>
            <div>
              <div className="big-num" style={{ fontSize: '2rem' }}>{tgtRange.min}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>Min kcal</div>
            </div>
            <div style={{ fontSize: '1.4rem', color: 'var(--text3)', fontWeight: 300 }}>–</div>
            <div>
              <div className="big-num" style={{ fontSize: '2rem' }}>{tgtRange.max}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>Max kcal</div>
            </div>
          </div>
          <div className="big-lbl" style={{ marginTop: 10 }}>
            Daily calorie window / day
          </div>
        </div>
      )}
    </div>
  );
}
