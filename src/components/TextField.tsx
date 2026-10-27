import { useId, type ReactNode, type Ref } from 'react';
import './Field.css';

export interface BaseFieldProps {
  /** Always rendered as a real <label>. */
  label: ReactNode;
  /** Visually hide the label (still read by screen readers). Use only in dense rows. */
  hideLabel?: boolean;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Text before the input, e.g. the currency symbol */
  prefix?: ReactNode;
  /** Text after the input, e.g. a unit */
  suffix?: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  placeholder?: string;
  /** 'lg' = bigger input for phones / hero fields */
  size?: 'md' | 'lg';
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  autoFocus?: boolean;
  maxLength?: number;
}

interface InternalProps extends BaseFieldProps {
  numeric?: boolean;
}

export default function TextField(props: BaseFieldProps) {
  return <FieldInput {...props} />;
}

export function FieldInput({
  label,
  hideLabel,
  value,
  onChange,
  onBlur,
  prefix,
  suffix,
  helper,
  error,
  placeholder,
  size = 'md',
  disabled,
  name,
  id,
  className,
  inputRef,
  autoFocus,
  maxLength,
  numeric,
}: InternalProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const describedBy = [helper ? helperId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={['field', size === 'lg' ? 'field--lg' : '', className ?? ''].filter(Boolean).join(' ')}>
      <label htmlFor={inputId} className={hideLabel ? 'field__label visually-hidden' : 'field__label'}>
        {label}
      </label>
      <div className={['field__control', error ? 'field__control--error' : '', disabled ? 'field__control--disabled' : ''].filter(Boolean).join(' ')}>
        {prefix ? <span className="field__affix" aria-hidden="true">{prefix}</span> : null}
        <input
          id={inputId}
          ref={inputRef}
          name={name}
          className={numeric ? 'field__input num' : 'field__input'}
          type="text"
          inputMode={numeric ? 'decimal' : undefined}
          autoComplete="off"
          autoCapitalize={numeric ? 'off' : undefined}
          spellCheck={numeric ? false : undefined}
          enterKeyHint={numeric ? 'done' : undefined}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
        {suffix ? <span className="field__affix field__affix--end" aria-hidden="true">{suffix}</span> : null}
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
