/** Tiny external store with the service worker status, so the UI can tell the user the app works offline. */
let offlineReady = false;
const listeners = new Set<() => void>();

export function setOfflineReady(v: boolean) {
  if (offlineReady === v) return;
  offlineReady = v;
  listeners.forEach((l) => l());
}

export function getOfflineReady() {
  return offlineReady;
}

export function subscribeSw(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
