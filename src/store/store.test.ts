import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CORRUPT_KEY, ERR_COST, ERR_NAME, ERR_RANGE, ERR_UNITS, STORAGE_KEY, useStore } from './store';
import { isDraftDirty } from './draftGuard';
import { SEED_PASTEL_ID, createSeedData } from './seeds';
import { buildBackup, readBackup } from '../screens/Ajustes/backup';
import { priceProduct } from '../lib/pricing';
import type { AppData } from './types';

const a = () => useStore.getState().actions;
const st = () => useStore.getState();

beforeEach(() => {
  useStore.setState({ ...createSeedData(), lastSavedId: null });
});

describe('first run', () => {
  it('starts with the five samples, 15 insumos and the Pastel in the draft', () => {
    expect(st().products).toHaveLength(5);
    expect(st().products.every((p) => p.sample)).toBe(true);
    expect(st().insumos).toHaveLength(15);
    expect(st().draft.name).toBe('Pastel de chocolate');
    expect(st().draft.editingId).toBe(SEED_PASTEL_ID);
    expect(st().draft.rows).toHaveLength(10);
    expect(st().lastSavedId).toBeNull();
  });
});

describe('settings / quick', () => {
  it('setSetting and setQuickField', () => {
    a().setSetting('moneda', '€');
    a().setSetting('ivaOn', true);
    a().setQuickField('mp', '10');
    a().setQuickField('redondeo', 5);
    expect(st().settings.moneda).toBe('€');
    expect(st().settings.ivaOn).toBe(true);
    expect(st().quick.mp).toBe('10');
    expect(st().quick.redondeo).toBe(5);
  });
});

describe('draft editing', () => {
  it('setDraftField, addRow, removeRow', () => {
    a().setDraftField('name', 'Nuevo');
    const id = a().addRow();
    expect(st().draft.name).toBe('Nuevo');
    expect(st().draft.rows).toHaveLength(11);
    expect(st().draft.rows[10].id).toBe(id);
    a().removeRow(id);
    expect(st().draft.rows).toHaveLength(10);
  });

  it('updateRow fixes the use unit when the pack unit changes dimension', () => {
    a().resetDraft();
    const id = st().draft.rows[0].id;
    a().updateRow(id, { packUnit: 'l' });
    expect(st().draft.rows[0].packUnit).toBe('l');
    expect(st().draft.rows[0].useUnit).toBe('ml');
    a().updateRow(id, { packUnit: 'pza' });
    expect(st().draft.rows[0].useUnit).toBe('pza');
    a().updateRow(id, { packUnit: 'kg' });
    expect(st().draft.rows[0].useUnit).toBe('g');
  });

  it('updateRow keeps the use unit when the dimension is the same or when both change', () => {
    a().resetDraft();
    const id = st().draft.rows[0].id;
    a().updateRow(id, { packUnit: 'kg', useUnit: 'g' });
    a().updateRow(id, { packUnit: 'g' });
    expect(st().draft.rows[0].useUnit).toBe('g');
    a().updateRow(id, { packUnit: 'gal', useUnit: 'l' });
    expect(st().draft.rows[0].useUnit).toBe('l');
    // changing the use unit alone never touches the pack unit (may become incompatible: UI flags it)
    a().updateRow(id, { useUnit: 'g' });
    expect(st().draft.rows[0].packUnit).toBe('gal');
  });

  it('resetDraft leaves settings untouched', () => {
    a().setSetting('tarifa', '120');
    a().resetDraft();
    const d = st().draft;
    expect(d.name).toBe('');
    expect(d.porciones).toBe('1');
    expect(d.rows).toHaveLength(1);
    expect(d.rows[0]).toMatchObject({ name: '', packUnit: 'g', useUnit: 'g' });
    expect(d.horas).toBe('');
    expect(d.editingId).toBeNull();
    expect(st().settings.tarifa).toBe('120');
  });

  it('loadProductIntoDraft deep-copies', () => {
    const p = st().products[1];
    a().loadProductIntoDraft(p.id);
    expect(st().draft.editingId).toBe(p.id);
    expect(st().draft.name).toBe(p.name);
    a().updateRow(st().draft.rows[0].id, { price: '999' });
    expect(st().products[1].rows[0].price).toBe('228.50');
  });
});

