import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './context/AppContext';
import App from './App';
import './styles/global.css';

// Service-worker handling.
//   - In production: register sw.js for PWA / auto-update.
//   - In development: aggressively *unregister* any SW that may have been
//     installed by a previous prod build of this same origin, and wipe its
//     caches. Otherwise `npm run dev` keeps serving stale assets out of the
//     SW cache and you never see your code changes in Chrome.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
      .then((reg) => {
        // Check for a new SW when the user returns to the PWA.
        // If one is found, skipWaiting + clients.claim in sw.js activate it,
        // then controllerchange above reloads the page.
        const checkForUpdate = () => {
          if (document.visibilityState === 'visible') reg.update();
        };
        document.addEventListener('visibilitychange', checkForUpdate);
      })
      .catch((err) => console.warn('[SW] registration failed:', err));
  } else {
    // Dev mode — clean up any SW + cache leftover from a prod visit.
    navigator.serviceWorker.getRegistrations()
      .then((regs) => {
        if (regs.length === 0) return false;
        console.info('[SW] dev mode: unregistering', regs.length, 'service worker(s)');
        return Promise.all(regs.map((r) => r.unregister())).then(() => true);
      })
      .then((didUnregister) => {
        if ('caches' in window) {
          return caches.keys().then((keys) => {
            if (keys.length === 0) return didUnregister;
            console.info('[SW] dev mode: clearing caches', keys);
            return Promise.all(keys.map((k) => caches.delete(k))).then(() => true);
          });
        }
        return didUnregister;
      })
      .then((didCleanup) => {
        // If we tore something down, force a reload so the page is no longer
        // controlled by the now-unregistered worker.
        if (didCleanup && navigator.serviceWorker.controller) {
          window.location.reload();
        }
      })
      .catch((err) => console.warn('[SW] dev cleanup failed:', err));
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
