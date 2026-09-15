import { useProjectStore, type EditorTab } from '../../../../services/store/useProjectStore';
import { Icon, type IconName } from '../../../shared/icons/Icon';
import styles from './EditorTabs.module.css';

/** Tab icon follows the document kind — the mapping belongs here, not in the store. */
const ICON_FOR: Record<EditorTab['kind'], IconName> = {
  ld: 'ld',
  st: 'st',
  fb: 'fb',
  table: 'table',
  chart: 'mon',
};

const KIND_LABEL: Record<EditorTab['kind'], string> = {
  ld: 'Ladder',
  st: 'ST',
  fb: 'FB',
  table: '',
  chart: '',
};

export function EditorTabs() {
  const { tabs, activeTab, setActiveTab, closeTab } = useProjectStore();

  return (
    <div className={styles.strip} role="tablist">
      {tabs.map((tab, i) => {
        const active = i === activeTab;
        const kind = KIND_LABEL[tab.kind];
        return (
          <div key={tab.id} className={active ? `${styles.tab} ${styles.tabActive}` : styles.tab}>
            <button
              type="button"
              className={styles.tabMain}
              onClick={() => setActiveTab(i)}
              role="tab"
              aria-selected={active}
            >
              <Icon name={ICON_FOR[tab.kind]} size={11} strokeWidth={1.3} />
              <span className={styles.label}>
                {tab.label}
                {kind && <span className={styles.kind}> [{kind}]</span>}
              </span>
              {tab.dirty && <span className={styles.dot} title="Unsaved changes" />}
            </button>
            <button
              type="button"
              className={styles.close}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(i);
              }}
              aria-label={`Close ${tab.label}`}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path d="M1 1l6 6M7 1L1 7" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
