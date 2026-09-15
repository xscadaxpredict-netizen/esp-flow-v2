import { useLadderStore } from '../../../../services/store/useLadderStore';
import { useProjectStore } from '../../../../services/store/useProjectStore';
import { useUIStore } from '../../../../services/store/useUIStore';
import { ELEMENT_LABEL } from '../../../../core/models/ladderNode';
import styles from './Breadcrumb.module.css';

/**
 * Breadcrumb and mode strip — where the editor tells you where you are and what
 * the next click will do.
 */
export function Breadcrumb() {
  const mode = useUIStore((s) => s.mode);
  const { tabs, activeTab } = useProjectStore();
  const { selection, activeTool, branchArm } = useLadderStore();

  const tab = tabs[activeTab];
  const network = selection ? `Network ${selection.n + 1}` : '—';

  const hint = branchArm
    ? 'Click an element to branch from it'
    : activeTool
      ? `Click a rung position to place a ${ELEMENT_LABEL[activeTool]}`
      : 'Click an element to select it';

  return (
    <div className={styles.strip}>
      <nav className={styles.crumbs} aria-label="Location">
        <span className={styles.crumb}>Project</span>
        <span className={styles.chev}>/</span>
        <span className={styles.crumb}>Programs</span>
        <span className={styles.chev}>/</span>
        <span className={styles.crumb}>{tab?.label ?? '—'}</span>
        <span className={styles.chev}>/</span>
        <span className={styles.crumbCurrent}>{network}</span>
      </nav>

      <span className={styles.hint}>{hint}</span>

      <span className={mode === 'online' ? styles.chipOnline : styles.chipEdit}>
        {mode === 'online' ? 'ONLINE MONITOR' : 'OFFLINE EDIT'}
      </span>
    </div>
  );
}
