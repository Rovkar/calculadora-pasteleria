import type { ReactNode } from 'react';
import Icon, { type IconName } from './Icon';
import './EmptyState.css';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  children?: ReactNode;
  /** Usually a primary Button */
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({ icon = 'cake', title, children, action, className }: EmptyStateProps) {
  return (
    <div className={['empty', className ?? ''].filter(Boolean).join(' ')}>
      <span className="empty__icon">
        <Icon name={icon} size={28} />
      </span>
      <h2 className="empty__title">{title}</h2>
      {children ? <p className="empty__text">{children}</p> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}
