export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'gal' | 'pza';
export type Dimension = 'masa' | 'volumen' | 'piezas';
export type BaseUnit = 'g' | 'ml' | 'pza';

export interface UnitInfo {
  /** Short label shown in selects and suffixes ("kg"). */
  label: string;
  /** Long Spanish name ("kilogramos"). */
  name: string;
  dim: Dimension;
  /** Multiplier to the base unit of its dimension (g, ml or pza). */
  factor: number;
}

export const UNIT_INFO: Record<Unit, UnitInfo> = {
  g: { label: 'g', name: 'gramos', dim: 'masa', factor: 1 },
  kg: { label: 'kg', name: 'kilogramos', dim: 'masa', factor: 1000 },
  ml: { label: 'ml', name: 'mililitros', dim: 'volumen', factor: 1 },
  l: { label: 'l', name: 'litros', dim: 'volumen', factor: 1000 },
  // US gallon
  gal: { label: 'gal', name: 'galones', dim: 'volumen', factor: 3785.41 },
  pza: { label: 'pza', name: 'piezas', dim: 'piezas', factor: 1 },
};

/** Ordered list for building selects. `label` is the short text, `name` the long one. */
export const UNITS: { value: Unit; label: string; name: string }[] = (
  ['g', 'kg', 'ml', 'l', 'gal', 'pza'] as Unit[]
).map((value) => ({ value, label: UNIT_INFO[value].label, name: UNIT_INFO[value].name }));

export function isUnit(v: unknown): v is Unit {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(UNIT_INFO, v);
}

export function sameDimension(a: Unit, b: Unit): boolean {
  return UNIT_INFO[a].dim === UNIT_INFO[b].dim;
}

export function baseUnit(dim: Dimension): BaseUnit {
  return dim === 'masa' ? 'g' : dim === 'volumen' ? 'ml' : 'pza';
}

export function factorOf(u: Unit): number {
  return UNIT_INFO[u].factor;
}
