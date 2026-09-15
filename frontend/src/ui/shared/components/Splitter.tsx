import styles from './Splitter.module.css';

interface SplitterProps {
  orientation: 'vertical' | 'horizontal';
  onMouseDown: (e: React.MouseEvent) => void;
  title?: string;
  /** Show the dotted grab indicator, as the symbol-table splitter does. */
  grip?: boolean;
}

/**
 * A grab strip between two panels. Quiet until you reach for it, then it takes
 * the accent — chrome that announces itself constantly is chrome in the way.
 */
export function Splitter({ orientation, onMouseDown, title, grip }: SplitterProps) {
  const base = orientation === 'vertical' ? styles.vertical : styles.horizontal;
  return (
    <div
      className={grip ? `${base} ${styles.gripped}` : base}
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation={orientation}
      title={title}
    >
      {grip && <span className={styles.grip} />}
    </div>
  );
}
