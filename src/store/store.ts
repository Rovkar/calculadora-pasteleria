import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { newId } from '../lib/ids';
import { baseUnit, sameDimension, UNIT_INFO } from '../lib/units';
import { priceProduct, rowCost } from '../lib/pricing';
import { insumoComplete, linkedInsumo } from '../lib/insumoLink';
import { normalizeAppData } from './normalize';
import {
  SEED_PASTEL_ID,
  blankDraft,
  blankRow,
  copyInput,
  createSeedData,
  createSeedProducts,
  defaultQuick,
  defaultSettings,
  draftFromProduct,
} from './seeds';
import type {
  AppData,
  IngredientRow,
  Insumo,
  Product,
  ProductInput,
  QuickCalc,
  SaveMode,
  SaveResult,
  Settings,
} from './types';

export const STORAGE_KEY = 'calc-pasteleria';
export const STORE_VERSION = 1;

export const ERR_NAME = 'Ponle un nombre al producto para guardarlo.';
export const ERR_COST = 'Agrega al menos un costo antes de guardar.';
export const ERR_UNITS =
  'Revisa las unidades de los ingredientes marcados: no se puede convertir entre peso, volumen y piezas.';
export const ERR_RANGE = 'Hay un número demasiado grande. Revisa las cantidades y los precios.';
/** Where the raw text of unreadable saved data is kept (best effort) before it can be overwritten. */
export const CORRUPT_KEY = `${STORAGE_KEY}-corrupt`;

export type DraftField = Exclude<keyof ProductInput, 'rows'>;
export type RowPatch = Partial<Omit<IngredientRow, 'id'>>;
export type InsumoPatch = Partial<Omit<Insumo, 'id'>>;

export interface Actions {
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;

  setDraftField: (key: DraftField, value: string) => void;
  /** Appends a blank row to the draft and returns its id. */
  addRow: () => string;
  updateRow: (id: string, patch: RowPatch) => void;
  removeRow: (id: string) => void;
  /** Appends one row per insumo (in order), filled from it; replaces a single completely blank row. Returns the new row ids. */
  addRowsFromInsumos: (insumoIds: string[]) => string[];
  /** Overwrites name, presentación, unidad y precio of the row with the insumo's (keeps the quantity used). */
  fillRowFromInsumo: (rowId: string, insumoId: string) => void;
  /** Same as fillRowFromInsumo with the row's linked insumo (no-op when there is none). */
  syncRowFromInsumo: (rowId: string) => void;
  /** "Empezar de cero": blank draft, editingId null, settings untouched. */
  resetDraft: () => void;
  /** Draft = fresh copy of the sample Pastel; editingId = that product if it still exists. */
  loadExample: () => void;
  loadProductIntoDraft: (id: string) => void;
  saveDraft: (mode: SaveMode) => SaveResult;
  deleteProduct: (id: string) => void;
  clearLastSaved: () => void;

  /** Adds a blank insumo at the top of the list and returns its id. */
  addInsumo: () => string;
  updateInsumo: (id: string, patch: InsumoPatch) => void;
  removeInsumo: (id: string) => void;

  setQuickField: <K extends keyof QuickCalc>(key: K, value: QuickCalc[K]) => void;

  /** Backup restore. Missing sections are filled from the seeds. Returns false when `data` is unusable. */
  replaceAllData: (data: AppData) => boolean;
  loadSampleData: () => void;
  clearAllData: () => void;
  exportData: () => AppData;
}

export interface StoreState extends AppData {
  /** Not persisted: the "Guardado" banner only makes sense right after saving. */
  lastSavedId: string | null;
  /** false once localStorage refused a write (full or blocked): the data only lives in memory. */
  persistOk: boolean;
  actions: Actions;
}

/** The part of the state that is persisted. */
type Persisted = AppData;

function isBlankRow(r: IngredientRow): boolean {
  return (
    r.name.trim() === '' && r.pack.trim() === '' && r.price.trim() === '' && r.used.trim() === '' && !r.insumoId
  );
}

function insumoFields(ins: Insumo): Pick<IngredientRow, 'name' | 'pack' | 'packUnit' | 'price' | 'insumoId'> {
  return { name: ins.name, pack: ins.pack, packUnit: ins.unit, price: ins.price, insumoId: ins.id };
}

