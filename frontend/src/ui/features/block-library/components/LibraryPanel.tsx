import { LIBRARY } from '../../../../core/data/blockLibrary';
import { FUNCTION_BLOCKS_ENABLED, FUNCTION_BLOCKS_UNAVAILABLE } from '../../../../core/features';
import { useProjectStore } from '../../../../services/store/useProjectStore';
import { useUIStore } from '../../../../services/store/useUIStore';
import { Panel, PanelBody, PanelHeader } from '../../../shared/components/Panel';
import { Icon } from '../../../shared/icons/Icon';
import styles from './LibraryPanel.module.css';

/**
 * The block catalogue, in three groups.
 *
 * Every item here is a function block, and function blocks are switched off
 * while they are redesigned — see core/features.ts. Items were draggable, but
 * the canvas never had a drop handler, so a drag promised a placement that
 * could not happen. With the switch off they cannot be dragged, and a click
 * says why. The catalogue stays visible because it is part of the design.
 */
export function LibraryPanel() {
  const libOpen = useUIStore((s) => s.libOpen);
  const toggle = useUIStore((s) => s.toggle);
  const setStatus = useUIStore((s) => s.setStatus);
  const { libExpanded, toggleLibGroup } = useProjectStore();

  return (
    <Panel>
      <PanelHeader title="LIBRARY" collapsed={!libOpen} onToggle={() => toggle('libOpen')} />
      {libOpen && (
        <PanelBody>
          {LIBRARY.map((group) => {
            const open = libExpanded[group.id];
            return (
              <div key={group.id}>
                <button
                  type="button"
                  className={styles.group}
                  onClick={() => toggleLibGroup(group.id)}
                  aria-expanded={open}
                >
                  <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={open ? 'M3 6l5 5 5-5' : 'M5 3l5 5-5 5'} />
                  </svg>
                  <span className={styles.groupIcon}>
                    <Icon name="folder" size={12} strokeWidth={1.3} />
                  </span>
                  <span className={styles.groupLabel}>{group.label}</span>
                  <span className={styles.count}>{group.items.length}</span>
                </button>

                {open &&
                  group.items.map((item) => (
                    <div
                      key={item.label}
                      className={
                        FUNCTION_BLOCKS_ENABLED ? styles.item : `${styles.item} ${styles.unavailable}`
                      }
                      draggable={FUNCTION_BLOCKS_ENABLED}
                      aria-disabled={!FUNCTION_BLOCKS_ENABLED || undefined}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', item.label);
                        e.dataTransfer.effectAllowed = 'copy';
                        setStatus(`Dragging ${item.label} — drop it on a rung`);
                      }}
                      onDragEnd={() => setStatus('Ready')}
                      onClick={() => {
                        if (!FUNCTION_BLOCKS_ENABLED) setStatus(FUNCTION_BLOCKS_UNAVAILABLE);
                      }}
                      title={
                        FUNCTION_BLOCKS_ENABLED
                          ? `${item.label} — ${item.tag}`
                          : `${item.label} — ${item.tag}. ${FUNCTION_BLOCKS_UNAVAILABLE}`
                      }
                    >
                      <span className={group.id === 'esp' ? styles.itemIconEsp : styles.itemIcon}>
                        <Icon name="fb" size={12} strokeWidth={1.3} />
                      </span>
                      <span className={styles.itemLabel}>{item.label}</span>
                      <span className={styles.tag}>{item.tag}</span>
                    </div>
                  ))}
              </div>
            );
          })}
        </PanelBody>
      )}
    </Panel>
  );
}
