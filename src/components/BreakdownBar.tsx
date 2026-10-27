import { formatPct } from '../lib/format';
import './BreakdownBar.css';

export interface BreakdownSegment {
  key: string;
  label: string;
  /** Already formatted money, e.g. "$193.05" */
  amount: string;
  /** Share of the final price, 0..100 */
  share: number;
  /** CSS color or var(--c-mp) etc. */
  color: string;
  /** Border color of the swatch/bar segment when the fill is light */
  swatchBorder?: string;
}

export interface BreakdownBarProps {
  segments: BreakdownSegment[];
  /** Show the legend list (label + amount + percent). Default true. */
  showLegend?: boolean;
  /** Thinner bar and tighter legend (lists, phones) */
  compact?: boolean;
  className?: string;
}

/**
 * Stacked bar of where the price goes. The bar itself is decorative (aria-hidden);
 * the legend carries the same information as text for assistive tech.
 */
export default function BreakdownBar({ segments, showLegend = true, compact, className }: BreakdownBarProps) {
  return (
    <div className={['breakdown', compact ? 'breakdown--compact' : '', className ?? ''].filter(Boolean).join(' ')}>
      <div className="breakdown__bar" aria-hidden="true">
        {segments.map((s) =>
          s.share > 0 ? (
            <span
              key={s.key}
              className="breakdown__seg"
              style={{ width: `${Math.min(100, s.share)}%`, background: s.color }}
            />
          ) : null,
        )}
      </div>
      {showLegend ? (
        <ul className="breakdown__legend">
          {segments.map((s) => (
            <li key={s.key} className="breakdown__item">
              <span
                className="breakdown__swatch"
                style={{ background: s.color, borderColor: s.swatchBorder ?? s.color }}
                aria-hidden="true"
              />
              <span className="breakdown__label">{s.label}</span>
              <span className="breakdown__amount num">{s.amount}</span>
              <span className="breakdown__pct num">{formatPct(s.share)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
