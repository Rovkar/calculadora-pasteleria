import { describe, expect, it } from 'vitest';
import { backupFileName, buildBackup, readBackup } from './backup';
import { createSeedData } from '../../store/seeds';

describe('backup', () => {
  it('round-trips a valid file', () => {
    const seeds = createSeedData();
    const r = readBackup(buildBackup(seeds));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.products).toHaveLength(seeds.products.length);
      expect(r.data.insumos).toHaveLength(seeds.insumos.length);
    }
  });
  it('rejects a wrong app', () => {
    expect(readBackup(JSON.stringify({ app: 'otra', version: 1, data: {} })).ok).toBe(false);
  });
  it('rejects broken JSON without throwing', () => {
    expect(readBackup('{no es json').ok).toBe(false);
    expect(readBackup('').ok).toBe(false);
  });
  it('rejects incomplete data instead of filling it with the samples', () => {
    const wrap = (data: unknown) => JSON.stringify({ app: 'calculadora-pasteleria', version: 1, data });
    expect(readBackup(wrap({ insumos: [] })).ok).toBe(false);
    expect(readBackup(wrap({})).ok).toBe(false);
    expect(readBackup(wrap({ products: [], insumos: [] })).ok).toBe(false);
    expect(readBackup(wrap({ products: [], insumos: [], settings: {} })).ok).toBe(true);
  });
  it('rejects a newer version and oversized files', () => {
    const data = { products: [], insumos: [], settings: {} };
    expect(readBackup(JSON.stringify({ app: 'calculadora-pasteleria', version: 2, data })).ok).toBe(false);
    expect(readBackup(' '.repeat(6 * 1024 * 1024)).ok).toBe(false);
  });
  it('rejects missing data', () => {
    expect(readBackup(JSON.stringify({ app: 'calculadora-pasteleria', version: 1 })).ok).toBe(false);
  });
  it('names the file by date', () => {
    expect(backupFileName(new Date(2026, 0, 5))).toBe('respaldo-precios-2026-01-05.json');
    expect(backupFileName(new Date(2026, 0, 5), 'respaldo-previo')).toBe('respaldo-previo-2026-01-05.json');
  });
});
