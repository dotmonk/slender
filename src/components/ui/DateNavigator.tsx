import { todayStr, addDays, displayDate } from '../../utils/dates';

interface Props {
  date:      string;
  onChange:  (date: string) => void;
}

export default function DateNavigator({ date, onChange }: Props) {
  const isToday = date >= todayStr();

  return (
    <div className="date-nav">
      <button
        className="btn-icon"
        aria-label="Previous day"
        onClick={() => onChange(addDays(date, -1))}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15,18 9,12 15,6"/>
        </svg>
      </button>

      <div className="date-nav-label">{displayDate(date)}</div>

      <button
        className="btn-icon"
        aria-label="Next day"
        disabled={isToday}
        style={{ opacity: isToday ? .3 : 1 }}
        onClick={() => { if (!isToday) onChange(addDays(date, 1)); }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
      </button>
    </div>
  );
}
