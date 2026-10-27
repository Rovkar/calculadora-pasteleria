import type { ReactNode } from 'react';

export type IconName =
  | 'cake'
  | 'calc'
  | 'list'
  | 'box'
  | 'bolt'
  | 'gear'
  | 'plus'
  | 'trash'
  | 'check'
  | 'chevronLeft'
  | 'chevronRight'
  | 'search'
  | 'edit'
  | 'download'
  | 'upload'
  | 'share'
  | 'info'
  | 'x';

const PATHS: Record<IconName, ReactNode> = {
  cake: (
    <>
      <path d="M4 20h16" />
      <path d="M5 20v-7h14v7" />
      <path d="M5 16c1.6 1 3 1 4.6 0s3.2-1 4.8 0 3 1 4.6 0" />
      <path d="M12 13V9" />
      <path d="M12 6.6c.8 0 1.3-.6 1.3-1.3 0-.9-1.3-2.3-1.3-2.3s-1.3 1.4-1.3 2.3c0 .7.5 1.3 1.3 1.3z" />
    </>
  ),
  calc: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8" />
      <path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
    </>
  ),
  list: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
    </>
  ),
  box: (
    <>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </>
  ),
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="6.5" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 12h10l1-12" />
      <path d="M9 7V4h6v3" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  chevronLeft: <path d="M15 5l-7 7 7 7" />,
  chevronRight: <path d="M9 5l7 7-7 7" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11" />
      <path d="M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V5" />
      <path d="M7 9l5-5 5 5" />
      <path d="M5 20h14" />
    </>
  ),
  share: (
    <>
      <path d="M12 15V4" />
      <path d="M8 8l4-4 4 4" />
      <path d="M6 12v8h12v-8" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
};

export interface IconProps {
  name: IconName;
  /** px, default 20 */
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/** Decorative inline icon (aria-hidden). Put the accessible name on the parent button/link. */
export default function Icon({ name, size = 20, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ flex: 'none' }}
    >
      {PATHS[name]}
    </svg>
  );
}
