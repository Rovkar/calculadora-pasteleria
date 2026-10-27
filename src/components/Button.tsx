import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Icon, { type IconName } from './Icon';
import './Button.css';

type CommonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children'> & {
  type?: 'button' | 'submit' | 'reset';
  size?: 'md' | 'lg';
  fullWidth?: boolean;
  /** Icon shown before the text (or alone for variant "icon") */
  icon?: IconName;
};

export type ButtonProps =
  | (CommonProps & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; children: ReactNode })
  // Icon-only buttons MUST have an accessible name.
  | (CommonProps & { variant: 'icon'; 'aria-label': string; icon: IconName; children?: never });

export default function Button(props: ButtonProps) {
  const {
    variant = 'secondary',
    size = 'md',
    fullWidth,
    icon,
    type = 'button',
    className,
    children,
    ...rest
  } = props as CommonProps & { variant?: string; children?: ReactNode };
  const cls = ['btn', `btn--${variant}`, size === 'lg' ? 'btn--lg' : '', fullWidth ? 'btn--full' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={cls} {...rest}>
      {icon ? <Icon name={icon} size={variant === 'icon' ? 22 : 18} /> : null}
      {children}
    </button>
  );
}
