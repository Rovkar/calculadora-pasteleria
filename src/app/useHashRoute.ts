import { useCallback, useSyncExternalStore } from 'react';

export type Route = 'calcular' | 'productos' | 'insumos' | 'rapido' | 'ajustes';

export const ROUTES: Route[] = ['calcular', 'productos', 'insumos', 'rapido', 'ajustes'];
export const DEFAULT_ROUTE: Route = 'calcular';

export function parseHash(hash: string): Route {
  const name = hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  return (ROUTES as string[]).includes(name) ? (name as Route) : DEFAULT_ROUTE;
}

/** href for <a> links, e.g. hrefFor('productos') -> "#/productos" */
export function hrefFor(route: Route): string {
  return `#/${route}`;
}

export function navigate(route: Route): void {
  if (typeof window === 'undefined') return;
  const next = hrefFor(route);
  if (window.location.hash !== next) window.location.hash = next;
}

function subscribe(cb: () => void): () => void {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

function getSnapshot(): Route {
  return parseHash(window.location.hash);
}

/** Current route from the URL hash (#/calcular, #/productos...). Unknown hashes fall back to 'calcular'. */
export default function useHashRoute(): { route: Route; navigate: (route: Route) => void } {
  const route = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_ROUTE);
  const go = useCallback((r: Route) => navigate(r), []);
  return { route, navigate: go };
}
