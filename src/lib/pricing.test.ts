import { describe, expect, it } from 'vitest';
import { insumoUnitCosts, materiaPrima, priceProduct, quickPrice, rowCost } from './pricing';
import { formatMoney, formatNum, formatPct, normalizeText, parseNum } from './format';
import { createSeedData, defaultQuick, defaultSettings } from '../store/seeds';
import type { IngredientRow, Settings } from '../store/types';

const m = (n: number) => formatMoney(n, '$');
const seed = createSeedData();
const settings = (over: Partial<Settings> = {}): Settings => ({ ...defaultSettings(), ...over });
const byName = (name: string) => seed.products.find((p) => p.name === name)!;
const row = (over: Partial<IngredientRow>): IngredientRow => ({
  id: 'r',
  name: '',
  pack: '1',
  packUnit: 'kg',
  price: '10',
  used: '1',
  useUnit: 'kg',
  ...over,
});

describe('parseNum / format', () => {
  it('accepts comma and dot decimals, empty and invalid are 0', () => {
    expect(parseNum('2,5')).toBe(2.5);
    expect(parseNum('2.5')).toBe(2.5);
    expect(parseNum(' 12 ')).toBe(12);
    expect(parseNum('')).toBe(0);
    expect(parseNum('abc')).toBe(0);
    expect(parseNum('Infinity')).toBe(0);
    expect(parseNum(undefined)).toBe(0);
  });
  it('handles thousands separators, spaces and stray characters', () => {
    expect(parseNum('1,234.56')).toBe(1234.56);
    expect(parseNum('1.234,56')).toBe(1234.56);
    expect(parseNum('1,200.50')).toBe(1200.5);
    expect(parseNum('1 000')).toBe(1000);
    expect(parseNum('1,234,567')).toBe(1234567);
    expect(parseNum('.5')).toBe(0.5);
    expect(parseNum('12abc')).toBe(0);
    expect(parseNum('1e5')).toBe(0);
    expect(parseNum('--5')).toBe(0);
    expect(parseNum('-')).toBe(0);
  });
  it('negative amounts never reduce a cost', () => {
    const neg = { ...byName('Pastel de chocolate'), horas: '-100' };
    expect(priceProduct(neg, settings()).mo).toBe(0);
    expect(rowCost(row({ price: '-50', used: '300', packUnit: 'kg', useUnit: 'g' })).cost).toBe(0);
  });
  it('formats money, percent and numbers in es-MX', () => {
    expect(formatMoney(1234.5, '$')).toBe('$1,234.50');
    expect(formatMoney(-5, '$')).toBe('-$5.00');
    expect(formatMoney(-0.001, '$')).toBe('$0.00');
    expect(formatMoney(0.032, '$', 3)).toBe('$0.032');
    expect(formatPct(34.54)).toBe('34.5 %');
    expect(formatPct(25.925)).toBe('25.9 %');
    expect(formatPct(0)).toBe('0 %');
    expect(formatNum(2.5)).toBe('2.5');
  });
  it('normalizes text for accent-insensitive search', () => {
    expect(normalizeText('  Azúcar Glass ')).toBe('azucar glass');
    expect(normalizeText('Limón')).toBe('limon');
  });
});

