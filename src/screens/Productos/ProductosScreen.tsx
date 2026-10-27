import { useEffect, useMemo, useState } from 'react';
import { useStore, useActions } from '../../store/store';
import { confirmDiscardDraft } from '../../store/draftGuard';
import { navigate } from '../../app/useHashRoute';
import { normalizeText, formatNum } from '../../lib/format';
import Button from '../../components/Button';
import Notice from '../../components/Notice';
import PersistWarning from '../../components/PersistWarning';
import EmptyState from '../../components/EmptyState';
import TextField from '../../components/TextField';
import Icon from '../../components/Icon';
import PriceSettings from './PriceSettings';
import ProductCard from './ProductCard';
import './ProductosScreen.css';

const LEGEND = [
  { key: 'mp', label: 'Materia prima', color: 'var(--c-mp)', border: 'var(--c-mp)' },
  { key: 'mo', label: 'Mano de obra', color: 'var(--c-mo)', border: 'var(--c-mo)' },
  { key: 'gi', label: 'Gas, luz y agua', color: 'var(--c-gi)', border: 'var(--c-gi-border)' },
  { key: 'ganancia', label: 'Ganancia', color: 'var(--c-ganancia)', border: 'var(--c-ganancia)' },
];

export default function ProductosScreen() {
  const products = useStore((s) => s.products);
  const settings = useStore((s) => s.settings);
  const lastSavedId = useStore((s) => s.lastSavedId);
  const { resetDraft, clearLastSaved } = useActions();
  const [query, setQuery] = useState('');

  const count = products.length;
  const countText = count === 1 ? '1 producto' : `${formatNum(count)} productos`;
  const showSearch = count > 3;
  const q = normalizeText(query.trim());
  const filtered = useMemo(
    () => (showSearch && q ? products.filter((p) => normalizeText(p.name).includes(q)) : products),
    [products, q, showSearch],
  );
  const saved = lastSavedId ? products.find((p) => p.id === lastSavedId) : undefined;

  // The banner mounts together with the screen, which screen readers do not announce: say it from a live region
  // that is already in the tree.
  const [announce, setAnnounce] = useState('');
  const savedName = saved?.name;
  useEffect(() => {
    if (!savedName) return;
    const t = window.setTimeout(() => setAnnounce(`Guardado: ${savedName}.`), 150);
    return () => window.clearTimeout(t);
  }, [savedName]);

  const newProduct = () => {
    if (!confirmDiscardDraft()) return;
    resetDraft();
    clearLastSaved();
    navigate('calcular');
  };

  return (
    <div className="productos">
      <div className="productos__intro">
        <span className="productos__eyebrow">Mis productos</span>
        <div className="productos__titlerow">
          <h1 className="productos__title">Mis productos</h1>
          <span className="productos__chip">{countText}</span>
        </div>
        <p className="productos__helper">
          Tus productos guardados. Si cambias tu tarifa, tus servicios o tu ganancia, todos los precios se actualizan a la vez.
        </p>
      </div>

      <div className="visually-hidden" role="status" aria-live="polite">
        {announce}
      </div>

      <PersistWarning />

      {saved ? (
        <Notice
          tone="success"
          live={false}
          action={
            <div className="productos__noticeactions">
              <Button onClick={() => navigate('calcular')}>Seguir calculando</Button>
              <Button variant="icon" icon="x" aria-label="Cerrar aviso" onClick={clearLastSaved} />
            </div>
          }
        >
          <strong>Guardado: {saved.name}.</strong>
        </Notice>
      ) : null}

      <PriceSettings />

      {showSearch ? (
        <div className="productos__search">
          <TextField label="Buscar producto" value={query} onChange={setQuery} placeholder="Nombre del producto" />
        </div>
      ) : null}

      {count === 0 ? (
        <EmptyState
          title="Todavía no tienes productos guardados."
          action={
            <Button variant="primary" size="lg" onClick={() => navigate('calcular')}>
              Ir a la calculadora
            </Button>
          }
        />
      ) : (
        <>
          {showSearch && q && filtered.length === 0 ? (
            <p className="productos__noresults" role="status" aria-live="polite">
              No encontramos productos que coincidan con «{query.trim()}».
            </p>
          ) : null}
          <div className="productos__grid">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} settings={settings} isSaved={p.id === lastSavedId} />
            ))}
            <button type="button" className="productos__add" onClick={newProduct}>
              <span className="productos__addicon">
                <Icon name="plus" size={22} />
              </span>
              <span className="productos__addtitle">Calcular un producto nuevo</span>
              <span className="productos__addtext">Abre la calculadora con tus ingredientes</span>
            </button>
          </div>
          <ul className="productos__legend">
            {LEGEND.map((l) => (
              <li key={l.key}>
                <span className="productos__swatch" aria-hidden="true" style={{ background: l.color, borderColor: l.border }} />
                {l.label}
              </li>
            ))}
            {settings.ivaOn ? (
              <li>
                <span className="productos__swatch" aria-hidden="true" style={{ background: 'var(--c-iva)', borderColor: 'var(--c-gi-border)' }} />
                IVA
              </li>
            ) : null}
          </ul>
        </>
      )}
    </div>
  );
}
