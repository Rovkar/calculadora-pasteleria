import type { Unit } from '../lib/units';

export type { Unit };

/** All numeric fields are kept as the raw strings the user typed (parse with parseNum). */
export interface IngredientRow {
  id: string;
  name: string;
  pack: string;
  packUnit: Unit;
  price: string;
  used: string;
  useUnit: Unit;
  /** Insumo this row was filled from (optional link; the row keeps its own copy of the data). */
  insumoId?: string;
}

export interface ProductInput {
  name: string;
  porciones: string;
  rows: IngredientRow[];
  horas: string;
  gasHoras: string;
  luzKwh: string;
  aguaLitros: string;
}

export interface Product extends ProductInput {
  id: string;
  /** true for the bundled examples that the user has not edited yet */
  sample: boolean;
  /** epoch ms */
  updatedAt: number;
}

export interface Draft extends ProductInput {
  /** id of the saved product being edited, or null for a brand new one */
  editingId: string | null;
}

export type Modo = 'costo' | 'precio';
export type Redondeo = 0 | 1 | 5 | 10;

export interface Settings {
  moneda: string;
  tarifa: string;
  gasPrecio: string;
  luzPrecio: string;
  aguaPrecio: string;
  ganancia: string;
  modo: Modo;
  redondeo: Redondeo;
  ivaOn: boolean;
  ivaTasa: string;
}

export interface Insumo {
  id: string;
  name: string;
  pack: string;
  unit: Unit;
  price: string;
}

export interface QuickCalc {
  mp: string;
  horas: string;
  tarifa: string;
  gas: string;
  luz: string;
  agua: string;
  porciones: string;
  ganancia: string;
  redondeo: Redondeo;
  ivaOn: boolean;
  ivaTasa: string;
}

export interface AppData {
  settings: Settings;
  products: Product[];
  insumos: Insumo[];
  draft: Draft;
  quick: QuickCalc;
}

export type SaveMode = 'update' | 'new';
export type SaveResult = { ok: true; id: string } | { ok: false; error: string };
