import { useState, useEffect, useRef } from 'react';
import { useApp, parseBackupJson } from '../../context/AppContext';
import Card from '../ui/Card';
import StatBox from '../ui/StatBox';
import { ACTIVITY_LEVELS, OCCUPATIONS, WEIGHT_PLANS } from '../../constants';
import {
  getLatestWeight, calcBMR, calcTDEE, calcTarget, calcTargetRange,
  getActivity, getOccupation, calcOccupationKcal, weeklyWorkHours, calcAge, calcBodyFat,
} from '../../utils/calculations';
import { todayStr } from '../../utils/dates';
import type { Gender, PlanType } from '../../types';

export default function Profile() {
  const { data, updateProfile, setPlanForDate, setActivityForDate, setOccupationForDate, replaceData, resetData } = useApp();
  // setPlanForDate / setActivityForDate / setOccupationForDate each update the
  // matching settings defaults themselves when called with today's date.
  const p = data.profile;
  const s = data.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [dataMsg, setDataMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Local form state (avoids controlled-input lag)
  const [height, setHeight] = useState(p.height?.toString() ?? '');
  const [birthdate, setBirthdate] = useState(p.birthdate ?? '');
  const [gender, setGender] = useState<Gender | ''>(p.gender ?? '');
  const [hoursPerDayInput, setHoursPerDayInput] = useState(String(s.workHoursPerDay ?? 8));
  const [daysPerWeekInput, setDaysPerWeekInput] = useState(String(s.workDaysPerWeek ?? 5));
  const [toast, setToast] = useState('');

  // Sync if external data changes (e.g. first load)
  useEffect(() => {
    setHeight(p.height?.toString() ?? '');
    setBirthdate(p.birthdate ?? '');
    setGender(p.gender ?? '');
  }, [p.height, p.birthdate, p.gender]);

  // Keep the schedule inputs in sync when settings change externally (e.g. restore).
  useEffect(() => { setHoursPerDayInput(String(s.workHoursPerDay ?? 8)); }, [s.workHoursPerDay]);
  useEffect(() => { setDaysPerWeekInput(String(s.workDaysPerWeek ?? 5)); }, [s.workDaysPerWeek]);

  const lw = getLatestWeight(data.weightLog);
  const age = calcAge(birthdate || null);
  const bmr = calcBMR(lw?.weight ?? null, Number(height) || null, age, gender || null);
  const occId        = s.occupationId ?? 'desk';
  const hoursPerDay  = s.workHoursPerDay ?? 8;
  const daysPerWeek  = s.workDaysPerWeek ?? 5;
  const weeklyHours  = weeklyWorkHours(hoursPerDay, daysPerWeek);
  const occKcal      = calcOccupationKcal(occId, lw?.weight ?? null, weeklyHours);
  const occAddsKcal  = getOccupation(occId).met > getOccupation('desk').met;
  const tdee         = calcTDEE(bmr, getActivity(s.activityId).factor, occKcal);
  const tgt = calcTarget(tdee, s.planType, s.planLevel);
  const tgtRange = calcTargetRange(tdee, s.planType, s.planLevel);
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

  function selectActivity(id: string) {
    // Today's activity change → activityLog (forward-propagating). setActivityForDate
    // also keeps settings.activityId in sync.
    setActivityForDate(todayStr(), id);
  }
  // Job and schedule changes all go through setOccupationForDate(today, …) so
  // they forward-propagate (and record history) exactly like an activity change.
  function selectOccupation(id: string) {
    setOccupationForDate(todayStr(), id, hoursPerDay, daysPerWeek);
  }
  function handleHoursPerDay(v: string) {
    setHoursPerDayInput(v);
    const n = parseFloat(v);
    if (!isNaN(n) && n > 0 && n <= 24) setOccupationForDate(todayStr(), occId, n, daysPerWeek);
  }
  function handleDaysPerWeek(v: string) {
    setDaysPerWeekInput(v);
    const n = parseFloat(v);
    if (!isNaN(n) && n > 0 && n <= 7) setOccupationForDate(todayStr(), occId, hoursPerDay, n);
  }
  function selectPlanType(type: PlanType) {
    // Today's plan change → planLog (forward-propagating). setPlanForDate
    // also keeps settings.planType/level in sync.
    setPlanForDate(todayStr(), type, 0);
  }
  function selectPlanLevel(i: number) {
    setPlanForDate(todayStr(), s.planType, i);
  }

  // ── Backup / Restore / Clear ─────────────────────────────────────────────
  function showDataMsg(kind: 'ok' | 'err', text: string) {
    setDataMsg({ kind, text });
    setTimeout(() => setDataMsg(null), 3500);
  }

  function downloadBackup() {
    try {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slender-backup-${todayStr()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showDataMsg('ok', 'Backup downloaded ✓');
    } catch (e) {
      console.warn(e);
      showDataMsg('err', 'Could not create backup.');
    }
  }

  function pickRestore() { fileRef.current?.click(); }

  function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ''; // reset so picking the same file again still triggers change
    if (!f) return;
    if (!confirm(`Restore from "${f.name}"? This will overwrite all current data.`)) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = parseBackupJson(String(reader.result ?? ''));
        replaceData(next);
        showDataMsg('ok', 'Data restored ✓');
      } catch (err) {
        console.warn(err);
        showDataMsg('err', err instanceof Error ? err.message : 'Could not restore file.');
      }
    };
    reader.onerror = () => showDataMsg('err', 'Could not read file.');
    reader.readAsText(f);
  }

  function clearAll() {
    if (!confirm('Clear ALL data (profile, weights, calories, foods)? This cannot be undone — consider downloading a backup first.')) return;
    if (!confirm('Are you really sure? This is permanent.')) return;
    resetData();
    showDataMsg('ok', 'All data cleared.');
  }

  const currentPlan = WEIGHT_PLANS[s.planType];
  const currentLevel = currentPlan?.levels[s.planLevel];

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
          {birthdate && calcAge(birthdate) != null && (calcAge(birthdate) as number) < 18 && (
            <div style={{ marginTop: 6, fontSize: '.78rem', color: 'var(--text3)', lineHeight: 1.5 }}>
              ⚠ Slender is designed for adults 18 and over. Calorie and BMR estimates
              may not be accurate for your age.
            </div>
          )}
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
            {lw && <StatBox value={lw.weight} label="kg" />}
          </div>
          <small>Mifflin–St Jeor formula · validated for adults 18+ · uses your latest logged weight</small>
        </Card>
      )}

      {/* ── Body fat % (US Army single-site estimate) ── */}
      {(() => {
        if (!lw || !lw.abdomen || !gender) return null;
        const bf = calcBodyFat(lw.weight, lw.abdomen, gender);
        if (bf == null) return null;
        return (
          <Card title="Body Fat (Estimate)">
            <div className="stat-row">
              <StatBox value={`${bf}%`} label="Body fat" />
              <StatBox value={`${lw.abdomen} cm`} label="Abdomen" />
              <StatBox value={`${lw.weight} kg`} label="Weight" />
            </div>
            <small>
              U.S. Army single-site tape estimate · log your relaxed abdomen circumference
              (at the navel) on the Log tab.
            </small>
          </Card>
        );
      })()}

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
        <div style={{ fontSize: '.78rem', color: 'var(--text3)', marginTop: 10, lineHeight: 1.5 }}>
          Exercise and daily movement outside of work — set your job separately below.
        </div>
      </Card>

      {/* ── Occupation ── */}
      <Card title="Work / Job">
        <div style={{ fontSize: '.8rem', color: 'var(--text3)', marginBottom: 10, lineHeight: 1.5 }}>
          Calories burned on the job, added on top of your activity level.
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

        {occAddsKcal ? (
          <>
            <div className="form-row" style={{ marginTop: 14 }}>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label className="form-label" htmlFor="p-workhpd">Hours per day</label>
                <input
                  id="p-workhpd" className="form-input" type="number"
                  min={0} max={24} step={0.5} inputMode="decimal"
                  value={hoursPerDayInput}
                  onChange={(e) => handleHoursPerDay(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label className="form-label" htmlFor="p-workdpw">Days per week</label>
                <input
                  id="p-workdpw" className="form-input" type="number"
                  min={0} max={7} step={1} inputMode="numeric"
                  value={daysPerWeekInput}
                  onChange={(e) => handleDaysPerWeek(e.target.value)}
                />
              </div>
            </div>
            <div style={{ fontSize: '.9rem', fontWeight: 600, color: 'var(--text2)' }}>
              {lw
                ? `${weeklyHours} h/week · +${occKcal} kcal/day from work`
                : `${weeklyHours} h/week · log a weight to estimate work calories.`}
            </div>
            <div style={{ fontSize: '.78rem', color: 'var(--text3)', marginTop: 4, lineHeight: 1.5 }}>
              Averaged across the week, so the daily budget stays the same every day.
            </div>
          </>
        ) : (
          <div style={{ fontSize: '.8rem', color: 'var(--text3)', marginTop: 12, lineHeight: 1.5 }}>
            A desk job is the baseline — it's already included in your activity level, so it adds no extra calories.
          </div>
        )}
      </Card>

      {/* ── TDEE ── */}
      {tdee != null && (
        <Card title="Total Daily Energy Expenditure">
          <div className="stat-row">
            <StatBox value={tdee} label="kcal / day" />
          </div>
          <small>
            {getActivity(s.activityId).label}
            {occKcal > 0 ? ` · +${occKcal} kcal work` : ''} — calories to maintain current weight
          </small>
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
                  An Extreme calorie change (≥1000 kcal/day delta) carries real health risks
                  and is rarely sustainable. Consult a healthcare professional before
                  pursuing this level.
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

      {/* ── Data management ── */}
      <Card title="Data">
        <div style={{ fontSize: '.85rem', color: 'var(--text2)', marginBottom: 12, lineHeight: 1.5 }}>
          Slender stores everything locally in your browser. Back up to a JSON file
          before clearing or switching devices.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn btn-ghost btn-full" onClick={downloadBackup}>
            Download backup (.json)
          </button>
          <button className="btn btn-ghost btn-full" onClick={pickRestore}>
            Restore from backup…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={handleRestore}
          />
          <button className="btn btn-danger btn-full" onClick={clearAll}>
            Clear all data
          </button>
        </div>
        {dataMsg && (
          <div
            style={{
              marginTop: 10, fontSize: '.82rem',
              color: dataMsg.kind === 'ok' ? 'var(--text2)' : 'var(--text)',
            }}
          >
            {dataMsg.text}
          </div>
        )}
      </Card>
    </div>
  );
}
