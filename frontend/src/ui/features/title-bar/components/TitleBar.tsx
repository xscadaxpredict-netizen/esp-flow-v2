import { useProjectStore } from '../../../../services/store/useProjectStore';
import { useUIStore } from '../../../../services/store/useUIStore';
import { Icon } from '../../../shared/icons/Icon';
import styles from './TitleBar.module.css';

import type { EditorTab } from '../../../../services/store/useProjectStore';

const SIBLING_APPS = ['SCADA (FUXA)', 'Process Integrator', 'Business Intelligence'];

/** Every tab kind names itself in the title bar — none falls back to "Document". */
const DOC_KIND: Record<EditorTab['kind'], string> = {
  ld: 'Ladder Diagram',
  st: 'Structured Text',
  fb: 'Function Block',
  table: 'Device Monitor Table',
  chart: 'Monitor Chart',
};

/**
 * Window title bar.
 *
 * ESP-Flow runs inside a platform launcher, so this carries the app-switcher and
 * the open document's identity. There is no login here — the user arrives
 * authenticated with a project already open.
 */
export function TitleBar() {
  const { projectName, tabs, activeTab, dirty } = useProjectStore();
  const launcher = useUIStore((s) => s.launcher);
  const setOverlay = useUIStore((s) => s.setOverlay);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  const tab = tabs[activeTab];
  const docKind = tab ? DOC_KIND[tab.kind] : 'Document';

  return (
    <div className={styles.bar}>
      <div className={styles.launcherWrap}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => setOverlay('launcher', !launcher)}
          aria-label="Platform apps"
          aria-expanded={launcher}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2h3v3H2zM6.5 2h3v3h-3zM11 2h3v3h-3zM2 6.5h3v3H2zM6.5 6.5h3v3h-3zM11 6.5h3v3h-3zM2 11h3v3H2zM6.5 11h3v3h-3zM11 11h3v3h-3z" />
          </svg>
        </button>
        {launcher && (
          <div className={styles.launcherMenu}>
            <div className={styles.launcherHead}>Platform apps</div>
            {SIBLING_APPS.map((app) => (
              <button key={app} type="button" className={styles.launcherItem}>
                <Icon name="chip" size={12} />
                {app}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className={styles.wordmark}>ESP-Flow</span>
      <span className={styles.divider} />

      <span className={styles.doc}>
        {projectName} — [{tab?.label ?? 'Untitled'} : {docKind}]
      </span>
      {dirty && <span className={styles.dirty} title="Unsaved changes" />}

      <div className={styles.right}>
        <span className={styles.saveState}>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? (
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <circle cx="8" cy="8" r="3.2" />
              <path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3 3l1.1 1.1M11.9 11.9L13 13M13 3l-1.1 1.1M4.1 11.9L3 13" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M13 9.5A5.6 5.6 0 016.5 3a5.6 5.6 0 106.5 6.5z" />
            </svg>
          )}
        </button>
        <span className={styles.avatar}>RK</span>
      </div>
    </div>
  );
}
