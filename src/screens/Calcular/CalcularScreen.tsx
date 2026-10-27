import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BreakdownBar from '../../components/BreakdownBar';
import { breakdownSegments } from '../../components/breakdownSegments';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Chips from '../../components/Chips';
import NumberField from '../../components/NumberField';
import { PCT } from '../../components/Pct';
import Segmented from '../../components/Segmented';
import TextField from '../../components/TextField';
import { navigate } from '../../app/useHashRoute';
import { formatMoney, formatNum, formatPct, parseNum } from '../../lib/format';
import { priceProduct, rowCost } from '../../lib/pricing';
import { confirmDiscardDraft } from '../../store/draftGuard';
import { useActions, useStore } from '../../store/store';
import Notice from '../../components/Notice';
import { insumoComplete, linkedInsumo, rowOutOfDate } from '../../lib/insumoLink';
import IngredientRow from './IngredientRow';
import InsumoPicker, { type PickerMode, type PickerResult } from './InsumoPicker';
import './CalcularScreen.css';

const HEADERS = ['Ingrediente', 'Presentación', 'Unidad', 'Precio de compra', 'Cantidad usada', 'Unidad', 'Costo', '', ''];

type FocusTarget = { rowId: string; field?: 'used' } | 'add' | { element: HTMLElement } | null;

