import { useId, type ReactNode, type Ref } from 'react';
import './Field.css';

export interface SelectOption<V extends string = string> {
  value: V;
  label: string;
}

export interface SelectProps<V extends string = string> {
  label: ReactNode;
  hideLabel?: boolean;
  value: V;
  onChange: (value: V) => void;
  options: SelectOption<V>[];
  helper?: ReactNode;
  error?: ReactNode;
  size?: 'md' | 'lg';
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  selectRef?: Ref<HTMLSelectElement>;
}

/** Labelled native <select> (best picker UX on phones). */
export default function Select<V extends string = string>({
  label,
  hideLabel,
  value,
  onChange,
  options,
  helper,
  error,
  size = 'md',
  disabled,
  name,
  id,
  className,
  selectRef,
}: SelectProps<V>) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const helperId = `${selectId}-helper`;
  const errorId = `${selectId}-error`;
  const describedBy = [helper ? helperId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={['field', size === 'lg' ? 'field--lg' : '', className ?? ''].filter(Boolean).join(' ')}>
      <label htmlFor={selectId} className={hideLabel ? 'field__label visually-hidden' : 'field__label'}>
        {label}
      </label>
      <div className="field__select-wrap">
        <select
          id={selectId}
          ref={selectRef}
          name={name}
          className={error ? 'field__select field__select--error' : 'field__select'}
          value={value}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value as V)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {helper ? (
        <p id={helperId} className="field__helper">
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="field__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
