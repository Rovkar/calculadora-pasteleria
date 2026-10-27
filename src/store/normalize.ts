import { newId } from '../lib/ids';
import { isUnit, type Unit } from '../lib/units';
import { blankDraft, createSeedData, defaultQuick, defaultSettings } from './seeds';
import type {
  AppData,
  Draft,
  IngredientRow,
  Insumo,
  Modo,
  Product,
  QuickCalc,
  Redondeo,
  Settings,
} from './types';

type Rec = Record<string, unknown>;

function isRec(v: unknown): v is Rec {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Hard limits so a hand-edited or hostile file cannot blow up layouts or exceed the localStorage quota. */
export const MAX_TEXT = 200;
export const MAX_MONEDA = 8;
export const MAX_PRODUCTS = 2000;
export const MAX_INSUMOS = 2000;
export const MAX_ROWS = 500;

function str(v: unknown, fallback: string, max = MAX_TEXT): string {
  if (typeof v === 'string') return v.slice(0, max);
  if (typeof v === 'number' && Number.isFinite(v)) return String(v).slice(0, max);
  return fallback.slice(0, max);
}

function unit(v: unknown, fallback: Unit): Unit {
  return isUnit(v) ? v : fallback;
}

function redondeo(v: unknown, fallback: Redondeo): Redondeo {
  return v === 0 || v === 1 || v === 5 || v === 10 ? v : fallback;
}

function modo(v: unknown, fallback: Modo): Modo {
  return v === 'costo' || v === 'precio' ? v : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function cleanSettings(raw: unknown): Settings {
  const d = defaultSettings();
  if (!isRec(raw)) return d;
  return {
    moneda: str(raw.moneda, d.moneda, MAX_MONEDA) || d.moneda,
    tarifa: str(raw.tarifa, d.tarifa),
    gasPrecio: str(raw.gasPrecio, d.gasPrecio),
    luzPrecio: str(raw.luzPrecio, d.luzPrecio),
    aguaPrecio: str(raw.aguaPrecio, d.aguaPrecio),
    ganancia: str(raw.ganancia, d.ganancia),
    modo: modo(raw.modo, d.modo),
    redondeo: redondeo(raw.redondeo, d.redondeo),
    ivaOn: bool(raw.ivaOn, d.ivaOn),
    ivaTasa: str(raw.ivaTasa, d.ivaTasa),
  };
}

function cleanQuick(raw: unknown): QuickCalc {
  const d = defaultQuick();
  if (!isRec(raw)) return d;
  return {
    mp: str(raw.mp, d.mp),
    horas: str(raw.horas, d.horas),
    tarifa: str(raw.tarifa, d.tarifa),
    gas: str(raw.gas, d.gas),
    luz: str(raw.luz, d.luz),
    agua: str(raw.agua, d.agua),
    porciones: str(raw.porciones, d.porciones),
    ganancia: str(raw.ganancia, d.ganancia),
    // The quick screen only offers 0, 5 and 10.
    redondeo: ((): Redondeo => {
      const r = redondeo(raw.redondeo, d.redondeo);
      return r === 1 ? d.redondeo : r;
    })(),
    ivaOn: bool(raw.ivaOn, d.ivaOn),
    ivaTasa: str(raw.ivaTasa, d.ivaTasa),
  };
}

function cleanRow(raw: unknown): IngredientRow | null {
  if (!isRec(raw)) return null;
  return {
    id: str(raw.id, '') || newId(),
    name: str(raw.name, ''),
    pack: str(raw.pack, ''),
    packUnit: unit(raw.packUnit, 'g'),
    price: str(raw.price, ''),
    used: str(raw.used, ''),
    useUnit: unit(raw.useUnit, 'g'),
  };
}

function cleanRows(raw: unknown): IngredientRow[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: IngredientRow[] = [];
  for (const r of raw.slice(0, MAX_ROWS)) {
    const row = cleanRow(r);
    if (!row) continue;
    if (seen.has(row.id)) row.id = newId();
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

function cleanProduct(raw: unknown): Product | null {
  if (!isRec(raw) || !Array.isArray(raw.rows)) return null;
  return {
    id: str(raw.id, '') || newId(),
    name: str(raw.name, ''),
    porciones: str(raw.porciones, '1'),
    rows: cleanRows(raw.rows),
    horas: str(raw.horas, ''),
    gasHoras: str(raw.gasHoras, ''),
    luzKwh: str(raw.luzKwh, ''),
    aguaLitros: str(raw.aguaLitros, ''),
    sample: raw.sample === true,
    updatedAt: typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : Date.now(),
  };
}

function cleanProducts(raw: unknown): Product[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const p of raw.slice(0, MAX_PRODUCTS)) {
    const prod = cleanProduct(p);
    if (!prod) continue;
    if (seen.has(prod.id)) prod.id = newId();
    seen.add(prod.id);
    out.push(prod);
  }
  return out;
}

function cleanInsumos(raw: unknown): Insumo[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Insumo[] = [];
  for (const i of raw.slice(0, MAX_INSUMOS)) {
    if (!isRec(i)) continue;
    const ins: Insumo = {
      id: str(i.id, '') || newId(),
      name: str(i.name, ''),
      pack: str(i.pack, ''),
      unit: unit(i.unit, 'g'),
      price: str(i.price, ''),
    };
    if (seen.has(ins.id)) ins.id = newId();
    seen.add(ins.id);
    out.push(ins);
  }
  return out;
}

function cleanDraft(raw: unknown, products: Product[]): Draft {
  if (!isRec(raw) || !Array.isArray(raw.rows)) return blankDraft();
  const rows = cleanRows(raw.rows);
  const editingId = typeof raw.editingId === 'string' && products.some((p) => p.id === raw.editingId) ? raw.editingId : null;
  return {
    name: str(raw.name, ''),
    porciones: str(raw.porciones, '1'),
    rows: rows.length > 0 ? rows : blankDraft().rows,
    horas: str(raw.horas, ''),
    gasHoras: str(raw.gasHoras, ''),
    luzKwh: str(raw.luzKwh, ''),
    aguaLitros: str(raw.aguaLitros, ''),
    editingId,
  };
}

/**
 * Loosely validates arbitrary data (backup file, old localStorage) into a complete AppData.
 * A section that is MISSING (undefined) is filled from the first-run seeds; a section that is
 * present is cleaned field by field (bad values fall back to defaults). Returns null when `raw`
 * is not an object at all.
 */
export function normalizeAppData(raw: unknown): AppData | null {
  if (!isRec(raw)) return null;
  const seeds = createSeedData();
  const products = raw.products === undefined ? seeds.products : cleanProducts(raw.products);
  const draft =
    raw.draft === undefined
      ? {
          ...seeds.draft,
          editingId: products.some((p) => p.id === seeds.draft.editingId) ? seeds.draft.editingId : null,
        }
      : cleanDraft(raw.draft, products);
  return {
    settings: raw.settings === undefined ? seeds.settings : cleanSettings(raw.settings),
    products,
    insumos: raw.insumos === undefined ? seeds.insumos : cleanInsumos(raw.insumos),
    draft,
    quick: raw.quick === undefined ? seeds.quick : cleanQuick(raw.quick),
  };
}
