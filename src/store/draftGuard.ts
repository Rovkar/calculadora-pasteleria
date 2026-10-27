import { useStore } from './store';
import { blankDraft } from './seeds';
import type { Draft, Product, ProductInput } from './types';

/** Everything the user can type in a product, without the volatile row ids. */
function signature(i: ProductInput): string {
  return JSON.stringify([
    i.name.trim(),
    i.porciones,
    i.horas,
    i.gasHoras,
    i.luzKwh,
    i.aguaLitros,
    i.rows.map((r) => [r.name, r.pack, r.packUnit, r.price, r.used, r.useUnit]),
  ]);
}

/**
 * true when the draft holds work that is not saved anywhere: it differs from the saved product it is
 * editing, or (when it is not linked to a product) from a blank draft.
 */
export function isDraftDirty(draft: Draft, products: Product[]): boolean {
  const saved = draft.editingId ? products.find((p) => p.id === draft.editingId) : undefined;
  const baseline: ProductInput = saved ?? blankDraft();
  return signature(draft) !== signature(baseline);
}

export const DISCARD_MESSAGE =
  'Tienes cambios sin guardar en la calculadora. Si continúas se perderán. ¿Quieres continuar?';

/** Call before anything that replaces the draft. Returns true when it is fine to go on. */
export function confirmDiscardDraft(): boolean {
  const { draft, products } = useStore.getState();
  if (!isDraftDirty(draft, products)) return true;
  return window.confirm(DISCARD_MESSAGE);
}
