import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Button from './Button';
import Card from './Card';
import Chips from './Chips';
import EmptyState from './EmptyState';
import Notice from './Notice';
import NumberField from './NumberField';
import Segmented from './Segmented';
import Select from './Select';
import TextField from './TextField';
import BreakdownBar from './BreakdownBar';
import { breakdownSegments } from './breakdownSegments';
import AppShell from '../app/AppShell';
import { parseHash } from '../app/useHashRoute';
import { priceProduct } from '../lib/pricing';
import { createSeedData } from '../store/seeds';
import { UNITS } from '../lib/units';

const noop = () => undefined;

describe('components (static markup)', () => {
  it('NumberField: real label, decimal keypad, text type', () => {
    const html = renderToStaticMarkup(
      <NumberField label="Horas" value="2,5" onChange={noop} prefix="$" suffix="h" helper="Ayuda" error="Mal" />,
    );
    expect(html).toMatch(/<label for="([^"]+)"[^>]*>Horas<\/label>/);
    expect(html).toContain('inputMode="decimal"');
    expect(html).toContain('type="text"');
    expect(html).toContain('autoComplete="off"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby');
    const id = /<label for="([^"]+)"/.exec(html)![1];
    expect(html).toContain(`id="${id}"`);
  });

  it('TextField with hidden label keeps the label element', () => {
    const html = renderToStaticMarkup(<TextField label="Nombre" hideLabel value="" onChange={noop} />);
    expect(html).toContain('visually-hidden');
    expect(html).toContain('>Nombre</label>');
    expect(html).not.toContain('inputMode');
  });

  it('Select renders all units with a label', () => {
    const html = renderToStaticMarkup(
      <Select label="Unidad" value="kg" onChange={noop} options={UNITS.map((u) => ({ value: u.value, label: u.label }))} />,
    );
    expect(html).toContain('>Unidad</label>');
    expect((html.match(/<option/g) ?? []).length).toBe(6);
  });

  it('Segmented and Chips use fieldset, hidden legend and aria-pressed', () => {
    const seg = renderToStaticMarkup(
      <Segmented legend="IVA" value={true} onChange={noop} options={[{ value: false, label: 'Sin IVA' }, { value: true, label: 'Con IVA' }]} />,
    );
    expect(seg).toContain('<fieldset');
    expect(seg).toContain('<legend class="visually-hidden">IVA</legend>');
    expect(seg).toContain('aria-pressed="true"');
    expect(seg).toContain('aria-pressed="false"');
    const chips = renderToStaticMarkup(
      <Chips legend="Margen" value={35} onChange={noop} options={[25, 35, 50].map((v) => ({ value: v, label: `${v} %` }))} />,
    );
    expect(chips).toContain('aria-pressed="true"');
    expect(chips).toContain('type="button"');
  });

  it('Button defaults to type=button; icon variant is labelled', () => {
    expect(renderToStaticMarkup(<Button>Guardar</Button>)).toContain('type="button"');
    const icon = renderToStaticMarkup(<Button variant="icon" icon="trash" aria-label="Eliminar" />);
    expect(icon).toContain('aria-label="Eliminar"');
    expect(icon).toContain('aria-hidden="true"');
  });

  it('Card, Notice, EmptyState', () => {
    expect(renderToStaticMarkup(<Card title="Mano de obra">x</Card>)).toMatch(/<section[^>]*aria-labelledby/);
    const n = renderToStaticMarkup(<Notice tone="success">Guardado</Notice>);
    expect(n).toContain('aria-live="polite"');
    expect(n).toContain('role="status"');
    expect(renderToStaticMarkup(<EmptyState title="Vacío">Texto</EmptyState>)).toContain('Vacío');
  });

  it('BreakdownBar lists every segment; IVA only when on', () => {
    const { products, settings } = createSeedData();
    const off = breakdownSegments(priceProduct(products[0], settings), '$');
    expect(off.map((s) => s.key)).toEqual(['mp', 'mo', 'gi', 'ganancia']);
    const on = breakdownSegments(priceProduct(products[0], { ...settings, ivaOn: true }), '$');
    expect(on.map((s) => s.key)).toEqual(['mp', 'mo', 'gi', 'ganancia', 'iva']);
    const html = renderToStaticMarkup(<BreakdownBar segments={off} />);
    expect(html).toContain('Materia prima');
    expect(html).toContain('$193.05');
    expect(html).toContain('34.5 %');
    expect(html).toContain('aria-hidden="true"');
  });

  it('AppShell renders both navs with aria-current on the active route', () => {
    const html = renderToStaticMarkup(
      <AppShell route="insumos">
        <h1>Hola</h1>
      </AppShell>,
    );
    expect(html).toContain('Calculadora de precios');
    expect(html).toContain('href="#/productos"');
    expect((html.match(/aria-current="page"/g) ?? []).length).toBe(2);
    expect(html).toContain('Cálculo rápido');
    expect(html).toContain('>Rápido<');
  });
});

describe('hash routing', () => {
  it('parses known routes and falls back to calcular', () => {
    expect(parseHash('#/productos')).toBe('productos');
    expect(parseHash('#/rapido?x=1')).toBe('rapido');
    expect(parseHash('#ajustes')).toBe('ajustes');
    expect(parseHash('')).toBe('calcular');
    expect(parseHash('#/nada')).toBe('calcular');
  });
});
