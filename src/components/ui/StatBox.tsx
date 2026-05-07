interface Props {
  value: string | number;
  label: string;
}

export default function StatBox({ value, label }: Props) {
  return (
    <div className="stat-box">
      <div className="stat-val">{value}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}
