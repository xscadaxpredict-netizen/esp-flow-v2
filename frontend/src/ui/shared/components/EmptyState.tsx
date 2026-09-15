import { Icon, type IconName } from '../icons/Icon';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  detail: string;
}

/**
 * Used where the design handoff explicitly scoped a surface out. It says what is
 * missing rather than pretending the tab is broken — nothing here is invented
 * beyond what was designed.
 */
export function EmptyState({ icon, title, detail }: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
      <span className={styles.icon}>
        <Icon name={icon} size={22} strokeWidth={1.2} />
      </span>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.detail}>{detail}</p>
    </div>
  );
}