describe('saveDraft', () => {
  it('rejects an empty name', () => {
    a().setDraftField('name', '   ');
    expect(a().saveDraft('update')).toEqual({ ok: false, error: ERR_NAME });
    expect(ERR_NAME).toBe('Ponle un nombre al producto para guardarlo.');
  });

  it('rejects a product without costs', () => {
    a().resetDraft();
    a().setDraftField('name', 'Vacío');
    expect(a().saveDraft('new')).toEqual({ ok: false, error: ERR_COST });
    expect(ERR_COST).toBe('Agrega al menos un costo antes de guardar.');
    expect(st().products).toHaveLength(5);
  });

  it('update replaces in place, clears sample, bumps updatedAt', () => {
    const before = st().products[0];
    a().setDraftField('name', '  Pastel editado ');
    a().updateRow(st().draft.rows[0].id, { price: '40' });
    const res = a().saveDraft('update');
    expect(res).toEqual({ ok: true, id: SEED_PASTEL_ID });
    expect(st().products).toHaveLength(5);
    const after = st().products[0];
    expect(after.id).toBe(SEED_PASTEL_ID);
    expect(after.name).toBe('Pastel editado');
    expect(after.sample).toBe(false);
    expect(after.updatedAt).toBeGreaterThanOrEqual(before.updatedAt);
    expect(after.rows[0].price).toBe('40');
    expect(st().draft.editingId).toBe(SEED_PASTEL_ID);
    expect(st().lastSavedId).toBe(SEED_PASTEL_ID);
    expect(st().products[1].sample).toBe(true);
  });

  it('new inserts a fresh id at the top and keeps the original', () => {
    a().setDraftField('name', 'Pastel copia');
    const res = a().saveDraft('new');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.id).not.toBe(SEED_PASTEL_ID);
    expect(st().products).toHaveLength(6);
    expect(st().products[0].id).toBe(res.id);
    expect(st().products[0].name).toBe('Pastel copia');
    expect(st().products[0].sample).toBe(false);
    expect(st().products.find((p) => p.id === SEED_PASTEL_ID)!.name).toBe('Pastel de chocolate');
    expect(st().draft.editingId).toBe(res.id);
    expect(st().lastSavedId).toBe(res.id);
  });

  it('update with a missing editingId inserts a new product', () => {
    a().resetDraft();
    a().setDraftField('name', 'Galletas');
    a().updateRow(st().draft.rows[0].id, { pack: '1', packUnit: 'pza', price: '30', used: '1', useUnit: 'pza' });
    const res = a().saveDraft('update');
    expect(res.ok).toBe(true);
    expect(st().products).toHaveLength(6);
    expect(st().products[0].name).toBe('Galletas');
  });

  it('always deep-copies rows (saved product and draft stay independent)', () => {
    a().setDraftField('name', 'Copia');
    const res = a().saveDraft('new');
    if (!res.ok) throw new Error('save failed');
    const saved = () => st().products.find((p) => p.id === res.id)!;
    expect(saved().rows).not.toBe(st().draft.rows);
    expect(saved().rows[0]).not.toBe(st().draft.rows[0]);
    a().updateRow(st().draft.rows[0].id, { price: '12345' });
    expect(saved().rows[0].price).toBe('32');
    // and the other way round
    a().saveDraft('update');
    a().updateRow(st().draft.rows[0].id, { price: '1' });
    expect(saved().rows[0].price).toBe('12345');
  });

  it('saved cost matches the live price', () => {
    a().setDraftField('name', 'Cuenta');
    const res = a().saveDraft('new');
    if (!res.ok) throw new Error('save failed');
    const p = st().products[0];
    expect(priceProduct(p, st().settings).P).toBe(560);
  });
});

