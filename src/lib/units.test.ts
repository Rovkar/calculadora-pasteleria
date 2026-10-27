import { describe, expect, it } from 'vitest';
import { UNITS, UNIT_INFO, baseUnit, factorOf, isUnit, sameDimension } from './units';

describe('units', () => {
  it('has the six units with the right factors', () => {
    expect(UNITS.map((u) => u.value)).toEqual(['g', 'kg', 'ml', 'l', 'gal', 'pza']);
    expect(factorOf('g')).toBe(1);
    expect(factorOf('kg')).toBe(1000);
    expect(factorOf('ml')).toBe(1);
    expect(factorOf('l')).toBe(1000);
    expect(factorOf('gal')).toBe(3785.41);
    expect(factorOf('pza')).toBe(1);
  });
  it('knows dimensions', () => {
    expect(UNIT_INFO.kg.dim).toBe('masa');
    expect(UNIT_INFO.gal.dim).toBe('volumen');
    expect(UNIT_INFO.pza.dim).toBe('piezas');
    expect(sameDimension('g', 'kg')).toBe(true);
    expect(sameDimension('l', 'gal')).toBe(true);
    expect(sameDimension('g', 'ml')).toBe(false);
    expect(sameDimension('pza', 'g')).toBe(false);
  });
  it('base unit per dimension', () => {
    expect(baseUnit('masa')).toBe('g');
    expect(baseUnit('volumen')).toBe('ml');
    expect(baseUnit('piezas')).toBe('pza');
  });
  it('validates unit strings', () => {
    expect(isUnit('kg')).toBe(true);
    expect(isUnit('oz')).toBe(false);
    expect(isUnit(undefined)).toBe(false);
    expect(isUnit('toString')).toBe(false);
  });
});
