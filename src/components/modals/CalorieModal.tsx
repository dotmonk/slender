import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { CalModalState } from '../../types';
import { nowTimeStr, fmtDate } from '../../utils/dates';

interface Props {
  state:   CalModalState;
  onClose: () => void;
}

export default function CalorieModal({ state, onClose }: Props) {
  const { data, addCalEntry, updateCalEntry } = useApp();
  const { open, editId, prefillDate } = state;

  const [desc,        setDesc]        = useState('');
  const [kcal,        setKcal]        = useState('');
  const [date,        setDate]        = useState(prefillDate);
  const [time,        setTime]        = useState(nowTimeStr());
  const [pickerOpen,  setPickerOpen]  = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');

  const descRef = useRef<HTMLInputElement>(null);

  // Populate form when modal opens
  useEffect(() => {
    if (!open) return;
    setPickerOpen(false);
    setPickerQuery('');
    if (editId) {
      const entry = data.calLog.find((e) => e.id === editId);
      if (entry) {
        setDesc(entry.desc);
        setKcal(String(entry.kcal));
        const dt = new Date(entry.datetime);
        setDate(fmtDate(dt));
        setTime(`${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`);
      }
    } else {
      setDesc(''); setKcal(''); setDate(prefillDate); setTime(nowTimeStr());
    }
    setTimeout(() => descRef.current?.focus(), 300);
  }, [open, editId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    const trimDesc = desc.trim();
    const numKcal  = parseInt(kcal);
    if (!trimDesc) { descRef.current?.focus(); return; }
    if (isNaN(numKcal)) { return; }
    const datetime = new Date(`${date}T${time}:00`).toISOString();
    if (editId) {
      updateCalEntry({ id: editId, datetime, desc: trimDesc, kcal: numKcal });
    } else {
      addCalEntry({ datetime, desc: trimDesc, kcal: numKcal });
    }
    onClose();
  }

  function pickFood(id: string) {
    const food = data.foodList.find((f) => f.id === id);
    if (!food) return;
    setDesc(food.desc);
    setKcal(String(food.kcal));
    setPickerOpen(false);
  }

  const filteredFoods = data.foodList
    .filter((f) => !pickerQuery || f.desc.toLowerCase().includes(pickerQuery.toLowerCase()))
    .sort((a, b) => a.desc.localeCompare(b.desc));

  if (!open) return null;

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{editId ? 'Edit Entry' : 'Add Entry'}</div>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="cal-desc">Description</label>
          <input
            id="cal-desc" ref={descRef} className="form-input" type="text"
            placeholder="e.g. Oatmeal with berries"
            value={desc} onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="cal-kcal">Calories (kcal)</label>
          <input
            id="cal-kcal" className="form-input" type="number"
            placeholder="e.g. 350" min={0} inputMode="numeric"
            value={kcal} onChange={(e) => setKcal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="cal-date">Date</label>
            <input id="cal-date" className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cal-time">Time</label>
            <input id="cal-time" className="form-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        {/* Food library picker */}
        <button
          className="btn btn-ghost btn-full"
          style={{ marginBottom: 12 }}
          onClick={() => setPickerOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          Pick from Food Library
        </button>

        {pickerOpen && (
          <div>
            <input
              className="form-input" type="search" placeholder="Search library…"
              autoFocus
              value={pickerQuery} onChange={(e) => setPickerQuery(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <div className="food-picker-list">
              {filteredFoods.length === 0 ? (
                <p style={{ color: 'var(--text3)', fontSize: '.85rem', padding: '10px 0' }}>
                  {pickerQuery ? 'No matches' : 'Your food library is empty — add items in the Foods tab.'}
                </p>
              ) : (
                filteredFoods.map((f) => (
                  <div key={f.id} className="food-pick-item" onClick={() => pickFood(f.id)}>
                    <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{f.desc}</div>
                    <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{f.kcal} kcal</div>
                  </div>
                ))
              )}
            </div>
            <hr className="divider" />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>Save Entry</button>
        </div>
      </div>
    </div>
  );
}
