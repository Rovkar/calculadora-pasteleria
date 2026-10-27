import { useSyncExternalStore } from 'react';
import { getDeferredPrompt, isIOS, isStandalone, promptInstall, subscribe } from './installPrompt';

/** canInstall: the browser offered a native install prompt. showIOSHelp: iPhone/iPad, not yet installed. */
export function useInstallPrompt() {
  const prompt = useSyncExternalStore(subscribe, getDeferredPrompt, () => null);
  const standalone = isStandalone();
  return {
    canInstall: prompt !== null && !standalone,
    isStandalone: standalone,
    showIOSHelp: isIOS() && !standalone,
    install: promptInstall,
  };
}
