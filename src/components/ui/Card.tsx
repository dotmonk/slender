import type { ReactNode } from 'react';

interface Props {
  title?:    string;
  children:  ReactNode;
  className?: string;
  style?:    React.CSSProperties;
}

export default function Card({ title, children, className = '', style }: Props) {
  return (
    <div className={`card ${className}`} style={style}>
      {title && <div className="card-title">{title}</div>}
      {children}
    </div>
  );
}
