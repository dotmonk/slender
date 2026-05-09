import { useApp } from '../context/AppContext';

interface Props {
  onNavigateHome: () => void;
}

/**
 * Inline mini-version of the Slender icon, drawn with `currentColor`
 * so it adapts to light/dark themes. Geometry mirrors public/icon.svg.
 */
function SlenderMark() {
  return (
    <svg
      className="header-mark"
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g fill="currentColor">
        <ellipse cx="256" cy="120" rx="32" ry="42"/>
        <rect x="248" y="158" width="16" height="14"/>
        <path d="M 220 170 L 292 170 L 302 230 L 294 320 L 218 320 L 210 230 Z"/>
        <rect x="220" y="320" width="28" height="138" rx="3"/>
        <rect x="264" y="320" width="28" height="138" rx="3"/>
        <rect x="180" y="200" width="16" height="220" rx="8"/>
        <rect x="316" y="200" width="16" height="220" rx="8"/>
      </g>
    </svg>
  );
}

export default function Header({ onNavigateHome }: Props) {
  const { data, updateSettings } = useApp();
  const isDark = data.settings.theme === 'dark';

  function toggleTheme() {
    updateSettings({ theme: isDark ? 'light' : 'dark' });
  }

  return (
    <header className="app-header">
      <button
        type="button"
        className="header-brand"
        onClick={onNavigateHome}
        aria-label="Go to Home"
      >
        <SlenderMark />
        <h1>Slender</h1>
      </button>
      <div className="header-right">
        <div
          className="theme-toggle"
          role="switch"
          aria-label="Toggle dark mode"
          aria-checked={isDark}
          tabIndex={0}
          onClick={toggleTheme}
          onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleTheme(); } }}
        />
      </div>
    </header>
  );
}
