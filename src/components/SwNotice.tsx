import { useEffect, useSyncExternalStore } from 'react';
import { getOfflineReady, setOfflineReady, subscribeSw } from '../lib/swStatus';
import Button from './Button';
import Notice from './Notice';
import './SwNotice.css';

/** One-time "ready offline" message after the first install of the service worker. */
export default function SwNotice() {
  const ready = useSyncExternalStore(subscribeSw, getOfflineReady, () => false);
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setOfflineReady(false), 8000);
    return () => window.clearTimeout(t);
  }, [ready]);
  return (
    <div className="swnotice" role="status" aria-live="polite">
      {ready ? (
        <Notice
          tone="success"
          live={false}
          action={<Button variant="icon" icon="x" aria-label="Cerrar aviso" onClick={() => setOfflineReady(false)} />}
        >
          Lista para usar sin conexión.
        </Notice>
      ) : null}
    </div>
  );
}
