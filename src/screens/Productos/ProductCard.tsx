import { priceProduct } from '../../lib/pricing';
import { formatMoney, formatNum, parseNum } from '../../lib/format';
import type { Product, Settings } from '../../store/types';
import { confirmDiscardDraft } from '../../store/draftGuard';
import { useActions } from '../../store/store';
import { navigate } from '../../app/useHashRoute';
import Button from '../../components/Button';
import BreakdownBar from '../../components/BreakdownBar';
import { breakdownSegments } from '../../components/breakdownSegments';
import './ProductCard.css';

export default function ProductCard({ product, settings, isSaved }: { product: Product; settings: Settings; isSaved: boolean }) {
  const { loadProductIntoDraft, deleteProduct } = useActions();
  const b = priceProduct(product, settings);
  const m = settings.moneda;
  const rinde = b.porciones === 1 ? 'Rinde 1 porción' : `Rinde ${formatNum(b.porciones)} porciones`;
  const meta = `${rinde} · ${formatNum(parseNum(product.horas))} h de trabajo · ${formatNum(parseNum(product.gasHoras))} h de horno`;

  const edit = () => {
    if (!confirmDiscardDraft()) return;
    loadProductIntoDraft(product.id);
    navigate('calcular');
  };
  const remove = () => {
    if (window.confirm(`¿Eliminar «${product.name}»? No se puede deshacer.`)) deleteProduct(product.id);
  };

  return (
    <article className={['pcard', isSaved ? 'pcard--saved' : ''].filter(Boolean).join(' ')}>
      <div className="pcard__head">
        <div className="pcard__titlerow">
          <h2 className="pcard__name">{product.name || 'Sin nombre'}</h2>
          {product.sample ? <span className="pcard__chip">Ejemplo</span> : null}
          {isSaved ? <span className="pcard__chip pcard__chip--accent">Guardado</span> : null}
        </div>
        <span className="pcard__meta">{meta}</span>
      </div>
      <div className="pcard__price">
        <span className="pcard__big num">{formatMoney(b.P, m)}</span>
        <span className="pcard__sub num">{formatMoney(b.porPorcion, m)} por porción</span>
        {b.ivaOn ? (
          <span className="pcard__sub num">
            Sin IVA {formatMoney(b.base, m)} · IVA {formatMoney(b.iva, m)}
          </span>
        ) : null}
      </div>
      <BreakdownBar segments={breakdownSegments(b, m)} showLegend={false} compact />
      <dl className="pcard__rows">
        <div>
          <dt>Costo total</dt>
          <dd className="num">{formatMoney(b.ct, m)}</dd>
        </div>
        <div>
          <dt>Ganancia</dt>
          <dd className="num pcard__strong">{formatMoney(b.gananciaReal, m)}</dd>
        </div>
      </dl>
      <div className="pcard__actions">
        <Button onClick={edit}>Ver y editar</Button>
        <Button variant="icon" icon="trash" aria-label={`Eliminar ${product.name}`} onClick={remove} />
      </div>
    </article>
  );
}
