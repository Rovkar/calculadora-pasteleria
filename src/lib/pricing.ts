import type { IngredientRow, Insumo, ProductInput, QuickCalc, Settings } from '../store/types';
import { UNIT_INFO, type BaseUnit } from './units';
import { parseNum } from './format';

export interface RowCost {
  cost: number;
  /** true only when pack unit and use unit have different dimensions */
  incompatible: boolean;
}

/** Typed amounts are never negative: a stray "-" cannot produce a negative cost. */
function pos(v: unknown): number {
  return Math.max(0, parseNum(v));
}

/** price / (pack x factor(packUnit)) x used x factor(useUnit) */
export function rowCost(row: IngredientRow): RowCost {
  const pu = UNIT_INFO[row.packUnit] ?? UNIT_INFO.g;
  const uu = UNIT_INFO[row.useUnit] ?? UNIT_INFO.g;
  const incompatible = pu.dim !== uu.dim;
  const pack = parseNum(row.pack);
  if (incompatible || !(pack > 0)) return { cost: 0, incompatible };
  const cost = (pos(row.price) / (pack * pu.factor)) * pos(row.used) * uu.factor;
  return { cost, incompatible: false };
}

export function materiaPrima(rows: IngredientRow[]): number {
  return rows.reduce((sum, r) => sum + rowCost(r).cost, 0);
}

export type EquivalenciaKind = 'sobrePrecio' | 'sobreCosto';

export interface Breakdown {
  mp: number;
  mo: number;
  gas: number;
  luz: number;
  agua: number;
  /** gas + luz + agua */
  gi: number;
  /** total cost */
  ct: number;
  /** price before IVA and rounding */
  p0: number;
  /** p0 with IVA, before rounding */
  pbruto: number;
  /** final suggested price (IVA included when ivaOn) */
  P: number;
  /** P without IVA */
  base: number;
  iva: number;
  gananciaReal: number;
  porPorcion: number;
  costoPorcion: number;
  porciones: number;
  /** Margin expressed the other way around (see equivalenciaKind) */
  equivalencia: number;
  equivalenciaKind: EquivalenciaKind;
  /** true when rounding changed the price (show "Redondeado desde {pbruto}") */
  rounded: boolean;
  /** effective IVA rate in percent (0 when ivaOn is false) */
  t: number;
  ivaOn: boolean;
  /** each as % of P (0 when P is 0) */
  shares: { mp: number; mo: number; gi: number; ganancia: number; iva: number };
}

interface Core {
  mp: number;
  mo: number;
  gas: number;
  luz: number;
  agua: number;
  porciones: string | number;
}

interface Pricing {
  ganancia: string;
  modo: 'costo' | 'precio';
  redondeo: number;
  ivaOn: boolean;
  ivaTasa: string;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function compute(c: Core, s: Pricing): Breakdown {
  const gi = c.gas + c.luz + c.agua;
  const ct = c.mp + c.mo + gi;
  const g = Math.max(0, parseNum(s.ganancia));
  let p0: number;
  if (s.modo === 'costo') {
    p0 = ct * (1 + g / 100);
  } else {
    p0 = ct / (1 - clamp(g, 0, 95) / 100);
  }
  const step = s.redondeo;
  const t = s.ivaOn ? clamp(parseNum(s.ivaTasa), 0, 100) : 0;
  const pbruto = p0 * (1 + t / 100);
  const P = (step > 0 ? Math.ceil(pbruto / step - 1e-9) * step : pbruto) + 0; // + 0 turns -0 into 0
  const base = P / (1 + t / 100);
  const iva = P - base;
  let gananciaReal = base - ct;
  if (Math.abs(gananciaReal) < 1e-6 || Object.is(gananciaReal, -0)) gananciaReal = 0;
  const porciones = Math.max(1, parseNum(c.porciones));
  const rounded = step > 0 && Math.abs(P - pbruto) > 0.005;

  let equivalencia: number;
  let equivalenciaKind: EquivalenciaKind;
  if (s.modo === 'costo') {
    equivalenciaKind = 'sobrePrecio';
    equivalencia = p0 === 0 ? 0 : ((p0 - ct) / p0) * 100;
  } else {
    equivalenciaKind = 'sobreCosto';
    equivalencia = ct === 0 ? 0 : ((p0 - ct) / ct) * 100;
  }

  const sh = (v: number) => (P > 0 ? Math.max(0, (v / P) * 100) : 0);
  return {
    mp: c.mp,
    mo: c.mo,
    gas: c.gas,
    luz: c.luz,
    agua: c.agua,
    gi,
    ct,
    p0,
    pbruto,
    P,
    base,
    iva,
    gananciaReal,
    porPorcion: P / porciones,
    costoPorcion: ct / porciones,
    porciones,
    equivalencia,
    equivalenciaKind,
    rounded,
    t,
    ivaOn: s.ivaOn,
    shares: {
      mp: sh(c.mp),
      mo: sh(c.mo),
      gi: sh(gi),
      ganancia: sh(gananciaReal),
      iva: s.ivaOn ? sh(iva) : 0,
    },
  };
}

/** Full pricing of a product (or of the draft) with the shared settings. */
export function priceProduct(input: ProductInput, settings: Settings): Breakdown {
  return compute(
    {
      mp: materiaPrima(input.rows),
      mo: pos(input.horas) * pos(settings.tarifa),
      gas: pos(input.gasHoras) * pos(settings.gasPrecio),
      luz: pos(input.luzKwh) * pos(settings.luzPrecio),
      agua: pos(input.aguaLitros) * pos(settings.aguaPrecio),
      porciones: input.porciones,
    },
    settings,
  );
}

/** "Calculo rapido": MP and gas/luz/agua are typed amounts; mode is always 'costo'. */
export function quickPrice(q: QuickCalc): Breakdown {
  return compute(
    {
      mp: pos(q.mp),
      mo: pos(q.horas) * pos(q.tarifa),
      gas: pos(q.gas),
      luz: pos(q.luz),
      agua: pos(q.agua),
      porciones: q.porciones,
    },
    { ganancia: q.ganancia, modo: 'costo', redondeo: q.redondeo, ivaOn: q.ivaOn, ivaTasa: q.ivaTasa },
  );
}

export interface InsumoUnitCosts {
  /** cost per g / ml / pza, or null when the pack is empty or 0 */
  perBase: number | null;
  baseUnit: BaseUnit;
  /** cost per kg or l (perBase x 1000), null for pieces or when perBase is null */
  perKgL: number | null;
  kgLUnit: 'kg' | 'l' | null;
}

export function insumoUnitCosts(insumo: Pick<Insumo, 'pack' | 'unit' | 'price'>): InsumoUnitCosts {
  const info = UNIT_INFO[insumo.unit] ?? UNIT_INFO.g;
  const base: BaseUnit = info.dim === 'masa' ? 'g' : info.dim === 'volumen' ? 'ml' : 'pza';
  const kgL = info.dim === 'masa' ? 'kg' : info.dim === 'volumen' ? 'l' : null;
  const pack = parseNum(insumo.pack);
  if (!(pack > 0)) return { perBase: null, baseUnit: base, perKgL: null, kgLUnit: kgL };
  const perBase = pos(insumo.price) / (pack * info.factor);
  return { perBase, baseUnit: base, perKgL: kgL ? perBase * 1000 : null, kgLUnit: kgL };
}
