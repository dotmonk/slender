interface Props {
  value:  number; // consumed
  max:    number; // target
}

export default function ProgressBar({ value, max }: Props) {
  const pct  = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const over = max > 0 && value > max;

  return (
    <div className="progress-wrap">
      <div
        className={`progress-bar${over ? ' over' : ''}`}
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemax={max}
      />
    </div>
  );
}