describe('rowCost', () => {
  it('computes the ten Pastel de chocolate row costs', () => {
    const costs = byName('Pastel de chocolate').rows.map((r) => rowCost(r).cost);
    const expected = [9.6, 11.9, 21.76, 12.67, 32.67, 7.0, 1.45, 52.0, 19.0, 25.0];
    expected.forEach((e, i) => expect(costs[i]).toBeCloseTo(e, 2));
    expect(costs.map((c) => m(c))).toEqual(
      ['$9.60', '$11.90', '$21.76', '$12.67', '$32.67', '$7.00', '$1.45', '$52.00', '$19.00', '$25.00'],
    );
  });
  it('flags incompatible units only when dimensions differ', () => {
    expect(rowCost(row({ packUnit: 'kg', useUnit: 'ml' }))).toEqual({ cost: 0, incompatible: true });
    expect(rowCost(row({ packUnit: 'pza', useUnit: 'g' }))).toEqual({ cost: 0, incompatible: true });
    expect(rowCost(row({ packUnit: 'l', useUnit: 'gal' })).incompatible).toBe(false);
  });
  it('an empty or zero pack is 0 but not flagged', () => {
    expect(rowCost(row({ pack: '' }))).toEqual({ cost: 0, incompatible: false });
    expect(rowCost(row({ pack: '0' }))).toEqual({ cost: 0, incompatible: false });
  });
  it('converts across units of the same dimension', () => {
    // $32/kg, 300 g -> 9.60 ; $95/l, 200 ml -> 19 ; 1 gal -> 3785.41 ml
    expect(rowCost(row({ price: '32', used: '300', useUnit: 'g' })).cost).toBeCloseTo(9.6, 6);
    expect(rowCost(row({ pack: '1', packUnit: 'gal', price: '3785.41', used: '1', useUnit: 'ml' })).cost).toBeCloseTo(1, 6);
  });
  it('sums MP', () => {
    expect(materiaPrima(byName('Pastel de chocolate').rows)).toBeCloseTo(193.05, 2);
    expect(materiaPrima([])).toBe(0);
  });
});

describe('priceProduct - Pastel de chocolate', () => {
  const pastel = byName('Pastel de chocolate');

  it('IVA off, default settings', () => {
    const b = priceProduct(pastel, settings());
    expect(m(b.mp)).toBe('$193.05');
    expect(m(b.mo)).toBe('$200.00');
    expect(m(b.gas)).toBe('$14.00');
    expect(m(b.luz)).toBe('$3.60');
    expect(m(b.agua)).toBe('$1.00');
    expect(m(b.gi)).toBe('$18.60');
    expect(m(b.ct)).toBe('$411.65');
    expect(m(b.p0)).toBe('$555.73');
    expect(m(b.pbruto)).toBe('$555.73');
    expect(b.rounded).toBe(true);
    expect(m(b.P)).toBe('$560.00');
    expect(m(b.base)).toBe('$560.00');
    expect(b.iva).toBeCloseTo(0, 9);
    expect(m(b.gananciaReal)).toBe('$148.35');
    expect(m(b.porPorcion)).toBe('$46.67');
    expect(m(b.costoPorcion)).toBe('$34.30');
    expect(b.porciones).toBe(12);
    expect(formatPct(b.shares.mp)).toBe('34.5 %');
    expect(formatPct(b.shares.mo)).toBe('35.7 %');
    expect(formatPct(b.shares.gi)).toBe('3.3 %');
    expect(formatPct(b.shares.ganancia)).toBe('26.5 %');
    expect(b.shares.iva).toBe(0);
    expect(b.equivalenciaKind).toBe('sobrePrecio');
    expect(formatPct(b.equivalencia)).toBe('25.9 %');
    expect(b.t).toBe(0);
  });

  it('IVA on (16 %)', () => {
    const b = priceProduct(pastel, settings({ ivaOn: true }));
    expect(m(b.pbruto)).toBe('$644.64');
    expect(b.rounded).toBe(true);
    expect(m(b.P)).toBe('$650.00');
    expect(m(b.base)).toBe('$560.34');
    expect(m(b.iva)).toBe('$89.66');
    expect(m(b.gananciaReal)).toBe('$148.70');
    expect(m(b.porPorcion)).toBe('$54.17');
    expect(b.shares.iva).toBeGreaterThan(0);
    expect(b.t).toBe(16);
  });

  it('IVA rate is clamped to 0..100', () => {
    expect(priceProduct(pastel, settings({ ivaOn: true, ivaTasa: '500' })).t).toBe(100);
    expect(priceProduct(pastel, settings({ ivaOn: true, ivaTasa: '-3' })).t).toBe(0);
  });
});

