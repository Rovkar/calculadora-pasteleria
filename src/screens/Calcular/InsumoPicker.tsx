import { useEffect, useMemo, useRef, useState } from 'react';
import { hrefFor } from '../../app/useHashRoute';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import Icon from '../../components/Icon';
import TextField from '../../components/TextField';
import { formatMoney, normalizeText, parseNum } from '../../lib/format';
import { insumoUnitCosts } from '../../lib/pricing';
import { UNIT_INFO } from '../../lib/units';
import { useActions, useStore } from '../../store/store';
import type { Insumo } from '../../store/types';
import './InsumoPicker.css';

export type PickerMode = { kind: 'add' } | { kind: 'replace'; rowId: string; rowLabel: string };

export interface PickerResult {
  /** Row ids created while the dialog was open (add mode), in order. */
  addedRowIds: string[];
  /** Row that was filled (replace mode). */
  filledRowId: string | null;
}

interface Props {
  mode: PickerMode | null;
  onClose: (result: PickerResult) => void;
}

function costText(insumo: Insumo, moneda: string): string {
  const c = insumoUnitCosts(insumo);
  if (c.perBase === null) return 'Sin costo por unidad';
  const base = `${formatMoney(c.perBase, moneda, c.baseUnit === 'pza' ? 2 : 3)} / ${c.baseUnit}`;
  return c.perKgL === null || !c.kgLUnit ? base : `${base} · ${formatMoney(c.perKgL, moneda, 2)} / ${c.kgLUnit}`;
}

/** Native modal <dialog> to choose ingredients from "Mis insumos". */
export default function InsumoPicker({ mode, onClose }: Props) {
  const insumos = useStore((s) => s.insumos);
  const rows = useStore((s) => s.draft.rows);
  const moneda = useStore((s) => s.settings.moneda);
  const { addRowsFromInsumos, fillRowFromInsumo } = useActions();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const downOnBackdrop = useRef(false);
  const session = useRef<PickerResult>({ addedRowIds: [], filledRowId: null });
  const [query, setQuery] = useState('');
  const [added, setAdded] = useState<string[]>([]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (mode && !d.open) {
      session.current = { addedRowIds: [], filledRowId: null };
      setQuery('');
      setAdded([]);
      d.showModal();
      searchRef.current?.focus();
    } else if (!mode && d.open) {
      d.close();
    }
  }, [mode]);

  const named = useMemo(() => insumos.filter((i) => i.name.trim() !== ''), [insumos]);
  const q = normalizeText(query);
  const visible = useMemo(() => (q ? named.filter((i) => normalizeText(i.name).includes(q)) : named), [named, q]);
  const inRecipe = useMemo(() => new Set(rows.map((r) => r.insumoId).filter(Boolean) as string[]), [rows]);

  const requestClose = () => dialogRef.current?.close();

  const handleClose = () => {
    const result = session.current;
    session.current = { addedRowIds: [], filledRowId: null };
    onClose(result);
  };

  const pick = (ins: Insumo) => {
    if (!mode) return;
    if (mode.kind === 'add') {
      const ids = addRowsFromInsumos([ins.id]);
      session.current.addedRowIds.push(...ids);
      setAdded((prev) => [...prev, ins.name.trim()]);
    } else {
      fillRowFromInsumo(mode.rowId, ins.id);
      session.current.filledRowId = mode.rowId;
      requestClose();
    }
  };

  const title = mode?.kind === 'replace' ? `Elegir para ${mode.rowLabel}` : 'Mis insumos';

  return (
    <dialog
      ref={dialogRef}
      className="picker"
      aria-labelledby="picker-title"
      onClose={handleClose}
      onMouseDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        // Only a press that started AND ended on the backdrop closes (dragging a text selection out of the search box does not).
        if (e.target === e.currentTarget && downOnBackdrop.current) requestClose();
        downOnBackdrop.current = false;
      }}
    >
      {mode ? (
        <div className="picker__panel">
          <div className="picker__head">
            <div className="picker__titlebar">
              <h2 id="picker-title" className="picker__title">
                {title}
              </h2>
              <Button variant="icon" icon="x" aria-label="Cerrar" onClick={requestClose} />
            </div>
            {named.length > 0 ? (
              <TextField label="Buscar insumo" value={query} onChange={setQuery} placeholder="Ej. harina" inputRef={searchRef} />
            ) : null}
          </div>

          <div className="picker__body">
            {named.length === 0 ? (
              <EmptyState
                icon="list"
                title="Tu lista de insumos está vacía."
                action={
                  <a className="btn btn--primary" href={hrefFor('insumos')} onClick={requestClose}>
                    Ir a Insumos
                  </a>
                }
              />
            ) : visible.length === 0 ? (
              <p className="picker__none">No hay insumos que coincidan con «{query.trim()}».</p>
            ) : (
              <ul className="picker__list">
                {visible.map((i) => {
                  const used = mode.kind === 'add' && inRecipe.has(i.id);
                  return (
                    <li key={i.id}>
                      <button type="button" className="picker__item" onClick={() => pick(i)}>
                        <span className="picker__itemtop">
                          <span className="picker__name">{i.name}</span>
                          {used ? (
                            <span className="picker__badge">
                              <Icon name="check" size={16} />
                              En la receta
                            </span>
                          ) : null}
                        </span>
                        <span className="picker__meta num">
                          {i.pack.trim() === '' ? 'Sin presentación' : `${i.pack} ${UNIT_INFO[i.unit].label}`} ·{' '}
                          {i.price.trim() === '' ? 'Sin precio' : formatMoney(parseNum(i.price), moneda)}
                        </span>
                        <span className="picker__cost num">{costText(i, moneda)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {mode.kind === 'add' ? (
            <div className="picker__foot">
              <p className="picker__live" role="status" aria-live="polite">
                {added.length > 0 ? `Agregaste: ${added.join(', ')}` : ''}
              </p>
              <Button variant="primary" onClick={requestClose}>
                Listo
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
