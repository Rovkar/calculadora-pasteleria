import { useId, type ReactNode } from 'react';
import './Card.css';

export interface CardProps {
  /** Rendered as an h2 (use headingLevel to change) */
  title?: ReactNode;
  helper?: ReactNode;
  /** Right-aligned content of the header (buttons, totals...) */
  headerRight?: ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
  children?: ReactNode;
}

export default function Card({ title, helper, headerRight, headingLevel = 2, className, children }: CardProps) {
  const titleId = useId();
  const Heading = `h${headingLevel}` as 'h2' | 'h3';
  const hasHeader = title || helper || headerRight;
  return (
    <section className={['card', className ?? ''].filter(Boolean).join(' ')} aria-labelledby={title ? titleId : undefined}>
      {hasHeader ? (
        <header className="card__header">
          <div className="card__heading">
            {title ? (
              <Heading id={titleId} className="card__title">
                {title}
              </Heading>
            ) : null}
            {helper ? <p className="card__helper">{helper}</p> : null}
          </div>
          {headerRight ? <div className="card__right">{headerRight}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