describe('priceProduct - product list', () => {
  const cases: [string, string, string, string, string][] = [
    ['Pastel de chocolate', '$560.00', '$46.67', '$411.65', '$148.35'],
    ['Cheesecake de fresa', '$560.00', '$56.00', '$409.75', '$150.25'],
    ['Pay de limón', '$280.00', '$35.00', '$202.60', '$77.40'],
    ['Cupcakes de vainilla (docena)', '$340.00', '$28.33', '$248.20', '$91.80'],
    ['Flan napolitano', '$250.00', '$25.00', '$180.30', '$69.70'],
  ];
  it.each(cases)('%s with IVA off', (name, P, porcion, ct, ganancia) => {
    const b = priceProduct(byName(name), settings());
    expect(m(b.P)).toBe(P);
    expect(m(b.porPorcion)).toBe(porcion);
    expect(m(b.ct)).toBe(ct);
    expect(m(b.gananciaReal)).toBe(ganancia);
  });

  const ivaCases: [string, string, string | null, string | null, string | null][] = [
    ['Pastel de chocolate', '$650.00', null, null, null],
    ['Cheesecake de fresa', '$650.00', null, null, '$150.59'],
    ['Pay de limón', '$320.00', '$275.86', '$44.14', '$73.26'],
    ['Cupcakes de vainilla (docena)', '$390.00', '$336.21', '$53.79', '$88.01'],
    ['Flan napolitano', '$290.00', '$250.00', '$40.00', null],
  ];
  it.each(ivaCases)('%s with IVA 16 %%', (name, P, base, iva, ganancia) => {
    const b = priceProduct(byName(name), settings({ ivaOn: true }));
    expect(m(b.P)).toBe(P);
    if (base) expect(m(b.base)).toBe(base);
    if (iva) expect(m(b.iva)).toBe(iva);
    if (ganancia) expect(m(b.gananciaReal)).toBe(ganancia);
  });
});

