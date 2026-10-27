import type { Breakdown } from '../lib/pricing';
import { formatMoney } from '../lib/format';
import type { BreakdownSegment } from './BreakdownBar';

/**
 * The standard segments for BreakdownBar: Materia prima, Mano de obra, Gas luz y agua,
 * Ganancia and (only when IVA is on) IVA. Use this everywhere so colors/labels stay identical.
 */
export function breakdownSegments(b: Breakdown, moneda: string): BreakdownSegment[] {
  const segs: BreakdownSegment[] = [
    { key: 'mp', label: 'Materia prima', amount: formatMoney(b.mp, moneda), share: b.shares.mp, color: 'var(--c-mp)' },
    { key: 'mo', label: 'Mano de obra', amount: formatMoney(b.mo, moneda), share: b.shares.mo, color: 'var(--c-mo)' },
    {
      key: 'gi',
      label: 'Gas, luz y agua',
      amount: formatMoney(b.gi, moneda),
      share: b.shares.gi,
      color: 'var(--c-gi)',
      swatchBorder: 'var(--c-gi-border)',
    },
    {
      key: 'ganancia',
      label: 'Ganancia',
      amount: formatMoney(b.gananciaReal, moneda),
      share: b.shares.ganancia,
      color: 'var(--c-ganancia)',
    },
  ];
  if (b.ivaOn) {
    segs.push({ key: 'iva', label: 'IVA', amount: formatMoney(b.iva, moneda), share: b.shares.iva, color: 'var(--c-iva)' });
  }
  return segs;
}
