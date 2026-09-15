import { useCompileStore } from '../../../../services/store/useCompileStore';
import { useLadderStore } from '../../../../services/store/useLadderStore';
import { useProjectStore } from '../../../../services/store/useProjectStore';
import { useUIStore } from '../../../../services/store/useUIStore';
import { ELEMENT_LABEL } from '../../../../core/models/ladderNode';
import styles from './StatusBar.module.css';

/**
 * Status bar.
 *
 * The contextual message on the right is load-bearing: it is where the editor
 * says what a click will do next, and what the last one actually did.
 */
export function StatusBar() {
  const mode = useUIStore((s) => s.mode);
  const statusMsg = useUIStore((s) => s.statusMsg);
  const zoom = useUIStore((s) => s.zoom);
  const board = useProjectStore((s) => s.board);
  const { selection, activeTool, branchArm } = useLadderStore();
  const { building, stage, elapsed } = useCompileStore();

  const position = selection
    ? `Network ${selection.n + 1}, path ${(selection.path ?? []).join('.') || 'root'}`
    : 'No selection';

  const tool = branchArm
    ? 'Branch armed'
    : activeTool
      ? `Placing ${ELEMENT_LABEL[activeTool]}`
      : 'Select';

  const compileState = building
    ? `Building — ${elapsed.toFixed(1)} s (stage ${stage + 1}/5)`
    : 'Build ready · 248 KB';

  return (
    <div className={styles.bar}>
      <span className={styles.cell}>{mode === 'online' ? 'Overwrite' : 'Insert'}</span>
      <span className={styles.sep} />
      <span className={`${styles.cell} ${styles.mono}`}>{position}</span>
      <span className={styles.sep} />
      <span className={styles.cell}>{tool}</span>
      <span className={styles.sep} />

      <span className={`${styles.cell} ${styles.msg}`}>{statusMsg}</span>

      <span className={styles.spacer} />

      <span className={styles.cell}>
        <span className={mode === 'online' ? styles.dotLive : styles.dotIdle} />
        {mode === 'online' ? `Connected — ${board} on COM4` : `${board} — not connected`}
      </span>
      <span className={styles.sep} />
      <span className={mode === 'online' ? styles.run : styles.stop}>
        {mode === 'online' ? 'RUN' : 'STOP'}
      </span>
      <span className={styles.sep} />
      <span className={`${styles.cell} ${styles.mono}`}>
        {mode === 'online' ? 'Scan: 2.4 ms' : 'Scan: —'}
      </span>
      <span className={styles.sep} />
      <span className={`${styles.cell} ${styles.mono}`}>{compileState}</span>
      <span className={styles.sep} />
      <span className={`${styles.cell} ${styles.mono}`}>{Math.round(zoom * 100)}%</span>
    </div>
  );
}
