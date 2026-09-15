import { useEffect, useRef } from 'react';
import { useUIStore } from '../../../../services/store/useUIStore';
import { Icon } from '../../../shared/icons/Icon';
import { MENUS } from '../menuConfig';
import { runCommand } from '../commands';
import styles from './MenuBar.module.css';

/**
 * The menu bar. Once a menu is open, hovering the others switches between them
 * without a second click — the behaviour every desktop application has and whose
 * absence is immediately noticeable.
 */
export function MenuBar() {
  const openMenu = useUIStore((s) => s.openMenu);
  const setOpenMenu = useUIStore((s) => s.setOpenMenu);
  const setOverlay = useUIStore((s) => s.setOverlay);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [openMenu, setOpenMenu]);

  return (
    <div className={styles.bar} ref={barRef} role="menubar">
      {MENUS.map((menu) => {
        const open = openMenu === menu.id;
        return (
          <div key={menu.id} className={styles.slot}>
            <button
              type="button"
              className={open ? `${styles.label} ${styles.labelOpen}` : styles.label}
              onClick={() => setOpenMenu(open ? null : menu.id)}
              onMouseEnter={() => openMenu && setOpenMenu(menu.id)}
              aria-haspopup="menu"
              aria-expanded={open}
            >
              {menu.label}
            </button>

            {open && (
              <div className={styles.dropdown} role="menu">
                {menu.items.map((item, i) =>
                  item.sep ? (
                    <div key={`sep${i}`} className={styles.sep} role="separator" />
                  ) : (
                    <button
                      key={item.id ?? i}
                      type="button"
                      className={styles.item}
                      role="menuitem"
                      disabled={item.disabled}
                      onClick={() => {
                        setOpenMenu(null);
                        if (item.id) runCommand(item.id);
                      }}
                    >
                      <span className={styles.itemIcon}>
                        {item.icon && <Icon name={item.icon} size={12} />}
                      </span>
                      <span className={styles.itemLabel}>{item.label}</span>
                      {item.shortcut && <span className={styles.shortcut}>{item.shortcut}</span>}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        );
      })}

      <button type="button" className={styles.palette} onClick={() => setOverlay('palette', true)}>
        <Icon name="find" size={11} />
        <span>Command palette</span>
        <kbd className={styles.kbd}>Ctrl+Shift+P</kbd>
      </button>
    </div>
  );
}