describe('priceProduct - modes, rounding and guards', () => {
  const pastel = byName('Pastel de chocolate');

  it("modo 'precio' divides by (1 - g/100) and reports margin over cost", () => {
    const b = priceProduct(pastel, settings({ modo: 'precio', ganancia: '35', redondeo: 0 }));
    expect(b.p0).toBeCloseTo(b.ct / 0.65, 6);
    expect(b.equivalenciaKind).toBe('sobreCosto');
    expect(b.equivalencia).toBeCloseTo((b.p0 / b.ct - 1) * 100, 6);
    expect(b.gananciaReal / b.P).toBeCloseTo(0.35, 6);
  });

  it("modo 'precio' clamps the margin at 95", () => {
    const b = priceProduct(pastel, settings({ modo: 'precio', ganancia: '150', redondeo: 0 }));
    expect(b.p0).toBeCloseTo(b.ct / 0.05, 6);
    expect(Number.isFinite(b.P)).toBe(true);
    const neg = priceProduct(pastel, settings({ modo: 'precio', ganancia: '-20', redondeo: 0 }));
    expect(neg.p0).toBeCloseTo(neg.ct, 6);
  });

  it("modo 'costo' does not clamp the top of the margin but not below 0", () => {
    const b = priceProduct(pastel, settings({ ganancia: '200', redondeo: 0 }));
    expect(b.p0).toBeCloseTo(b.ct * 3, 6);
    expect(priceProduct(pastel, settings({ ganancia: '-10', redondeo: 0 })).p0).toBeCloseTo(b.ct, 6);
  });

  it('step 0 means no rounding', () => {
    const b = priceProduct(pastel, settings({ redondeo: 0 }));
    expect(b.P).toBeCloseTo(b.pbruto, 9);
    expect(b.rounded).toBe(false);
  });

  it('steps of 1 and 5 round up', () => {
    expect(priceProduct(pastel, settings({ redondeo: 1 })).P).toBe(556);
    expect(priceProduct(pastel, settings({ redondeo: 5 })).P).toBe(560);
  });

  it('an exact multiple is not bumped to the next step', () => {
    const b = priceProduct(
      { ...pastel, rows: [row({ pack: '1', packUnit: 'pza', price: '100', used: '1', useUnit: 'pza' })], horas: '', gasHoras: '', luzKwh: '', aguaLitros: '' },
      settings({ ganancia: '0', redondeo: 10 }),
    );
    expect(b.P).toBe(100);
    expect(b.rounded).toBe(false);
  });

  it('zero guards: empty product has no NaN, no division by zero', () => {
    const empty = { name: '', porciones: '', rows: [], horas: '', gasHoras: '', luzKwh: '', aguaLitros: '' };
    for (const modo of ['costo', 'precio'] as const) {
      const b = priceProduct(empty, settings({ modo }));
      expect(b.ct).toBe(0);
      expect(b.P).toBe(0);
      expect(b.porciones).toBe(1);
      expect(b.porPorcion).toBe(0);
      expect(b.equivalencia).toBe(0);
      expect(b.gananciaReal).toBe(0);
      expect(Object.is(b.gananciaReal, -0)).toBe(false);
      expect(b.rounded).toBe(false);
      expect(b.shares).toEqual({ mp: 0, mo: 0, gi: 0, ganancia: 0, iva: 0 });
      for (const v of Object.values(b)) if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('porciones is at least 1', () => {
    expect(priceProduct({ ...pastel, porciones: '0' }, settings()).porciones).toBe(1);
    expect(priceProduct({ ...pastel, porciones: '-4' }, settings()).porciones).toBe(1);
  });

  it('incompatible rows contribute 0 to MP', () => {
    const bad = row({ packUnit: 'kg', useUnit: 'ml', price: '100', used: '50' });
    expect(priceProduct({ ...pastel, rows: [bad] }, settings()).mp).toBe(0);
  });

  it('breakdown shares add up to 100 % (IVA on and off)', () => {
    for (const ivaOn of [false, true]) {
      const s = priceProduct(pastel, settings({ ivaOn })).shares;
      expect(s.mp + s.mo + s.gi + s.ganancia + s.iva).toBeCloseTo(100, 6);
    }
  });
});

describe('quickPrice', () => {
  it('IVA off', () => {
    const b = quickPrice(defaultQuick());
    expect(m(b.ct)).toBe('$411.65');
    expect(m(b.P)).toBe('$560.00');
    expect(m(b.porPorcion)).toBe('$46.67');
    expect(m(b.gananciaReal)).toBe('$148.35');
  });
  it('IVA on (16 %)', () => {
    const b = quickPrice({ ...defaultQuick(), ivaOn: true });
    expect(m(b.P)).toBe('$650.00');
    expect(m(b.base)).toBe('$560.34');
    expect(m(b.iva)).toBe('$89.66');
    expect(m(b.gananciaReal)).toBe('$148.69');
  });
  it('is always in costo mode, ignores negatives and empty text', () => {
    const b = quickPrice({ ...defaultQuick(), mp: '-50', horas: '', gas: 'x', redondeo: 0 });
    expect(b.mp).toBe(0);
    expect(b.mo).toBe(0);
    expect(b.gas).toBe(0);
    expect(b.equivalenciaKind).toBe('sobrePrecio');
  });
  it('accepts comma decimals', () => {
    expect(quickPrice({ ...defaultQuick(), luz: '3,60' }).luz).toBeCloseTo(3.6, 9);
  });
});

describe('insumoUnitCosts', () => {
  const find = (name: string) => seed.insumos.find((i) => i.name === name)!;
  it('Harina: $0.032 / g and $32.00 / kg', () => {
    const c = insumoUnitCosts(find('Harina de trigo'));
    expect(c.baseUnit).toBe('g');
    expect(formatMoney(c.perBase!, '$', 3)).toBe('$0.032');
    expect(c.kgLUnit).toBe('kg');
    expect(formatMoney(c.perKgL!, '$')).toBe('$32.00');
  });
  it('Leche entera: $0.028 / ml and $28.00 / l', () => {
    const c = insumoUnitCosts(find('Leche entera'));
    expect(c.baseUnit).toBe('ml');
    expect(formatMoney(c.perBase!, '$', 3)).toBe('$0.028');
    expect(c.kgLUnit).toBe('l');
    expect(formatMoney(c.perKgL!, '$')).toBe('$28.00');
  });
  it('Huevo: $3.17 / pza and no per-kg/l', () => {
    const c = insumoUnitCosts(find('Huevo'));
    expect(c.baseUnit).toBe('pza');
    expect(formatMoney(c.perBase!, '$')).toBe('$3.17');
    expect(c.perKgL).toBeNull();
    expect(c.kgLUnit).toBeNull();
  });
  it('empty or zero pack gives null costs', () => {
    expect(insumoUnitCosts({ pack: '', unit: 'kg', price: '10' }).perBase).toBeNull();
    expect(insumoUnitCosts({ pack: '0', unit: 'l', price: '10' }).perKgL).toBeNull();
  });
});
