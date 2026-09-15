import { useProjectStore } from '../../../../services/store/useProjectStore';
import { useUIStore } from '../../../../services/store/useUIStore';
import styles from './SymbolsTable.module.css';

const COLUMNS = ['Class', 'Identifier', 'Address', 'Data Type', 'Initial', 'Comment'] as const;

/**
 * Local symbols — the POU's variable declarations, docked directly under the
 * breadcrumb and above the canvas.
 *
 * This table is the single source for every symbol picker in the editor. A row
 * with an address is a located variable; one without is unlocated and the
 * compiler places it. The header stays visible when the table is collapsed, so
 * the declaration count is always on screen.
 */
export function SymbolsTable() {
  const symOpen = useUIStore((s) => s.symOpen);
  const symH = useUIStore((s) => s.symH);
  const toggle = useUIStore((s) => s.toggle);
  const setStatus = useUIStore((s) => s.setStatus);
  const symbols = useProjectStore((s) => s.symbols);
  const { tabs, activeTab } = useProjectStore();
  const pou = tabs[activeTab]?.label ?? 'Prog0';

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <button
          type="button"
          className={styles.headMain}
          onClick={() => toggle('symOpen')}
          aria-expanded={symOpen}
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={symOpen ? 'M3 6l5 5 5-5' : 'M5 3l5 5-5 5'} />
          </svg>
          <span className={styles.title}>Local Symbols</span>
          <span className={styles.meta}>
            {pou} · {symbols.length} declared
          </span>
        </button>
        <button
          type="button"
          className={styles.action}
          onClick={() => setStatus('Declaring symbols needs the backend — not wired up yet')}
        >
          + New symbol
        </button>
      </div>

      {symOpen && (
        <div className={styles.scroll} style={{ height: symH }}>
          <table className={styles.table}>
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c} className={styles.th}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {symbols.map((s) => (
                <tr key={s.name} className={styles.tr}>
                  <td className={`${styles.td} ${styles.cls}`}>{s.cls}</td>
                  <td className={styles.td}>{s.name}</td>
                  <td className={`${styles.td} ${styles.mono}`}>{s.addr || '—'}</td>
                  <td className={`${styles.td} ${styles.mono}`}>{s.type}</td>
                  <td className={`${styles.td} ${styles.mono}`}>{s.init || '—'}</td>
                  <td className={`${styles.td} ${styles.cmt}`}>{s.cmt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
