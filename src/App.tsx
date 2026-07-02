import { useEffect, useState } from 'react';
import { useApp } from './context/AppContext';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Home from './components/sections/Home';
import Log from './components/sections/Log';
import Foods from './components/sections/Foods';
import Charts from './components/sections/Charts';
import Profile from './components/sections/Profile';
import CalorieModal from './components/modals/CalorieModal';
import FoodModal from './components/modals/FoodModal';
import DisclaimerModal from './components/modals/DisclaimerModal';
import type { CalModalState, FoodModalState, Section } from './types';
import { todayStr } from './utils/dates';

const DISCLAIMER_KEY = 'slender_disclaimer_accepted';

export default function App() {
  const { data } = useApp();
  const [section, setSection]   = useState<Section>('home');
  const [logDate, setLogDate]   = useState(todayStr());
  const [chartDays, setChartDays] = useState<7 | 30 | 90 | 'all'>('all');
  const [showDisclaimer, setShowDisclaimer] = useState(
    () => localStorage.getItem(DISCLAIMER_KEY) !== 'true',
  );

  const [calModal, setCalModal] = useState<CalModalState>({
    open: false, editId: null, prefillDate: todayStr(),
  });
  const [foodModal, setFoodModal] = useState<FoodModalState>({
    open: false, editId: null,
  });

  function acceptDisclaimer() {
    localStorage.setItem(DISCLAIMER_KEY, 'true');
    setShowDisclaimer(false);
  }

  // Apply + persist theme on data change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', data.settings.theme);
    const meta = document.getElementById('themeColorMeta');
    if (meta) meta.setAttribute('content', data.settings.theme === 'dark' ? '#0a0a0a' : '#ffffff');
  }, [data.settings.theme]);

  // ── Modal openers ───────────────────────────────────────────────────────────
  function openCalModal(editId: string | null = null, date?: string) {
    setCalModal({ open: true, editId, prefillDate: date ?? logDate });
  }
  function closeCalModal() { setCalModal((s) => ({ ...s, open: false })); }

  function openFoodModal(editId: string | null = null) {
    setFoodModal({ open: true, editId });
  }
  function closeFoodModal() { setFoodModal((s) => ({ ...s, open: false })); }

  // ── Section renderer ────────────────────────────────────────────────────────
  function renderSection() {
    switch (section) {
      case 'home':    return <Home onNavigate={setSection} onOpenCalModal={() => openCalModal(null, todayStr())} />;
      case 'log':     return <Log logDate={logDate} setLogDate={setLogDate} onOpenCalModal={openCalModal} />;
      case 'foods':   return <Foods onOpenFoodModal={openFoodModal} />;
      case 'charts':  return <Charts chartDays={chartDays} setChartDays={setChartDays} />;
      case 'profile': return <Profile />;
    }
  }

  return (
    <div className="app-root">
      <Header onNavigateHome={() => setSection('home')} />
      <main className="main-content">
        {renderSection()}
      </main>
      <BottomNav current={section} onNavigate={setSection} />

      {showDisclaimer && <DisclaimerModal onAccept={acceptDisclaimer} />}
      <CalorieModal
        state={calModal}
        onClose={closeCalModal}
      />
      <FoodModal
        state={foodModal}
        onClose={closeFoodModal}
      />
    </div>
  );
}
