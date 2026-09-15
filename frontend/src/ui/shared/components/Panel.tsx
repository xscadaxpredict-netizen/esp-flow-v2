import type { ReactNode } from 'react';
import { Icon, type IconName } from '../icons/Icon';
import styles from './Panel.module.css';

interface PanelHeaderProps {
  title: string;
  icon?: IconName;
  /** Small count or state chip rendered at the right. */
  tag?: string;
  collapsed?: boolean;
  onToggle?: () => void;
  actions?: ReactNode;
}

export function PanelHeader({ title, icon, tag, collapsed, onToggle, actions }: PanelHeaderProps) {
  const Wrapper = onToggle ? 'button' : 'div';
  return (
    <div className={styles.header}>
      <Wrapper
        className={styles.headerMain}
        onClick={onToggle}
        {...(onToggle ? { type: 'button' as const, 'aria-expanded': !collapsed } : {})}
      >
        {onToggle && (
          <svg className={styles.chev} width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={collapsed ? 'M5 3l5 5-5 5' : 'M3 6l5 5 5-5'} />
          </svg>
        )}
        {icon && <Icon name={icon} size={12} />}
        <span className={styles.title}>{title}</span>
      </Wrapper>
      {tag && <span className={styles.tag}>{tag}</span>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}

interface PanelProps {
  children: ReactNode;
  className?: string;
}

export function Panel({ children, className }: PanelProps) {
  return <div className={`${styles.panel}${className ? ` ${className}` : ''}`}>{children}</div>;
}

export function PanelBody({ children, className }: PanelProps) {
  return <div className={`${styles.body}${className ? ` ${className}` : ''}`}>{children}</div>;
}