describe('deleteProduct / loadExample', () => {
  it('deleting the edited product clears editingId', () => {
    a().deleteProduct(SEED_PASTEL_ID);
    expect(st().products).toHaveLength(4);
    expect(st().draft.editingId).toBeNull();
    // the draft content itself is kept
    expect(st().draft.name).toBe('Pastel de chocolate');
  });

  it('deleting the last saved product clears lastSavedId, other deletes do not', () => {
    a().setDraftField('name', 'X');
    const res = a().saveDraft('new');
    if (!res.ok) throw new Error('save failed');
    a().deleteProduct('seed-flan-napolitano');
    expect(st().lastSavedId).toBe(res.id);
    expect(st().draft.editingId).toBe(res.id);
    a().deleteProduct(res.id);
    expect(st().lastSavedId).toBeNull();
    expect(st().draft.editingId).toBeNull();
  });

  it('clearLastSaved', () => {
    a().setDraftField('name', 'Y');
    a().saveDraft('new');
    a().clearLastSaved();
    expect(st().lastSavedId).toBeNull();
  });

  it('loadExample links to the sample Pastel while it exists', () => {
    a().resetDraft();
    a().loadExample();
    expect(st().draft.name).toBe('Pastel de chocolate');
    expect(st().draft.editingId).toBe(SEED_PASTEL_ID);
    expect(st().draft.rows).toHaveLength(10);
  });

  it('loadExample after the sample was deleted does not link to anything', () => {
    a().deleteProduct(SEED_PASTEL_ID);
    a().resetDraft();
    a().loadExample();
    expect(st().draft.name).toBe('Pastel de chocolate');
    expect(st().draft.editingId).toBeNull();
    // saving it with "update" creates a new product instead of failing
    expect(a().saveDraft('update').ok).toBe(true);
    expect(st().products).toHaveLength(5);
  });
});

describe('insumos', () => {
  it('add at top, update, remove', () => {
    const id = a().addInsumo();
    expect(st().insumos[0].id).toBe(id);
    expect(st().insumos).toHaveLength(16);
    a().updateInsumo(id, { name: 'Sal', pack: '1', unit: 'kg', price: '15' });
    expect(st().insumos[0]).toMatchObject({ name: 'Sal', unit: 'kg', price: '15' });
    a().removeInsumo(id);
    expect(st().insumos).toHaveLength(15);
  });
});

