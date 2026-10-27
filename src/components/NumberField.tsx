import { FieldInput, type BaseFieldProps } from './TextField';

export type NumberFieldProps = BaseFieldProps;

/**
 * Decimal input: type="text" + inputMode="decimal" so phones show a numeric keypad.
 * The value is the raw string; commas and dots are both accepted (see parseNum).
 * Use `prefix` for the currency symbol and `suffix` for a unit ("g", "h", "%").
 * Affixes are aria-hidden, so put the unit in the label too when it matters ("Horas de trabajo").
 */
export default function NumberField(props: NumberFieldProps) {
  return <FieldInput {...props} numeric />;
}