function applyInsumo(r: IngredientRow, ins: Insumo): IngredientRow {
  const next: IngredientRow = { ...r, ...insumoFields(ins) };
  if (!sameDimension(next.packUnit, next.useUnit)) next.useUnit = baseUnit(UNIT_INFO[next.packUnit].dim);
  return next;
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

let persistRequested = false;
/** Asks the browser not to evict our storage under pressure. Safe to call many times. */
export function requestPersistOnce() {
  if (persistRequested) return;
  persistRequested = true;
  try {
    void navigator.storage?.persist?.()?.catch?.(() => undefined);
  } catch {
    // not supported: ignore
  }
}

/** Keeps a copy of saved text we cannot read, so the next write does not destroy the only evidence. */
function preserveIfUnreadable(ls: Storage, raw: string) {
  let ok = false;
  try {
    const parsed = JSON.parse(raw) as { state?: unknown } | null;
    ok = typeof parsed === 'object' && parsed !== null && typeof parsed.state === 'object' && parsed.state !== null;
  } catch {
    ok = false;
  }
  if (ok) return;
  try {
    if (ls.getItem(CORRUPT_KEY) === null) ls.setItem(CORRUPT_KEY, raw);
  } catch {
    // no room: nothing else to do
  }
}

function setPersistOk(ok: boolean) {
  // Deferred and guarded: setState itself triggers a persist write, which must not loop.
  queueMicrotask(() => {
    if (useStore.getState().persistOk !== ok) useStore.setState({ persistOk: ok });
  });
}

const storage = createJSONStorage<Persisted>(() => {
  try {
    const ls = window.localStorage;
    ls.getItem(STORAGE_KEY);
    return {
      getItem: (name: string) => {
        const raw = ls.getItem(name);
        if (raw !== null) preserveIfUnreadable(ls, raw);
        return raw;
      },
      setItem: (name: string, value: string) => {
        try {
          ls.setItem(name, value);
          setPersistOk(true);
          requestPersistOnce();
        } catch {
          // quota exceeded or storage blocked: keep working in memory, but tell the user (see persistOk)
          setPersistOk(false);
        }
      },
      removeItem: (name: string) => {
        try {
          ls.removeItem(name);
        } catch {
          // ignore
        }
      },
    };
  } catch {
    setPersistOk(false);
    return undefined as unknown as Storage;
  }
});

const seed = createSeedData();

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...seed,
      lastSavedId: null,
      persistOk: true,

      actions: {
        setSetting: (key, value) => set((s) => ({ settings: { ...s.settings, [key]: value } })),

        setDraftField: (key, value) => set((s) => ({ draft: { ...s.draft, [key]: value } })),

        addRow: () => {
          const row = blankRow();
          set((s) => ({ draft: { ...s.draft, rows: [...s.draft.rows, row] } }));
          return row.id;
        },

        updateRow: (id, patch) =>
          set((s) => ({
            draft: {
              ...s.draft,
              rows: s.draft.rows.map((r) => {
                if (r.id !== id) return r;
                const next: IngredientRow = { ...r, ...patch };
                if (
                  patch.packUnit !== undefined &&
                  patch.useUnit === undefined &&
                  !sameDimension(next.packUnit, next.useUnit)
                ) {
                  next.useUnit = baseUnit(UNIT_INFO[next.packUnit].dim);
                }
                return next;
              }),
            },
          })),

        removeRow: (id) =>
          set((s) => ({ draft: { ...s.draft, rows: s.draft.rows.filter((r) => r.id !== id) } })),

        addRowsFromInsumos: (insumoIds) => {
          const { insumos, draft } = get();
          const fresh: IngredientRow[] = [];
          for (const id of insumoIds) {
            const ins = insumos.find((i) => i.id === id);
            if (!ins) continue;
            fresh.push({
              id: newId(),
              ...insumoFields(ins),
              used: '',
              useUnit: baseUnit(UNIT_INFO[ins.unit].dim),
            });
          }
          if (fresh.length === 0) return [];
          const keep = draft.rows.length === 1 && isBlankRow(draft.rows[0]) ? [] : draft.rows;
          set({ draft: { ...draft, rows: [...keep, ...fresh] } });
          return fresh.map((r) => r.id);
        },

        fillRowFromInsumo: (rowId, insumoId) => {
          const ins = get().insumos.find((i) => i.id === insumoId);
          if (!ins) return;
          set((s) => ({
            draft: { ...s.draft, rows: s.draft.rows.map((r) => (r.id === rowId ? applyInsumo(r, ins) : r)) },
          }));
        },

        syncRowFromInsumo: (rowId) => {
          const { draft, insumos } = get();
          const r = draft.rows.find((x) => x.id === rowId);
          if (!r) return;
          const ins = linkedInsumo(r, insumos);
          if (ins && insumoComplete(ins)) get().actions.fillRowFromInsumo(rowId, ins.id);
        },

        resetDraft: () => set({ draft: blankDraft() }),

        loadExample: () => {
          const pastel = createSeedProducts()[0];
          // Only link to the bundled Pastel while it is still the untouched sample; if the user edited and saved it,
          // "Guardar cambios" must never overwrite their version with the factory recipe.
          const linked = get().products.some((p) => p.id === SEED_PASTEL_ID && p.sample);
          set({ draft: draftFromProduct(pastel, linked ? SEED_PASTEL_ID : null) });
        },

        loadProductIntoDraft: (id) => {
          const p = get().products.find((x) => x.id === id);
          if (!p) return;
          set({ draft: draftFromProduct(p, p.id) });
        },

        saveDraft: (mode) => {
          const { draft, settings, products } = get();
          const name = draft.name.trim();
          if (name === '') return { ok: false, error: ERR_NAME };
          const b = priceProduct(draft, settings);
          if (!(b.ct > 0)) return { ok: false, error: ERR_COST };
          if (draft.rows.some((r) => rowCost(r).incompatible)) return { ok: false, error: ERR_UNITS };
          if (!Number.isFinite(b.ct) || !Number.isFinite(b.P) || !Number.isFinite(b.gananciaReal)) {
            return { ok: false, error: ERR_RANGE };
          }

          const input = { ...copyInput(draft), name };
          const existing =
            mode === 'update' && draft.editingId !== null
              ? products.find((p) => p.id === draft.editingId)
              : undefined;

          if (existing) {
            const updated: Product = { ...input, id: existing.id, sample: false, updatedAt: Date.now() };
            set({
              products: products.map((p) => (p.id === existing.id ? updated : p)),
              draft: { ...draft, name, editingId: existing.id },
              lastSavedId: existing.id,
            });
            return { ok: true, id: existing.id };
          }

          const created: Product = { ...input, id: newId(), sample: false, updatedAt: Date.now() };
          set({
            products: [created, ...products],
            draft: { ...draft, name, editingId: created.id },
            lastSavedId: created.id,
          });
          return { ok: true, id: created.id };
        },

        deleteProduct: (id) =>
          set((s) => ({
            products: s.products.filter((p) => p.id !== id),
            draft: s.draft.editingId === id ? { ...s.draft, editingId: null } : s.draft,
            lastSavedId: s.lastSavedId === id ? null : s.lastSavedId,
          })),

        clearLastSaved: () => set({ lastSavedId: null }),

        addInsumo: () => {
          const ins: Insumo = { id: newId(), name: '', pack: '', unit: 'g', price: '' };
          set((s) => ({ insumos: [ins, ...s.insumos] }));
          return ins.id;
        },

        updateInsumo: (id, patch) =>
          set((s) => ({ insumos: s.insumos.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),

        removeInsumo: (id) => set((s) => ({ insumos: s.insumos.filter((i) => i.id !== id) })),

        setQuickField: (key, value) => set((s) => ({ quick: { ...s.quick, [key]: value } })),

        replaceAllData: (data) => {
          const clean = normalizeAppData(data);
          if (!clean) return false;
          set({ ...clean, lastSavedId: null });
          return true;
        },

        loadSampleData: () => {
          const fresh = createSeedData();
          set({ ...fresh, lastSavedId: null });
        },

        clearAllData: () =>
          set((s) => ({
            products: [],
            insumos: [],
            draft: blankDraft(),
            quick: defaultQuick(),
            settings: { ...defaultSettings(), moneda: s.settings.moneda },
            lastSavedId: null,
          })),

        exportData: () => {
          const { settings, products, insumos, draft, quick } = get();
          return deepClone({ settings, products, insumos, draft, quick });
        },
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      storage,
      partialize: (s): Persisted => ({
        settings: s.settings,
        products: s.products,
        insumos: s.insumos,
        draft: s.draft,
        quick: s.quick,
      }),
      // Placeholder for future schema changes: bump STORE_VERSION and transform `persisted` here.
      migrate: (persisted, _version) => persisted as Persisted,
      // Sanitise whatever is in localStorage so corrupt or partial data can never crash the app.
      merge: (persisted, current) => {
        const clean = normalizeAppData(persisted);
        if (!clean) return current;
        return { ...current, ...clean, lastSavedId: null };
      },
    },
  ),
);

// Several windows (the installed app and a browser tab) share one localStorage: pick up what the other one saved,
// otherwise the stale window would overwrite it on its next write. merge() sanitises the incoming data.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue !== null) void useStore.persist.rehydrate();
  });
}

/** Convenience: all actions (stable reference, safe to select without re-renders). */
export const useActions = () => useStore((s) => s.actions);
