import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Button from '../../components/Button';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import Select from '../../components/Select';
import TextField from '../../components/TextField';
import NumberField from '../../components/NumberField';
import Icon from '../../components/Icon';
import { hrefFor } from '../../app/useHashRoute';
import { formatMoney, normalizeText } from '../../lib/format';
import { insumoUnitCosts } from '../../lib/pricing';
import { UNITS, type Unit } from '../../lib/units';
import { useActions, useStore } from '../../store/store';
import type { Insumo } from '../../store/types';
import './InsumosScreen.css';

const UNIT_OPTIONS = UNITS.map((u) => ({ value: u.value, label: u.label }));

function unitCostTexts(insumo: Insumo, moneda: string) {
  const c = insumoUnitCosts(insumo);
  const unit =
    c.perBase === null ? null : `${formatMoney(c.perBase, moneda, c.baseUnit === 'pza' ? 2 : 3)} / ${c.baseUnit}`;
  const kg = c.perKgL === null || !c.kgLUnit ? null : `${formatMoney(c.perKgL, moneda, 2)} / ${c.kgLUnit}`;
  return { unit, kg };
}

function InsumoRow({
  insumo,
  moneda,
  nameRef,
}: {
  insumo: Insumo;
  moneda: string;
  nameRef: (el: HTMLInputElement | null) => void;
}) {
  const { updateInsumo, removeInsumo } = useActions();
  const label = insumo.name.trim() || 'insumo sin nombre';
  const costs = unitCostTexts(insumo, moneda);
  // Same visible label in every row, but unique for screen readers.
  const of = <span className="visually-hidden"> de {label}</span>;
  const onRemove = () => {
    if (window.confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) removeInsumo(insumo.id);
  };
  return (
    <li className="insumo-row">
      <TextField
        className="insumo-row__name"
        label="Nombre del insumo"
        placeholder="Nombre"
        value={insumo.name}
        onChange={(v) => updateInsumo(insumo.id, { name: v })}
        inputRef={nameRef}
      />
      <NumberField
        className="insumo-row__pack"
        label={<>Presentación{of}</>}
        placeholder="0"
        value={insumo.pack}
        onChange={(v) => updateInsumo(insumo.id, { pack: v })}
      />
      <Select<Unit>
        className="insumo-row__unit"
        label={<>Unidad{of}</>}
        value={insumo.unit}
        options={UNIT_OPTIONS}
        onChange={(v) => updateInsumo(insumo.id, { unit: v })}
      />
      <NumberField
        className="insumo-row__price"
        label={<>Precio de compra{of}</>}
        placeholder="0.00"
        prefix={moneda}
        value={insumo.price}
        onChange={(v) => updateInsumo(insumo.id, { price: v })}
      />
      <div className="insumo-row__cost">
        <span className="insumo-row__cost-label">Costo por unidad</span>
        <span className={costs.unit ? 'num' : 'num insumo-row__none'}>{costs.unit ?? '—'}</span>
      </div>
      <div className="insumo-row__cost insumo-row__cost--kg">
        <span className="insumo-row__cost-label">Costo por kg / l</span>
        <span className={costs.kg ? 'num' : 'num insumo-row__none'}>{costs.kg ?? '—'}</span>
      </div>
      <Button
        className="insumo-row__remove"
        variant="icon"
        icon="trash"
        aria-label={`Eliminar ${label}`}
        onClick={onRemove}
      />
    </li>
  );
}

export default function InsumosScreen() {
  const insumos = useStore((s) => s.insumos);
  const moneda = useStore((s) => s.settings.moneda);
  const { addInsumo } = useActions();
  const [query, setQuery] = useState('');
  const searchId = useId();
  const nameRefs = useRef(new Map<string, HTMLInputElement>());
  const [focusId, setFocusId] = useState<string | null>(null);

  const q = normalizeText(query.trim());
  const visible = useMemo(
    () => (q ? insumos.filter((i) => normalizeText(i.name).includes(q)) : insumos),
    [insumos, q],
  );

  useEffect(() => {
    if (!focusId) return;
    const el = nameRefs.current.get(focusId);
    if (el) {
      el.focus();
      el.scrollIntoView({ block: 'center' });
      setFocusId(null);
    }
  }, [focusId, visible]);

  const total = insumos.length;
  const noun = total === 1 ? 'insumo' : 'insumos';
  const countText = q ? `${visible.length} de ${total} ${noun}` : `${total} ${noun}`;

  const onAdd = () => {
    setQuery('');
    setFocusId(addInsumo());
  };

  return (
    <div className="insumos">
      <div className="insumos__intro">
        <div className="insumos__eyebrow">Insumos</div>
        <h1>Lista de insumos</h1>
        <p>
          Tu lista de precios de referencia: registra lo que pagas por cada ingrediente, en g, kg, ml, l, galones o piezas.
          El costo por gramo, mililitro o pieza se calcula solo, para que compares y revises tus precios.
        </p>
      </div>

      <div className="insumos__toolbar">
        <div className="insumos__search">
          <label htmlFor={searchId} className="insumos__search-label">
            Buscar insumo
          </label>
          <div className="insumos__search-box">
            <Icon name="search" size={20} className="insumos__search-icon" />
            <input
              id={searchId}
              type="search"
              autoComplete="off"
              placeholder="Ej. harina"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="insumos__actions">
          <span className="insumos__count" aria-live="polite">
            {countText}
          </span>
          <Button variant="primary" icon="plus" onClick={onAdd}>
            Agregar insumo
          </Button>
        </div>
      </div>

      <div className="insumos__table">
        <div className="insumo-head" aria-hidden="true">
          <div>Insumo</div>
          <div>Presentación</div>
          <div>Unidad</div>
          <div>Precio de compra</div>
          <div className="insumo-head__right">Costo por unidad</div>
          <div className="insumo-head__right">Costo por kg / l</div>
          <div />
        </div>
        {visible.length > 0 ? (
          <ul className="insumos__list">
            {visible.map((i) => (
              <InsumoRow
                key={i.id}
                insumo={i}
                moneda={moneda}
                nameRef={(el) => {
                  if (el) nameRefs.current.set(i.id, el);
                  else nameRefs.current.delete(i.id);
                }}
              />
            ))}
          </ul>
        ) : total === 0 ? (
          <EmptyState
            icon="list"
            title="Tu lista está vacía"
            action={
              <Button variant="primary" icon="plus" onClick={onAdd}>
                Agregar insumo
              </Button>
            }
          >
            Agrega tu primer insumo.
          </EmptyState>
        ) : (
          <p className="insumos__none">No hay insumos que coincidan con «{query.trim()}».</p>
        )}
      </div>

      <div className="insumos__info">
        <Card title="Cómo se usa" headingLevel={2}>
          <p>
            Anota la presentación tal como la compras (por ejemplo, 1 kg de harina por $32 o 1 galón de leche por $106).
            Esta lista es de consulta: en la calculadora cada ingrediente lleva su propia presentación y precio, así que ahí
            escribes los mismos datos y cuánto usaste.
          </p>
        </Card>
        <Card title="Mantén tus precios al día" headingLevel={2}>
          <p>
            Cuando cambie el precio de un insumo, actualízalo aquí y también en los ingredientes de tus productos para no
            perder ganancia. Los productos no se actualizan solos al cambiar esta lista.
          </p>
          <a className="insumos__link" href={hrefFor('calcular')}>
            Ir a la calculadora
          </a>
        </Card>
      </div>
    </div>
  );
}
