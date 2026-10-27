import type { IngredientRow, Insumo } from '../store/types';
import { normalizeText, parseNum } from './format';

/**
 * The insumo a row is linked to: by insumoId, else (no data change) the only insumo with the same name.
 */
export function linkedInsumo(row: IngredientRow, insumos: Insumo[]): Insumo | null {
  if (row.insumoId) {
    const byId = insumos.find((i) => i.id === row.insumoId);
    if (byId) return byId;
  }
  const n = normalizeText(row.name);
  if (n === '') return null;
  const matches = insumos.filter((i) => normalizeText(i.name) === n);
  return matches.length === 1 ? matches[0] : null;
}

/** true when the row's pack, unit or price differ from the insumo's (numbers compared, not strings). */
export function rowOutOfDate(row: IngredientRow, insumo: Insumo): boolean {
  return (
    parseNum(row.pack) !== parseNum(insumo.pack) ||
    row.packUnit !== insumo.unit ||
    parseNum(row.price) !== parseNum(insumo.price)
  );
}

/** true when the insumo has a usable presentación and price (an unfinished insumo must never overwrite a good row). */
export function insumoComplete(insumo: Insumo): boolean {
  return parseNum(insumo.pack) > 0 && parseNum(insumo.price) > 0;
}
