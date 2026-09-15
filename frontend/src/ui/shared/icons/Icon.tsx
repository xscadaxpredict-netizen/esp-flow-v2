import { ICON_PATHS, type IconName } from './paths';

interface IconProps {
  name: IconName;
  /** Rendered size in px. The viewBox is always 16x16. */
  size?: number;
  /** 1.4 for dense chrome, 1.5 where an icon stands alone. */
  strokeWidth?: number;
  className?: string;
}

/**
 * Renders one catalogue icon. Colour comes from `currentColor`, so an icon
 * always matches the text it sits beside — callers style the parent, not the svg.
 */
export function Icon({ name, size = 16, strokeWidth = 1.4, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

export type { IconName };
