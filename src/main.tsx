import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/dm-sans';
import './styles/tokens.css';
import './styles/base.css';
import { registerSW } from 'virtual:pwa-register';
import { initInstallPrompt } from './lib/installPrompt';
import { setOfflineReady } from './lib/swStatus';
import { requestPersistOnce } from './store/store';
import App from './App';

// Must run before the browser fires 'beforeinstallprompt'.
initInstallPrompt();

// Ask the browser to keep our data when storage is under pressure.
requestPersistOnce();

// Service worker: autoUpdate mode applies new versions by itself (and reloads once); the first install tells the user
// the app now works offline.
registerSW({ immediate: true, onOfflineReady: () => setOfflineReady(true) });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
