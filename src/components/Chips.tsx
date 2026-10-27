import './Chips.css';

export interface ChipOption<V extends string | number | boolean = string> {
  value: V;
  label: string;
  ariaLabel?: string;
}

export interface ChipsProps<V extends string | number | boolean = string> {
  /** Group name, visually hidden (rendered as <legend>) */
  legend: string;
  options: ChipOption<V>[];
  /** Currently selected value; pass null/undefined when none matches (e.g. a custom typed margin) */
  value: V | null | undefined;
  onChange: (value: V) => void;
  className?: string;
}

/** Quick-pick chips (e.g. 25 % / 35 % / 50 %). Pill buttons with aria-pressed. */
export default function Chips<V extends string | number | boolean = string>({
  legend,
  options,
  value,
  onChange,
  className,
}: ChipsProps<V>) {
  return (
    <fieldset className={['chips', className ?? ''].filter(Boolean).join(' ')}>
      <legend className="visually-hidden">{legend}</legend>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className="chips__chip"
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
