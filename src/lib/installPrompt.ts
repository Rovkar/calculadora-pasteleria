/**
 * Captures the browser's "beforeinstallprompt" event as early as possible
 * (call initInstallPrompt() once from main.tsx) so a screen can offer an
 * "Instalar app" button later. iOS never fires it: use isIOS() to show the
 * manual "Compartir > Agregar a pantalla de inicio" instructions.
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let started = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function initInstallPrompt(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const ev = deferred;
  if (!ev) return 'unavailable';
  try {
    await ev.prompt();
    const choice = await ev.userChoice;
    deferred = null;
    notify();
    return choice.outcome;
  } catch {
    return 'unavailable';
  }
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    return !!nav.standalone || window.matchMedia?.('(display-mode: standalone)').matches === true;
  } catch {
    return false;
  }
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iPadOS = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadOS;
}
