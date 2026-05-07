import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { FoodModalState } from '../../types';

interface Props {
  state:   FoodModalState;
  onClose: () => void;
}

export default function FoodModal({ state, onClose }: Props) {
  const { data, addFood, updateFood } = useApp();
  const { open, editId } = state;

  const [desc, setDesc] = useState('');
  const [kcal, setKcal] = useState('');

  const descRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editId) {
      const food = data.foodList.find((f) => f.id === editId);
      if (food) { setDesc(food.desc); setKcal(String(food.kcal)); }
    } else {
      setDesc(''); setKcal('');
    }
    setTimeout(() => descRef.current?.focus(), 300);
  }, [open, editId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    const trimDesc = desc.trim();
    const numKcal  = parseInt(kcal);
    if (!trimDesc) { descRef.current?.focus(); return; }
    if (isNaN(numKcal)) return;
    if (editId) {
      updateFood({ id: editId, desc: trimDesc, kcal: numKcal });
    } else {
      addFood({ desc: trimDesc, kcal: numKcal });
    }
    onClose();
  }

  if (!open) return null;

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{editId ? 'Edit Food' : 'Add Food'}</div>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="food-desc">Food Name</label>
          <input
            id="food-desc" ref={descRef} className="form-input" type="text"
            placeholder="e.g. Greek Yogurt 150g"
            value={desc} onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="food-kcal">Calories (kcal)</label>
          <input
            id="food-kcal" className="form-input" type="number"
            placeholder="e.g. 130" min={0} inputMode="numeric"
            value={kcal} onChange={(e) => setKcal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>Save Food</button>
        </div>
      </div>
    </div>
  );
}
