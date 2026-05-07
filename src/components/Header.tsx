import { useApp } from '../context/AppContext';

export default function Header() {
  const { data, updateSettings } = useApp();
  const isDark = data.settings.theme === 'dark';

  function toggleTheme() {
    updateSettings({ theme: isDark ? 'light' : 'dark' });
  }

  return (
    <header className="app-header">
      <h1>Slender</h1>
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
