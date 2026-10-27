import type { ReactNode } from 'react';
import Icon, { type IconName } from './Icon';
import './Notice.css';

export interface NoticeProps {
  tone?: 'info' | 'success' | 'error';
  /** Override the default icon (info / check / info) */
  icon?: IconName;
  /** Optional button(s) on the right */
  action?: ReactNode;
  className?: string;
  /** Set false when an ancestor already is the live region (nested live regions are announced twice). */
  live?: boolean;
  children: ReactNode;
}

/**
 * Status box (role="status", aria-live="polite"). For messages that appear later
 * (e.g. save errors), keep the Notice mounted and change its children so screen readers announce it,
 * or render it right after the user's action.
 */
export default function Notice({ tone = 'info', icon, action, className, live = true, children }: NoticeProps) {
  const iconName: IconName = icon ?? (tone === 'success' ? 'check' : 'info');
  return (
    <div
      className={['notice', `notice--${tone}`, className ?? ''].filter(Boolean).join(' ')}
      role={live ? 'status' : undefined}
      aria-live={live ? 'polite' : undefined}
    >
      <Icon name={iconName} size={20} />
      <div className="notice__text">{children}</div>
      {action ? <div className="notice__action">{action}</div> : null}
    </div>
  );
}