describe('data actions', () => {
  it('replaceAllData with partial data fills the rest from seeds', () => {
    const ok = a().replaceAllData({
      settings: { moneda: '€', tarifa: '100' },
      products: [
        {
          id: 'p1',
          name: 'Solo uno',
          porciones: '4',
          rows: [{ id: 'r1', name: 'x', pack: '1', packUnit: 'kg', price: '10', used: '100', useUnit: 'g' }],
        },
      ],
    } as unknown as AppData);
    expect(ok).toBe(true);
    expect(st().settings.moneda).toBe('€');
    expect(st().settings.tarifa).toBe('100');
    expect(st().settings.ganancia).toBe('35');
    expect(st().settings.redondeo).toBe(10);
    expect(st().products).toHaveLength(1);
    expect(st().products[0]).toMatchObject({ id: 'p1', sample: false, horas: '', gasHoras: '' });
    expect(st().insumos).toHaveLength(15);
    expect(st().quick.mp).toBe('193.05');
    // draft comes from the seeds, but is not linked to a product that no longer exists
    expect(st().draft.name).toBe('Pastel de chocolate');
    expect(st().draft.editingId).toBeNull();
    expect(st().lastSavedId).toBeNull();
  });

  it('replaceAllData rejects garbage and sanitises bad fields', () => {
    expect(a().replaceAllData(null as unknown as AppData)).toBe(false);
    expect(a().replaceAllData('x' as unknown as AppData)).toBe(false);
    expect(st().products).toHaveLength(5);
    a().replaceAllData({
      settings: { modo: 'raro', redondeo: 7, ivaOn: 'si' },
      insumos: [{ name: 'A', unit: 'oz' }, 5, null],
      products: [null, { id: 'z' }, { rows: [], name: 'ok' }],
    } as unknown as AppData);
    expect(st().settings.modo).toBe('costo');
    expect(st().settings.redondeo).toBe(10);
    expect(st().settings.ivaOn).toBe(false);
    expect(st().insumos).toHaveLength(1);
    expect(st().insumos[0].unit).toBe('g');
    expect(st().products).toHaveLength(1);
    expect(st().products[0].name).toBe('ok');
  });

  it('exportData then replaceAllData round-trips', () => {
    a().setSetting('moneda', 'Q');
    a().setDraftField('name', 'Mi pastel');
    a().saveDraft('new');
    const backup = buildBackup(a().exportData());
    a().clearAllData();
    expect(st().products).toHaveLength(0);
    const parsed = readBackup(backup);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    a().replaceAllData(parsed.data);
    expect(st().settings.moneda).toBe('Q');
    expect(st().products[0].name).toBe('Mi pastel');
    expect(st().products).toHaveLength(6);
  });

  it('exportData returns a detached copy', () => {
    const data = a().exportData();
    data.products[0].name = 'cambiado';
    expect(st().products[0].name).toBe('Pastel de chocolate');
  });

  it('readBackup rejects non-backups and empty or partial ones', () => {
    const wrap = (data: unknown, version = 1) => JSON.stringify({ app: 'calculadora-pasteleria', version, data });
    expect(readBackup('no json').ok).toBe(false);
    expect(readBackup('[]').ok).toBe(false);
    expect(readBackup('{"hola":1}').ok).toBe(false);
    expect(readBackup('{"products":[]}').ok).toBe(false);
    expect(readBackup(wrap({})).ok).toBe(false);
    expect(readBackup(wrap({ products: [], insumos: [] })).ok).toBe(false);
    expect(readBackup(wrap({ products: [], insumos: [], settings: {} }, 99)).ok).toBe(false);
    const ok = readBackup(wrap({ products: [], insumos: [], settings: { moneda: 'Q' } }));
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      // a missing draft / quick calc is never filled with the sample data
      expect(ok.data.draft.name).toBe('');
      expect(ok.data.draft.editingId).toBeNull();
      expect(ok.data.settings.moneda).toBe('Q');
    }
  });

  it('caps text length and row counts when sanitising', () => {
    a().replaceAllData({
      settings: { moneda: 'x'.repeat(500) },
      products: [],
      insumos: Array.from({ length: 2500 }, (_, i) => ({ name: 'n'.repeat(1000) + i })),
    } as unknown as AppData);
    expect(st().settings.moneda.length).toBeLessThanOrEqual(8);
    expect(st().insumos).toHaveLength(2000);
    expect(st().insumos[0].name.length).toBeLessThanOrEqual(200);
  });

  it('quick.redondeo 1 is normalised to an option the quick screen offers', () => {
    const data = a().exportData();
    a().replaceAllData({ ...data, quick: { ...data.quick, redondeo: 1 } });
    expect([0, 5, 10]).toContain(st().quick.redondeo);
  });

  it('loadSampleData restores everything', () => {
    a().clearAllData();
    a().loadSampleData();
    expect(st().products).toHaveLength(5);
    expect(st().insumos).toHaveLength(15);
    expect(st().draft.editingId).toBe(SEED_PASTEL_ID);
  });

  it('clearAllData keeps the currency, resets the rest to defaults', () => {
    a().setSetting('moneda', '€');
    a().setSetting('tarifa', '999');
    a().setSetting('ivaOn', true);
    a().clearAllData();
    expect(st().products).toEqual([]);
    expect(st().insumos).toEqual([]);
    expect(st().draft.name).toBe('');
    expect(st().draft.rows).toHaveLength(1);
    expect(st().settings.moneda).toBe('€');
    expect(st().settings.tarifa).toBe('80');
    expect(st().settings.ivaOn).toBe(false);
    expect(st().lastSavedId).toBeNull();
  });
});

describe('persistence', () => {
  it('writes to localStorage under calc-pasteleria without the actions', () => {
    a().setSetting('moneda', 'Z');
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(1);
    expect(parsed.state.settings.moneda).toBe('Z');
    expect(parsed.state.actions).toBeUndefined();
    expect(parsed.state).not.toHaveProperty('lastSavedId');
    expect(parsed.state).not.toHaveProperty('persistOk');
  });

  it('rehydrates from storage and survives corrupt content', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, state: { settings: { moneda: 'R' }, products: [], bogus: 1 } }),
    );
    await useStore.persist.rehydrate();
    expect(st().settings.moneda).toBe('R');
    expect(st().settings.tarifa).toBe('80');
    expect(st().products).toEqual([]);
    expect(st().insumos).toHaveLength(15);
    expect(typeof st().actions.saveDraft).toBe('function');
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    await useStore.persist.rehydrate();
    expect(typeof st().actions.saveDraft).toBe('function');
  });
});

