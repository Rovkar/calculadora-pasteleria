import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from './store';
import { createSeedData } from './seeds';
import { buildBackup, readBackup } from '../screens/Ajustes/backup';

const a = () => useStore.getState().actions;
const st = () => useStore.getState();

beforeEach(() => {
  useStore.setState({ ...createSeedData(), lastSavedId: null });
});

const insId = (name: string) => st().insumos.find((i) => i.name === name)!.id;

describe('insumo-linked rows', () => {
  it('seed Pastel rows are linked to the matching seed insumos', () => {
    for (const r of st().draft.rows) {
      expect(r.insumoId).toBeTruthy();
      expect(st().insumos.find((i) => i.id === r.insumoId)?.name).toBe(r.name);
    }
  });

  it('addRowsFromInsumos appends filled rows in order with base use units', () => {
    const ids = a().addRowsFromInsumos([insId('Leche entera'), insId('Huevo'), insId('Azúcar'), 'nope']);
    expect(ids).toHaveLength(3);
    const rows = st().draft.rows;
    expect(rows).toHaveLength(13);
    const [leche, huevo, azucar] = rows.slice(10);
    expect(rows.slice(10).map((r) => r.id)).toEqual(ids);
    expect(leche).toMatchObject({ name: 'Leche entera', pack: '1', packUnit: 'gal', price: '106', used: '', useUnit: 'ml', insumoId: insId('Leche entera') });
    expect(huevo).toMatchObject({ packUnit: 'pza', useUnit: 'pza' });
    expect(azucar).toMatchObject({ packUnit: 'kg', useUnit: 'g' });
  });

  it('replaces a single completely blank row', () => {
    a().resetDraft();
    const blankId = st().draft.rows[0].id;
    const [id] = a().addRowsFromInsumos([insId('Azúcar')]);
    expect(st().draft.rows).toHaveLength(1);
    expect(st().draft.rows[0].id).toBe(id);
    expect(id).not.toBe(blankId);
  });

  it('keeps a lone row that is not blank', () => {
    a().resetDraft();
    a().updateRow(st().draft.rows[0].id, { name: 'Algo' });
    a().addRowsFromInsumos([insId('Azúcar')]);
    expect(st().draft.rows).toHaveLength(2);
  });

  it('fillRowFromInsumo overwrites data, keeps used and a compatible useUnit', () => {
    const r = st().draft.rows.find((x) => x.name === 'Harina de trigo')!;
    a().updateRow(r.id, { used: '500', useUnit: 'kg' });
    a().fillRowFromInsumo(r.id, insId('Azúcar'));
    const n = st().draft.rows.find((x) => x.id === r.id)!;
    expect(n).toMatchObject({ name: 'Azúcar', pack: '1', packUnit: 'kg', price: '34', used: '500', useUnit: 'kg', insumoId: insId('Azúcar') });
  });

  it('fillRowFromInsumo resets an incompatible useUnit to the base unit', () => {
    const r = st().draft.rows.find((x) => x.name === 'Harina de trigo')!;
    a().fillRowFromInsumo(r.id, insId('Leche entera'));
    expect(st().draft.rows.find((x) => x.id === r.id)!).toMatchObject({ packUnit: 'gal', useUnit: 'ml', used: '300' });
  });

  it('syncRowFromInsumo never overwrites a row with an unfinished insumo', () => {
    const r = st().draft.rows[0];
    const id = r.insumoId!;
    useStore.setState({ insumos: st().insumos.map((x) => (x.id === id ? { ...x, price: '' } : x)) });
    a().syncRowFromInsumo(r.id);
    expect(st().draft.rows[0].price).toBe(r.price);
  });

  it('syncRowFromInsumo pulls the new price; no-op without a linked insumo', () => {
    const r = st().draft.rows.find((x) => x.name === 'Azúcar')!;
    a().updateInsumo(insId('Azúcar'), { price: '40' });
    a().syncRowFromInsumo(r.id);
    expect(st().draft.rows.find((x) => x.id === r.id)!.price).toBe('40');
    a().updateRow(r.id, { name: 'Sin vínculo', insumoId: undefined, price: '1' });
    a().syncRowFromInsumo(r.id);
    const n = st().draft.rows.find((x) => x.id === r.id)!;
    expect(n.name).toBe('Sin vínculo');
    expect(n.price).toBe('1');
  });

  it('insumoId survives saveDraft / loadProductIntoDraft deep copies', () => {
    a().setDraftField('name', 'Con vínculos');
    const [id] = a().addRowsFromInsumos([insId('Azúcar')]);
    a().updateRow(id, { used: '100' });
    const res = a().saveDraft('new');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const saved = st().products.find((p) => p.id === res.id)!;
    expect(saved.rows.find((r) => r.id === id)!.insumoId).toBe(insId('Azúcar'));
    a().resetDraft();
    a().loadProductIntoDraft(res.id);
    expect(st().draft.rows.find((r) => r.id === id)!.insumoId).toBe(insId('Azúcar'));
  });

  it('normalize keeps a valid insumoId and drops invalid ones', () => {
    const data = createSeedData();
    const rows = data.draft.rows;
    rows[0].insumoId = 'x'.repeat(100);
    rows[1].insumoId = 'x'.repeat(101);
    rows[2].insumoId = '';
    (rows[3] as unknown as Record<string, unknown>).insumoId = 42;
    delete rows[4].insumoId;
    const back = readBackup(buildBackup(data));
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    const r = back.data.draft.rows;
    expect(r[0].insumoId).toBe('x'.repeat(100));
    for (const i of [1, 2, 3, 4]) expect('insumoId' in r[i]).toBe(false);
  });
});
