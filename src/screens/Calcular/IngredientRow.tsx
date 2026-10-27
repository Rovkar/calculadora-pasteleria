import { memo } from 'react';
import Button from '../../components/Button';
import NumberField from '../../components/NumberField';
import Select from '../../components/Select';
import TextField from '../../components/TextField';
import { formatMoney, parseNum } from '../../lib/format';
import { rowCost } from '../../lib/pricing';
import { UNITS, UNIT_INFO } from '../../lib/units';
import type { IngredientRow as Row, Insumo } from '../../store/types';
import { useActions } from '../../store/store';
import './IngredientRow.css';

const UNIT_OPTIONS = UNITS.map((u) => ({ value: u.value, label: u.label }));

interface Props {
  row: Row;
  index: number;
  moneda: string;
  /** Stable callback: the parent decides where focus goes afterwards. */
  onRemove: (id: string) => void;
  /** Opens the insumo picker in replace mode for this row; `opener` gets the focus back if nothing is chosen. */
  onPick: (id: string, opener: HTMLElement) => void;
  /** Linked insumo whose pack, unit or price differ from the row (null when the row is up to date or unlinked). */
  outdatedInsumo: Insumo | null;
  onSync: (id: string) => void;
}

/**
 * One ingredient. The CSS (container query on the card) shows it either as a stacked card or as a table row.
 * In the table the visible column header replaces the label, so every label is also unique per row for screen readers:
 * the row name goes in a visually hidden suffix.
 */
function IngredientRow({ row, index, moneda, onRemove, onPick, outdatedInsumo, onSync }: Props) {
  const { updateRow } = useActions();
  const { cost, incompatible } = rowCost(row);
  const label = row.name.trim() || `ingrediente ${index + 1}`;
  const of = <span className="visually-hidden"> de {label}</span>;
  return (
    <li className="ing-row" data-row-id={row.id}>
      <div className="ing-row__name">
        <TextField
          label={`Nombre del ingrediente ${index + 1}`}
          value={row.name}
          onChange={(v) => updateRow(row.id, { name: v })}
          placeholder="Ej. Harina"
        />
      </div>
      <div className="ing-row__pack">
        <NumberField
          label={<>Presentación{of}</>}
          value={row.pack}
          onChange={(v) => updateRow(row.id, { pack: v })}
        />
      </div>
      <div className="ing-row__packunit">
        <Select
          label={<>Unidad de compra{of}</>}
          value={row.packUnit}
          options={UNIT_OPTIONS}
          onChange={(v) => updateRow(row.id, { packUnit: v })}
        />
      </div>
      <div className="ing-row__price">
        <NumberField
          label={<>Precio de compra{of}</>}
          prefix={moneda}
          value={row.price}
          onChange={(v) => updateRow(row.id, { price: v })}
        />
      </div>
      <div className="ing-row__used">
        <NumberField
          label={<>Cantidad usada{of}</>}
          value={row.used}
          onChange={(v) => updateRow(row.id, { used: v })}
        />
      </div>
      <div className="ing-row__useunit">
        <Select
          label={<>Unidad de uso{of}</>}
          value={row.useUnit}
          options={UNIT_OPTIONS}
          onChange={(v) => updateRow(row.id, { useUnit: v })}
        />
      </div>
      <div className={incompatible ? 'ing-row__cost ing-row__cost--bad' : 'ing-row__cost'}>
        <span className="ing-row__cost-label">Costo</span>
        <span className="num">{incompatible ? 'No compatibles' : formatMoney(cost, moneda)}</span>
      </div>
      <div className="ing-row__pick">
        <Button
          className="ing-row__pickbtn"
          icon="list"
          onClick={(e) => onPick(row.id, e.currentTarget)}
        >
          <span className="ing-row__picktext">Elegir de la lista</span>
          <span className="visually-hidden"> para {label}</span>
        </Button>
      </div>
      <div className="ing-row__remove">
        <Button variant="icon" icon="trash" aria-label={`Quitar ${label}`} onClick={() => onRemove(row.id)} />
      </div>
      {outdatedInsumo ? (
        <div className="ing-row__note">
          <span className="ing-row__note-text">
            En tu lista: {outdatedInsumo.pack} {UNIT_INFO[outdatedInsumo.unit].label} a{' '}
            {formatMoney(parseNum(outdatedInsumo.price), moneda)}
          </span>
          <Button variant="ghost" onClick={() => onSync(row.id)}>
            Usar este precio<span className="visually-hidden"> en {label}</span>
          </Button>
        </div>
      ) : null}
    </li>
  );
}

export default memo(IngredientRow);
