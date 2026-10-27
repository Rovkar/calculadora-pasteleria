const LOCALE = 'es-MX';

/**
 * Parses user text. Accepts comma or dot decimals. Empty / invalid -> 0.
 * - Spaces are ignored ("1 000" -> 1000).
 * - When both "," and "." appear, the LAST one is the decimal separator and the other is a thousands
 *   separator ("1,200.50" and "1.200,50" -> 1200.5).
 * - A single "," or "." is a decimal separator ("2,5" -> 2.5). Repeated identical separators are thousands ("1,234,567").
 * - Anything else (letters, exponents such as "1e5", a second sign) is invalid -> 0.
 */
export function parseNum(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v !== 'string') return 0;
  let t = v.replace(/[\s  ]/g, '');
  if (t === '') return 0;
  const lastComma = t.lastIndexOf(',');
  const lastDot = t.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    const dec = Math.max(lastComma, lastDot);
    const thousands = dec === lastComma ? '.' : ',';
    t = t.split(thousands).join('');
    t = t.replace(',', '.');
  } else if (lastComma >= 0) {
    t = t.indexOf(',') === lastComma ? t.replace(',', '.') : t.split(',').join('');
  } else if (lastDot >= 0 && t.indexOf('.') !== lastDot) {
    t = t.split('.').join('');
  }
  if (!/^-?\d*\.?\d*$/.test(t)) return 0;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

const nfCache = new Map<string, Intl.NumberFormat>();
function nf(min: number, max: number): Intl.NumberFormat {
  const key = `${min}-${max}`;
  let f = nfCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: min, maximumFractionDigits: max });
    nfCache.set(key, f);
  }
  return f;
}

function clean(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

/** Generic number: es-MX, between `min` and `max` decimals. */
export function formatNum(n: number, max = 2, min = 0): string {
  const v = clean(n);
  return nf(min, Math.max(min, max)).format(Object.is(v, -0) ? 0 : v);
}

/** Money: currency symbol + es-MX number with fixed decimals (default 2). "-" goes before the symbol. */
export function formatMoney(n: number, moneda: string, decimals = 2): string {
  const v = clean(n);
  const text = nf(decimals, decimals).format(Math.abs(v));
  const isZero = Number(text.replace(/,/g, '')) === 0;
  return `${v < 0 && !isZero ? '-' : ''}${moneda}${text}`;
}

/** Percent: es-MX, up to 1 decimal, followed by " %". */
export function formatPct(n: number): string {
  const v = clean(n);
  return `${nf(0, 1).format(Object.is(v, -0) ? 0 : v)} %`;
}

/** Lowercase, accent-insensitive, trimmed text for searching. */
export function normalizeText(s: string): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
