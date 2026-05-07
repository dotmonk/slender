import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';

interface Props {
  onOpenFoodModal: (editId?: string | null) => void;
}

export default function Foods({ onOpenFoodModal }: Props) {
  const { data, deleteFood } = useApp();
  const [search, setSearch] = useState('');

  const query = search.toLowerCase();
  const items = data.foodList
    .filter((f) => !query || f.desc.toLowerCase().includes(query))
    .sort((a, b) => a.desc.localeCompare(b.desc));

  function handleDelete(id: string) {
    if (!confirm('Remove this food from your library?')) return;
    deleteFood(id);
  }

  return (
    <div className="section">
      <div className="section-header">
        <h2>Food Library</h2>
        <button className="btn btn-primary btn-sm" onClick={() => onOpenFoodModal(null)}>
          + New
        </button>
      </div>

      <input
        className="form-input"
        type="search"
        placeholder="Search foods…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      <Card>
        {items.length === 0 ? (
          <EmptyState message={query ? 'No foods match your search' : 'No foods saved yet'} />
        ) : (
          items.map((f) => (
            <div key={f.id} className="list-item">
              <div className="list-item-body">
                <div className="list-item-title">{f.desc}</div>
                <div className="list-item-sub">{f.kcal} kcal</div>
              </div>
              <div className="list-item-right">
                <button className="btn-icon" aria-label="Edit" onClick={() => onOpenFoodModal(f.id)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button className="btn-icon" aria-label="Delete" onClick={() => handleDelete(f.id)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3,6 5,6 21,6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
