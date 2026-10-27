import { formatMoney, formatPct, parseNum } from '../../lib/format';
import { quickPrice } from '../../lib/pricing';
import { useActions, useStore } from '../../store/store';
import { hrefFor } from '../../app/useHashRoute';
import Card from '../../components/Card';
import NumberField from '../../components/NumberField';
import { PCT } from '../../components/Pct';
import Segmented from '../../components/Segmented';
import Chips from '../../components/Chips';
import BreakdownBar from '../../components/BreakdownBar';
import { breakdownSegments } from '../../components/breakdownSegments';
import './RapidoScreen.css';

export default function RapidoScreen() {
  const quick = useStore((s) => s.quick);
  const moneda = useStore((s) => s.settings.moneda);
  const { setQuickField } = useActions();
  const b = quickPrice(quick);
  const m = (n: number) => formatMoney(n, moneda);
  const gNum = parseNum(quick.ganancia);
  const ivaNum = parseNum(quick.ivaTasa);

  return (
    <div className="rapido">
      <h1>Cálculo rápido</h1>

      <section className="card rapido__result" aria-label="Resultado">
        <span className="rapido__eyebrow">{b.ivaOn ? 'Precio sugerido · IVA incluido' : 'Precio sugerido'}</span>
        <span className="rapido__price num">{m(b.P)}</span>
        <span className="num rapido__line">{m(b.porPorcion)} por porción</span>
        {b.ivaOn ? (
          <span className="num rapido__sub">
            Sin IVA {m(b.base)} · IVA {m(b.iva)}
          </span>
        ) : null}
        <BreakdownBar segments={breakdownSegments(b, moneda)} compact className="rapido__bar" />
      </section>

      <Card title="Tus costos">
        <div className="rapido__stack">
          <NumberField
            size="lg"
            label="Materia prima total"
            prefix={moneda}
            value={quick.mp}
            onChange={(v) => setQuickField('mp', v)}
            helper="Lo que gastaste en ingredientes y empaque."
          />
          <div className="rapido__grid2">
            <NumberField size="lg" label="Horas de trabajo" suffix="h" value={quick.horas} onChange={(v) => setQuickField('horas', v)} />
            <NumberField size="lg" label="Tarifa por hora" prefix={moneda} value={quick.tarifa} onChange={(v) => setQuickField('tarifa', v)} />
          </div>
          <fieldset className="rapido__group">
            <legend className="rapido__legend">Gas, luz y agua</legend>
            <div className="rapido__grid3">
              <NumberField size="lg" label="Gas" prefix={moneda} value={quick.gas} onChange={(v) => setQuickField('gas', v)} />
              <NumberField size="lg" label="Luz" prefix={moneda} value={quick.luz} onChange={(v) => setQuickField('luz', v)} />
              <NumberField size="lg" label="Agua" prefix={moneda} value={quick.agua} onChange={(v) => setQuickField('agua', v)} />
            </div>
            <p className="rapido__helper">Lo que gasta esta receta en cada servicio.</p>
          </fieldset>
          <NumberField size="lg" label="Porciones" value={quick.porciones} onChange={(v) => setQuickField('porciones', v)} />
        </div>
      </Card>

      <Card title="Tu ganancia">
        <div className="rapido__stack">
          <NumberField size="lg" label={<>Ganancia sobre el costo{PCT}</>} suffix="%" value={quick.ganancia} onChange={(v) => setQuickField('ganancia', v)} />
          <Chips
            legend="Ganancias frecuentes"
            options={[25, 35, 50].map((v) => ({ value: v, label: `${v} %` }))}
            value={[25, 35, 50].includes(gNum) ? gNum : null}
            onChange={(v) => setQuickField('ganancia', String(v))}
          />
          <div className="rapido__group">
            <span className="rapido__legend" aria-hidden="true">
              Redondeo
            </span>
            <Segmented<0 | 5 | 10>
              legend="Redondeo"
              fullWidth
              value={quick.redondeo === 5 || quick.redondeo === 10 ? quick.redondeo : 0}
              onChange={(v) => setQuickField('redondeo', v)}
              options={[
                { value: 0, label: 'Sin' },
                { value: 5, label: `${moneda}5` },
                { value: 10, label: `${moneda}10` },
              ]}
            />
          </div>
          <div className="rapido__group">
            <span className="rapido__legend" aria-hidden="true">
              IVA
            </span>
            <Segmented<boolean>
              legend="Cobrar IVA"
              fullWidth
              value={quick.ivaOn}
              onChange={(v) => setQuickField('ivaOn', v)}
              options={[
                { value: false, label: 'Sin IVA' },
                { value: true, label: 'Con IVA' },
              ]}
            />
          </div>
          {quick.ivaOn ? (
            <>
              <NumberField size="lg" label={<>Tasa de IVA{PCT}</>} suffix="%" value={quick.ivaTasa} onChange={(v) => setQuickField('ivaTasa', v)} />
              <Chips
                legend="Tasas de IVA frecuentes"
                options={[8, 16].map((v) => ({ value: v, label: `${v} %` }))}
                value={[8, 16].includes(ivaNum) ? ivaNum : null}
                onChange={(v) => setQuickField('ivaTasa', String(v))}
              />
            </>
          ) : null}
        </div>
      </Card>

      <Card title="Resumen">
        <dl className="rapido__summary">
          <div>
            <dt>Costo total</dt>
            <dd className="num">{m(b.ct)}</dd>
          </div>
          <div>
            <dt>Costo por porción</dt>
            <dd className="num">{m(b.costoPorcion)}</dd>
          </div>
          <div>
            <dt>Ganancia real</dt>
            <dd className="num rapido__accent">{m(b.gananciaReal)}</dd>
          </div>
        </dl>
        <p className="rapido__helper">
          Equivale a {formatPct(b.equivalencia)} {b.equivalenciaKind === 'sobrePrecio' ? 'sobre el precio' : 'sobre el costo'}.
        </p>
      </Card>

      <a className="rapido__link" href={hrefFor('calcular')}>
        Ver desglose completo
      </a>
    </div>
  );
}
