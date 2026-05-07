import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Card from '../ui/Card';
import DateNavigator from '../ui/DateNavigator';
import EmptyState from '../ui/EmptyState';
import { getWeightForDate, getCaloriesForDate, sumCalories, deriveTargetRange } from '../../utils/calculations';
import { fmtTime } from '../../utils/dates';

interface Props {
  logDate:        string;
  setLogDate:     (d: string) => void;
  onOpenCalModal: (editId?: string | null, date?: string) => void;
}

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
);

export default function Log({ logDate, setLogDate, onOpenCalModal }: Props) {
  const { data, upsertWeight, deleteWeight, deleteCalEntry } = useApp();

  const [editingWeight, setEditingWeight] = useState(false);
  const [weightInput,   setWeightInput]   = useState('');

  const existing  = getWeightForDate(data.weightLog, logDate);
  const showForm  = editingWeight || !existing;

  const entries = getCaloriesForDate(data.calLog, logDate)
    .slice().sort((a, b) => a.datetime.localeCompare(b.datetime));
  const total   = sumCalories(entries);

  const range      = deriveTargetRange(data);
  const isMaintain = data.settings.planType === 'maintain';
  const rangeLabel = range
    ? isMaintain
      ? `${range.max} kcal target`
      : `${range.min}–${range.max} kcal window`
    : null;

  function handleWeightSave() {
    const val = parseFloat(weightInput);
    if (!val || val < 10 || val > 500) return;
    upsertWeight({ date: logDate, weight: val });
    setWeightInput('');
    setEditingWeight(false);
  }

  function handleWeightDelete() {
    if (!confirm('Remove weight entry for this day?')) return;
    deleteWeight(logDate);
    setEditingWeight(false);
  }

  function handleDateChange(d: string) {
    setLogDate(d);
    setEditingWeight(false);
    setWeightInput('');
  }

  function handleDeleteCal(id: string) {
    if (!confirm('Delete this entry?')) return;
    deleteCalEntry(id);
  }

  return (
    <div className="section">
      <DateNavigator date={logDate} onChange={handleDateChange} />

      {/* ── Weight ── */}
      <Card title="Weight">
        {existing && !showForm ? (
          <div className="list-item" style={{ paddingTop: 0 }}>
            <div className="list-item-body">
              <div className="list-item-title">{existing.weight} kg</div>
            </div>
            <div className="list-item-right">
              <button className="btn-icon" aria-label="Edit weight"
                onClick={() => { setWeightInput(String(existing.weight)); setEditingWeight(true); }}>
                <EditIcon />
              </button>
              <button className="btn-icon" aria-label="Delete weight" onClick={handleWeightDelete}>
                <TrashIcon />
              </button>
            </div>
          </div>
        ) : (
          <div className="form-row" style={{ alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <input
                className="form-input"
                type="number"
                placeholder="e.g. 82.5"
                step={0.1} min={20} max={500}
                inputMode="decimal"
                value={weightInput}
                autoFocus={editingWeight}
                onChange={(e) => setWeightInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleWeightSave(); }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn btn-primary btn-sm" onClick={handleWeightSave}>Save kg</button>
              {editingWeight && (
                <button className="btn btn-ghost btn-sm"
                  onClick={() => { setEditingWeight(false); setWeightInput(''); }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ── Calorie log ── */}
      <Card>
        <div className="section-header">
          <div>
            <div className="card-title" style={{ marginBottom: 0 }}>Food &amp; Calories</div>
            <div style={{ fontSize: '.82rem', color: 'var(--text3)', marginTop: 2 }}>
              {entries.length > 0
                ? `${total} kcal${rangeLabel ? ` · ${rangeLabel}` : ''}`
                : 'No entries yet'}
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => onOpenCalModal(null, logDate)}>
            + Add
          </button>
        </div>

        {entries.length === 0 ? (
          <EmptyState message="No entries for this day" />
        ) : (
          entries.map((e) => (
            <div key={e.id} className="list-item">
              <div className="list-item-body">
                <div className="list-item-title">{e.desc}</div>
                <div className="list-item-sub">{fmtTime(e.datetime)}</div>
              </div>
              <div className="list-item-right">
                <div className="list-item-val">{e.kcal}</div>
                <small style={{ color: 'var(--text3)' }}>kcal</small>
                <button className="btn-icon" aria-label="Edit" onClick={() => onOpenCalModal(e.id)}>
                  <EditIcon />
                </button>
                <button className="btn-icon" aria-label="Delete" onClick={() => handleDeleteCal(e.id)}>
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
