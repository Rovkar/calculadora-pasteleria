import { describe, expect, it } from 'vitest';
import { insumoComplete, linkedInsumo, rowOutOfDate } from './insumoLink';
import type { IngredientRow, Insumo } from '../store/types';

const ins = (id: string, name: string, pack = '1', unit: Insumo['unit'] = 'kg', price = '32'): Insumo => ({ id, name, pack, unit, price });
const row = (over: Partial<IngredientRow> = {}): IngredientRow => ({
  id: 'r1', name: 'Harina', pack: '1', packUnit: 'kg', price: '32', used: '', useUnit: 'g', ...over,
});

describe('linkedInsumo', () => {
  const list = [ins('a', 'Harina de trigo'), ins('b', 'Azúcar'), ins('c', 'azucar')];
  it('prefers insumoId', () => {
    expect(linkedInsumo(row({ insumoId: 'a', name: 'otra cosa' }), list)?.id).toBe('a');
  });
  it('falls back to a unique normalized name', () => {
    expect(linkedInsumo(row({ name: ' HARINA DE TRIGO ' }), list)?.id).toBe('a');
  });
  it('returns null when ambiguous, unknown or blank', () => {
    expect(linkedInsumo(row({ name: 'Azúcar' }), list)).toBeNull();
    expect(linkedInsumo(row({ name: 'Sal' }), list)).toBeNull();
    expect(linkedInsumo(row({ name: '' }), list)).toBeNull();
    expect(linkedInsumo(row({ insumoId: 'zzz', name: 'Sal' }), list)).toBeNull();
  });
});

describe('rowOutOfDate', () => {
  it('compares numbers, not strings', () => {
    expect(rowOutOfDate(row({ price: '32.00', pack: '1.0' }), ins('a', 'x'))).toBe(false);
    expect(rowOutOfDate(row({ price: '33' }), ins('a', 'x'))).toBe(true);
    expect(rowOutOfDate(row({ pack: '2' }), ins('a', 'x'))).toBe(true);
    expect(rowOutOfDate(row({ packUnit: 'g' }), ins('a', 'x'))).toBe(true);
  });
});

describe('insumoComplete', () => {
  it('requires a positive presentación and price', () => {
    expect(insumoComplete(ins('a', 'x'))).toBe(true);
    expect(insumoComplete(ins('a', 'x', '', 'kg', '32'))).toBe(false);
    expect(insumoComplete(ins('a', 'x', '1', 'kg', ''))).toBe(false);
  });
});
