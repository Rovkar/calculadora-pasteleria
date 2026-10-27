import './Segmented.css';

export interface SegmentedOption<V extends string | number | boolean = string> {
  value: V;
  label: string;
  /** Optional longer accessible name for the button */
  ariaLabel?: string;
}

export interface SegmentedProps<V extends string | number | boolean = string> {
  /** Group name, visually hidden but read by screen readers (rendered as <legend>) */
  legend: string;
  options: SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  fullWidth?: boolean;
  className?: string;
}

/** Segmented toggle: fieldset + hidden legend + aria-pressed buttons. */
export default function Segmented<V extends string | number | boolean = string>({
  legend,
  options,
  value,
  onChange,
  fullWidth,
  className,
}: SegmentedProps<V>) {
  return (
    <fieldset className={['segmented', fullWidth ? 'segmented--full' : '', className ?? ''].filter(Boolean).join(' ')}>
      <legend className="visually-hidden">{legend}</legend>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className="segmented__btn"
          aria-pressed={o.value === value}
          aria-label={o.ariaLabel}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </fieldset>
  );
}