describe('loadExample', () => {
  it('links to the bundled Pastel while it is still the untouched sample', () => {
    a().setDraftField('name', 'otro');
    a().loadExample();
    expect(st().draft.editingId).toBe(SEED_PASTEL_ID);
    expect(st().draft.name).toBe('Pastel de chocolate');
  });

  it('does not link to a Pastel the user edited and saved: saving creates a new product', () => {
    a().setDraftField('name', 'Mi pastel propio');
    expect(a().saveDraft('update').ok).toBe(true);
    const mine = st().products.find((p) => p.id === SEED_PASTEL_ID)!;
    expect(mine.sample).toBe(false);
    a().loadExample();
    expect(st().draft.editingId).toBeNull();
    const res = a().saveDraft('update');
    expect(res.ok).toBe(true);
    expect(st().products.find((p) => p.id === SEED_PASTEL_ID)!.name).toBe('Mi pastel propio');
    expect(st().products).toHaveLength(6);
  });
});

describe('isDraftDirty', () => {
  it('is clean right after first run, resetDraft and loadProductIntoDraft', () => {
    expect(isDraftDirty(st().draft, st().products)).toBe(false);
    a().resetDraft();
    expect(isDraftDirty(st().draft, st().products)).toBe(false);
    a().loadProductIntoDraft(st().products[1].id);
    expect(isDraftDirty(st().draft, st().products)).toBe(false);
  });

  it('is dirty after any edit and clean again once saved', () => {
    a().setDraftField('horas', '9');
    expect(isDraftDirty(st().draft, st().products)).toBe(true);
    expect(a().saveDraft('update').ok).toBe(true);
    expect(isDraftDirty(st().draft, st().products)).toBe(false);
    a().addRow();
    expect(isDraftDirty(st().draft, st().products)).toBe(true);
  });

  it('a new draft is dirty as soon as something is typed', () => {
    a().resetDraft();
    a().setDraftField('name', 'Nuevo');
    expect(isDraftDirty(st().draft, st().products)).toBe(true);
  });
});

describe('saveDraft guards', () => {
  it('refuses incompatible units', () => {
    a().updateRow(st().draft.rows[0].id, { useUnit: 'pza' });
    expect(a().saveDraft('new')).toEqual({ ok: false, error: ERR_UNITS });
    expect(st().products).toHaveLength(5);
  });

  it('refuses numbers that overflow', () => {
    a().updateRow(st().draft.rows[0].id, { price: '9'.repeat(200), used: '9'.repeat(200) });
    expect(a().saveDraft('new')).toEqual({ ok: false, error: ERR_RANGE });
  });

  it('negative amounts never lower the cost', () => {
    a().resetDraft();
    a().setDraftField('name', 'Negativo');
    a().setDraftField('horas', '-100');
    expect(a().saveDraft('new')).toEqual({ ok: false, error: ERR_COST });
  });
});

describe('persistence failures', () => {
  it('flags persistOk=false when localStorage refuses the write, and recovers', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    a().setSetting('moneda', 'Y');
    await Promise.resolve();
    expect(st().persistOk).toBe(false);
    expect(st().settings.moneda).toBe('Y');
    spy.mockRestore();
    a().setSetting('moneda', 'W');
    await Promise.resolve();
    await Promise.resolve();
    expect(st().persistOk).toBe(true);
  });

  it('keeps a copy of unreadable saved data before it can be overwritten', async () => {
    window.localStorage.removeItem(CORRUPT_KEY);
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    await useStore.persist.rehydrate();
    expect(window.localStorage.getItem(CORRUPT_KEY)).toBe('{not json');
    window.localStorage.removeItem(CORRUPT_KEY);
  });

  it('rehydrates when another window writes the same key', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, state: { settings: { moneda: 'Z2' }, products: [] } }),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: 'x' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(st().settings.moneda).toBe('Z2');
  });
});
