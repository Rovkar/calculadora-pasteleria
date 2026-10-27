import { useStore, useActions } from '../../store/store';
import Card from '../../components/Card';
import NumberField from '../../components/NumberField';
import { PCT } from '../../components/Pct';
import Segmented from '../../components/Segmented';
import './PriceSettings.css';

export default function PriceSettings() {
  const s = useStore((st) => st.settings);
  const { setSetting } = useActions();
  const m = s.moneda;
  return (
    <Card title="Ajustes de precio" headingLevel={2}>
      <div className="psettings">
        <div className="psettings__group">
          <span className="psettings__label">Costos</span>
          <div className="psettings__row">
            <NumberField label="Tarifa por hora" prefix={m} value={s.tarifa} onChange={(v) => setSetting('tarifa', v)} />
            <NumberField label="Gas por hora de horno" prefix={m} value={s.gasPrecio} onChange={(v) => setSetting('gasPrecio', v)} />
            <NumberField label="Luz por kWh" prefix={m} value={s.luzPrecio} onChange={(v) => setSetting('luzPrecio', v)} />
            <NumberField label="Agua por litro" prefix={m} value={s.aguaPrecio} onChange={(v) => setSetting('aguaPrecio', v)} />
          </div>
          <span className="psettings__note">kWh = watts del equipo × horas de uso ÷ 1000</span>
        </div>
        <div className="psettings__group">
          <span className="psettings__label">Precio</span>
          <div className="psettings__row psettings__row--end">
            <div className="psettings__num">
              <NumberField label={<>Ganancia{PCT}</>} suffix="%" value={s.ganancia} onChange={(v) => setSetting('ganancia', v)} />
            </div>
            <div className="psettings__seg">
              <span className="psettings__seglabel" aria-hidden="true">Ganancia sobre</span>
              <Segmented
                legend="Ganancia calculada sobre"
                value={s.modo}
                onChange={(v) => setSetting('modo', v)}
                options={[
                  { value: 'costo', label: 'Costo' },
                  { value: 'precio', label: 'Precio' },
                ]}
              />
            </div>
            <div className="psettings__seg">
              <span className="psettings__seglabel" aria-hidden="true">Redondeo</span>
              <Segmented
                legend="Redondeo"
                value={s.redondeo}
                onChange={(v) => setSetting('redondeo', v)}
                options={[
                  { value: 0, label: 'Sin redondeo' },
                  { value: 1, label: `${m}1` },
                  { value: 5, label: `${m}5` },
                  { value: 10, label: `${m}10` },
                ]}
              />
            </div>
            <div className="psettings__seg">
              <span className="psettings__seglabel" aria-hidden="true">IVA</span>
              <Segmented
                legend="IVA"
                value={s.ivaOn}
                onChange={(v) => setSetting('ivaOn', v)}
                options={[
                  { value: false, label: 'Sin IVA' },
                  { value: true, label: 'Con IVA' },
                ]}
              />
            </div>
            {s.ivaOn ? (
              <div className="psettings__num psettings__num--iva">
                <NumberField label={<>Tasa de IVA{PCT}</>} suffix="%" value={s.ivaTasa} onChange={(v) => setSetting('ivaTasa', v)} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