export default function CalcularScreen() {
  const settings = useStore((s) => s.settings);
  const draft = useStore((s) => s.draft);
  const products = useStore((s) => s.products);
  const insumos = useStore((s) => s.insumos);
  const a = useActions();
  const resultsRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const addRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState('');
  const [announce, setAnnounce] = useState('');
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  const [picker, setPicker] = useState<PickerMode | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Linked insumo per row id, only for rows whose data differ from the list.
  const outdated = useMemo(() => {
    const map = new Map<string, (typeof insumos)[number]>();
    for (const r of draft.rows) {
      const ins = linkedInsumo(r, insumos);
      if (ins && insumoComplete(ins) && rowOutOfDate(r, ins)) map.set(r.id, ins);
    }
    return map;
  }, [draft.rows, insumos]);

  const openPicker = useCallback((mode: PickerMode, opener: HTMLElement) => {
    openerRef.current = opener;
    setPicker(mode);
  }, []);

  const pickForRow = useCallback(
    (id: string, opener: HTMLElement) => {
      const row = useStore.getState().draft.rows.find((r) => r.id === id);
      openPicker({ kind: 'replace', rowId: id, rowLabel: row?.name.trim() || 'este ingrediente' }, opener);
    },
    [openPicker],
  );

  // The button that was clicked unmounts once the row is up to date, so focus goes to the row's "Cantidad usada".
  const syncRow = useCallback(
    (id: string) => {
      const rows = useStore.getState().draft.rows;
      const i = rows.findIndex((r) => r.id === id);
      a.syncRowFromInsumo(id);
      setFocusTarget({ rowId: id, field: 'used' });
      setAnnounce(`Precio actualizado: ${rows[i]?.name.trim() || `ingrediente ${i + 1}`}.`);
    },
    [a],
  );

  const syncAll = () => {
    const ids = Array.from(outdated.keys());
    for (const id of ids) a.syncRowFromInsumo(id);
    setAnnounce(ids.length === 1 ? '1 ingrediente actualizado.' : `${ids.length} ingredientes actualizados.`);
    setFocusTarget('add');
  };

  const closePicker = (r: PickerResult) => {
    setPicker(null);
    const rowId = r.addedRowIds[0] ?? r.filledRowId;
    if (rowId) setFocusTarget({ rowId, field: 'used' });
    else if (openerRef.current) setFocusTarget({ element: openerRef.current });
  };

  const b = useMemo(() => priceProduct(draft, settings), [draft, settings]);
  const m = settings.moneda;
  const fm = (n: number) => formatMoney(n, m);
  const editing = draft.editingId ? products.find((p) => p.id === draft.editingId) : undefined;
  const isEmpty = b.ct <= 0;

  useEffect(() => {
    setError('');
  }, [draft]);

  // After adding / removing an ingredient, move focus somewhere sensible (the unmounted button would drop it on <body>).
  useEffect(() => {
    if (!focusTarget) return;
    if (focusTarget === 'add') {
      addRef.current?.querySelector('button')?.focus();
    } else if ('element' in focusTarget) {
      focusTarget.element.focus();
    } else {
      const li = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-row-id]') ?? []).find(
        (el) => el.dataset.rowId === focusTarget.rowId,
      );
      const input = li?.querySelector<HTMLInputElement>(focusTarget.field === 'used' ? '.ing-row__used input' : 'input');
      if (input) {
        input.focus();
        const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        input.scrollIntoView?.({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      }
    }
    setFocusTarget(null);
  }, [focusTarget, draft.rows]);

  const addIngredient = () => {
    const id = a.addRow();
    setFocusTarget({ rowId: id });
    setAnnounce(`Ingrediente ${draft.rows.length + 1} agregado.`);
  };

  const removeIngredient = useCallback(
    (id: string) => {
      const rows = useStore.getState().draft.rows;
      const i = rows.findIndex((r) => r.id === id);
      if (i < 0) return;
      const name = rows[i].name.trim() || `ingrediente ${i + 1}`;
      const next = rows[i + 1] ?? rows[i - 1];
      a.removeRow(id);
      setFocusTarget(next ? { rowId: next.id } : 'add');
      setAnnounce(`${name} quitado.`);
    },
    [a],
  );

  const incompatibleIssues = useMemo(
    () => draft.rows.some((r) => rowCost(r).incompatible),
    [draft.rows],
  );

  const sliderMax = settings.modo === 'precio' ? 95 : 100;
  const sliderVal = Math.min(sliderMax, Math.max(0, parseNum(settings.ganancia)));
  const equiv =
    settings.modo === 'costo'
      ? `Equivale a un margen de ${formatPct(b.equivalencia)} sobre el precio de venta`
      : `Equivale a ${formatPct(b.equivalencia)} sobre el costo`;
  const ivaTasaNum = parseNum(settings.ivaTasa);
  const formula =
    (settings.modo === 'costo'
      ? 'Precio = costo total × (1 + ganancia). Costo total = materia prima + mano de obra + gas, luz y agua.'
      : 'Precio = costo total ÷ (1 − margen). Costo total = materia prima + mano de obra + gas, luz y agua.') +
    (settings.ivaOn ? ' Con IVA: precio final = precio × (1 + IVA), y después se redondea.' : '');
  const portionsText = `${fm(b.porPorcion)} por porción · ${formatNum(b.porciones)} ${b.porciones === 1 ? 'porción' : 'porciones'}`;

  function save(mode: 'update' | 'new') {
    const r = a.saveDraft(mode);
    if (r.ok) {
      navigate('productos');
    } else {
      setError(r.error);
    }
  }

  function scrollToResults() {
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resultsRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  const hours = (label: string, field: 'gasHoras' | 'luzKwh' | 'aguaLitros', suffix: string) => (
    <NumberField label={label} suffix={suffix} value={draft[field]} onChange={(v) => a.setDraftField(field, v)} />
  );

  return (
    <div className="calc">
      <div className="visually-hidden" role="status" aria-live="polite">
        {announce}
      </div>
      <div className="calc__intro">
        <h1>Calcula tu precio de venta</h1>
        <p>
          Suma tus ingredientes, tu tiempo y la ganancia que quieres. Los valores de ejemplo son de un pastel de chocolate: cámbialos por
          los tuyos.
        </p>
      </div>

      <div className="calc__layout">
        <div className="calc__inputs">
          <Card title="Producto">
            <div className="calc__row2">
              <TextField label="Nombre del producto" value={draft.name} onChange={(v) => a.setDraftField('name', v)} placeholder="Ej. Pastel de chocolate" />
              <NumberField label="Rinde (porciones)" value={draft.porciones} onChange={(v) => a.setDraftField('porciones', v)} />
            </div>
          </Card>

          <Card
            title="Materia prima"
            helper="Precio que pagas por el paquete y lo que usas en la receta. Puedes usar g, kg, ml, l, galones o piezas: se convierten solos."
            headerRight={<span className="calc__cardtotal num">{fm(b.mp)}</span>}
          >
            <div className="calc__stack">
              {draft.rows.length === 0 ? (
                <p className="calc__muted">Todavía no hay ingredientes. Agrega el primero.</p>
              ) : (
                <>
                  {outdated.size > 0 ? (
                    <Notice
                      tone="info"
                      action={
                        <Button onClick={syncAll}>
                          Actualizar todos
                        </Button>
                      }
                    >
                      {outdated.size === 1
                        ? '1 ingrediente tiene otro precio en tu lista de insumos.'
                        : `${outdated.size} ingredientes tienen otro precio en tu lista de insumos.`}
                    </Notice>
                  ) : null}
                  <div className="ing-head" aria-hidden="true">
                    {HEADERS.map((h, i) => (
                      <span key={i}>{h}</span>
                    ))}
                  </div>
                  <ul className="calc__list" ref={listRef}>
                    {draft.rows.map((r, i) => (
                      <IngredientRow key={r.id} row={r} index={i} moneda={m} onRemove={removeIngredient}
                        onPick={pickForRow}
                        outdatedInsumo={outdated.get(r.id) ?? null}
                        onSync={syncRow}
                      />
                    ))}
                  </ul>
                </>
              )}
              {incompatibleIssues ? (
                <p className="calc__small">Revisa las unidades marcadas: no se puede convertir entre peso, volumen y piezas.</p>
              ) : null}
              <div className="calc__listfoot">
                <div ref={addRef} className="calc__adds">
                  <Button icon="plus" onClick={addIngredient}>
                    Agregar ingrediente
                  </Button>
                  <Button variant="primary" icon="list" onClick={(e) => openPicker({ kind: 'add' }, e.currentTarget)}>
                    Agregar desde mis insumos
                  </Button>
                </div>
                <div className="calc__total calc__total--inline">
                  <span>Total materia prima</span>
                  <span className="num">{fm(b.mp)}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Mano de obra">
            <div className="calc__stack">
              <div className="calc__row2">
                <NumberField label="Horas de trabajo" suffix="h" value={draft.horas} onChange={(v) => a.setDraftField('horas', v)} />
                <NumberField
                  label="Tarifa por hora"
                  prefix={m}
                  value={settings.tarifa}
                  onChange={(v) => a.setSetting('tarifa', v)}
                  helper="Se usa en todos tus productos."
                />
              </div>
              <p className="calc__small">Incluye preparación, horneado, decoración y limpieza.</p>
              <div className="calc__total">
                <span>Mano de obra</span>
                <span className="num">{fm(b.mo)}</span>
              </div>
            </div>
          </Card>

          <Card title="Gas, luz y agua" helper="Calcula cada servicio según lo que usa esta receta.">
            <div className="calc__stack">
              <div className="calc__svc">
                {hours('Horas de horno', 'gasHoras', 'h')}
                <NumberField label="Precio por hora de horno" prefix={m} value={settings.gasPrecio} onChange={(v) => a.setSetting('gasPrecio', v)} />
                <div className="calc__svc-sub">
                  <span>Gas</span>
                  <span className="num">{fm(b.gas)}</span>
                </div>
              </div>
              <div className="calc__svc">
                {hours('kWh usados', 'luzKwh', 'kWh')}
                <NumberField label="Precio por kWh" prefix={m} value={settings.luzPrecio} onChange={(v) => a.setSetting('luzPrecio', v)} />
                <div className="calc__svc-sub">
                  <span>Luz</span>
                  <span className="num">{fm(b.luz)}</span>
                </div>
              </div>
              <p className="calc__small">kWh = watts del equipo × horas de uso ÷ 1000</p>
              <div className="calc__svc">
                {hours('Litros usados', 'aguaLitros', 'l')}
                <NumberField label="Precio por litro" prefix={m} value={settings.aguaPrecio} onChange={(v) => a.setSetting('aguaPrecio', v)} />
                <div className="calc__svc-sub">
                  <span>Agua</span>
                  <span className="num">{fm(b.agua)}</span>
                </div>
              </div>
              <div className="calc__total">
                <span>Gas, luz y agua</span>
                <span className="num">{fm(b.gi)}</span>
              </div>
            </div>
          </Card>

          <Card title="Ganancia">
            <div className="calc__stack">
              <Segmented
                legend="Cómo calcular la ganancia"
                value={settings.modo}
                onChange={(v) => a.setSetting('modo', v)}
                options={[
                  { value: 'costo', label: 'Sobre el costo' },
                  { value: 'precio', label: 'Sobre el precio de venta' },
                ]}
              />
              <NumberField label={<>Ganancia que quieres{PCT}</>} suffix="%" value={settings.ganancia} onChange={(v) => a.setSetting('ganancia', v)} />
              <input
                type="range"
                className="calc__range"
                aria-label="Ajustar ganancia con el control deslizante"
                aria-valuetext={`${formatNum(sliderVal)} %`}
                min={0}
                max={sliderMax}
                step={1}
                value={sliderVal}
                onChange={(e) => a.setSetting('ganancia', e.target.value)}
              />
              <p className="calc__small">{equiv}</p>
              <span className="calc__legend" aria-hidden="true">
                Redondear el precio
              </span>
              <Segmented
                legend="Redondeo del precio"
                value={settings.redondeo}
                onChange={(v) => a.setSetting('redondeo', v)}
                options={[
                  { value: 0, label: 'Sin redondeo' },
                  { value: 1, label: `${m}1` },
                  { value: 5, label: `${m}5` },
                  { value: 10, label: `${m}10` },
                ]}
              />
            </div>
          </Card>

          <Card
            title="Impuesto (IVA)"
            helper="Actívalo si cobras IVA a tus clientes. El precio final lo incluye, pero tu ganancia se calcula sin él."
          >
            <div className="calc__stack">
              <Segmented
                legend="Impuesto IVA"
                value={settings.ivaOn}
                onChange={(v) => a.setSetting('ivaOn', v)}
                options={[
                  { value: false, label: 'Sin IVA' },
                  { value: true, label: 'Con IVA' },
                ]}
              />
              {settings.ivaOn ? (
                <>
                  <div className="calc__ivaRow">
                    <NumberField label={<>Tasa de IVA{PCT}</>} suffix="%" value={settings.ivaTasa} onChange={(v) => a.setSetting('ivaTasa', v)} />
                    <Chips
                      legend="Tasas de IVA comunes"
                      value={settings.ivaTasa !== '' && ivaTasaNum === 8 ? 8 : settings.ivaTasa !== '' && ivaTasaNum === 16 ? 16 : null}
                      onChange={(v) => a.setSetting('ivaTasa', String(v))}
                      options={[
                        { value: 8, label: '8 %' },
                        { value: 16, label: '16 %' },
                      ]}
                    />
                  </div>
                  <div className="calc__total">
                    <span>IVA</span>
                    <span className="num">{fm(b.iva)}</span>
                  </div>
                  <p className="calc__small">El IVA no es ganancia: lo cobras al cliente y lo entregas a Hacienda.</p>
                </>
              ) : null}
            </div>
          </Card>
        </div>

        <aside className="calc__sticky" aria-label="Resultado">
          <section className="card calc__results" ref={resultsRef} aria-labelledby="calc-res-title">
            <span className="calc__eyebrow">{settings.ivaOn ? 'Precio de venta sugerido · IVA incluido' : 'Precio de venta sugerido'}</span>
            <h2 id="calc-res-title" className="calc__pname">
              {draft.name.trim() || 'Tu producto'}
            </h2>
            <div className="calc__price num">{fm(b.P)}</div>
            <div className="calc__small num">{portionsText}</div>
            {isEmpty ? <span className="calc__muted">Completa los datos para ver tu precio.</span> : null}
            {settings.ivaOn ? (
              <div className="calc__small num">
                Sin IVA {fm(b.base)} · IVA ({formatNum(b.t)} %) {fm(b.iva)}
              </div>
            ) : null}
            {b.rounded ? <div className="calc__small num">Redondeado desde {fm(b.pbruto)}</div> : null}

            <BreakdownBar segments={breakdownSegments(b, m)} />

            <div className="calc__facts">
              <div className="calc__line calc__line--bold">
                <span>Costo total</span>
                <span className="num">{fm(b.ct)}</span>
              </div>
              <div className="calc__line">
                <span>Costo por porción</span>
                <span className="num">{fm(b.costoPorcion)}</span>
              </div>
              <div className="calc__line calc__line--accent">
                <span>Ganancia real</span>
                <span className="num">{fm(b.gananciaReal)}</span>
              </div>
            </div>

            <div className="calc__save">
              {editing ? (
                <>
                  <span className="calc__small">Editando: {editing.name}</span>
                  <Button variant="primary" size="lg" fullWidth onClick={() => save('update')}>
                    Guardar cambios
                  </Button>
                  <Button fullWidth onClick={() => save('new')}>
                    Guardar como nuevo
                  </Button>
                </>
              ) : (
                <Button variant="primary" size="lg" fullWidth onClick={() => save('new')}>
                  Guardar en Mis productos
                </Button>
              )}
              <div className="calc__err" role="status" aria-live="polite">
                {error}
              </div>
            </div>
            <div className="calc__aux">
              <Button
                onClick={() => {
                  if (confirmDiscardDraft()) a.resetDraft();
                }}
              >
                Empezar de cero
              </Button>
              <Button
                onClick={() => {
                  if (confirmDiscardDraft()) a.loadExample();
                }}
              >
                Cargar ejemplo
              </Button>
            </div>
            <div className="calc__how">
              <strong>Cómo se calcula</strong>
              <span>{formula}</span>
            </div>

          </section>
        </aside>
      </div>

      <InsumoPicker mode={picker} onClose={closePicker} />

      <div className="calc__bar">
        <div className="calc__bar-price">
          <span className="calc__bar-big num">{fm(b.P)}</span>
          <span className="calc__bar-sub num">{fm(b.porPorcion)} por porción</span>
        </div>
        <Button variant="primary" onClick={scrollToResults}>
          Ver resumen
        </Button>
      </div>
    </div>
  );
}
