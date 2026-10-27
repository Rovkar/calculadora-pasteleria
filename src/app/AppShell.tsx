import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import Icon, { type IconName } from '../components/Icon';
import { hrefFor, type Route } from './useHashRoute';
import './AppShell.css';

interface NavItem {
  route: Route;
  icon: IconName;
  /** Full label for the desktop tabs */
  label: string;
  /** Short label for the phone bottom bar */
  short: string;
}

const NAV: NavItem[] = [
  { route: 'calcular', icon: 'calc', label: 'Calcular', short: 'Calcular' },
  { route: 'productos', icon: 'list', label: 'Mis productos', short: 'Productos' },
  { route: 'insumos', icon: 'box', label: 'Insumos', short: 'Insumos' },
  { route: 'rapido', icon: 'bolt', label: 'Cálculo rápido', short: 'Rápido' },
  { route: 'ajustes', icon: 'gear', label: 'Ajustes', short: 'Ajustes' },
];

export interface AppShellProps {
  route: Route;
  children: ReactNode;
}

export default function AppShell({ route, children }: AppShellProps) {
  const mainRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const first = useRef(true);

  // Publish the real height of the sticky header (it changes when the tabs wrap or with the safe-area inset) so the
  // sticky results panel, scroll-padding and scroll-margin can clear it.
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const root = document.documentElement;
    const apply = () => root.style.setProperty('--header-h', `${Math.ceil(el.getBoundingClientRect().height)}px`);
    apply();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // On every route change: update the tab title, scroll to top and move focus to the content.
  useEffect(() => {
    const item = NAV.find((n) => n.route === route)!;
    document.title = `${item.label} · Calculadora de precios`;
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [route]);

  return (
    <div className="shell">
      <a className="shell__skip" href="#contenido" onClick={(e) => {
        e.preventDefault();
        mainRef.current?.focus();
      }}>
        Saltar al contenido
      </a>

      <header className="shell__header" ref={headerRef}>
        <div className="shell__header-inner">
          <a className="shell__brand" href={hrefFor('calcular')}>
            <Icon name="cake" size={30} />
            <span className="shell__brand-text">
              <span className="shell__brand-name">Calculadora de precios</span>
              <span className="shell__brand-tag">Pasteles y postres</span>
            </span>
          </a>
          <nav className="shell__tabs" aria-label="Secciones">
            {NAV.map((n) => (
              <a
                key={n.route}
                href={hrefFor(n.route)}
                className="shell__tab"
                aria-current={n.route === route ? 'page' : undefined}
              >
                {n.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main id="contenido" className="shell__main" ref={mainRef} tabIndex={-1}>
        <div className="shell__content">{children}</div>
      </main>

      <nav className="shell__bottom" aria-label="Secciones principales">
        {NAV.map((n) => (
          <a
            key={n.route}
            href={hrefFor(n.route)}
            className="shell__bottom-item"
            aria-current={n.route === route ? 'page' : undefined}
          >
            <Icon name={n.icon} size={24} />
            <span>{n.short}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
