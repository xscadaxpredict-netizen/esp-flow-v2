import { useEffect } from 'react';
import { useUIStore } from '../../../services/store/useUIStore';
import styles from './ContextMenu.module.css';

const ITEMS = ['New POU', 'Rename', 'Delete', 'Properties'];

/** Right-click menu for the project tree. */
export function ContextMenu() {
  const ctxMenu = useUIStore((s) => s.ctxMenu);
  const setCtxMenu = useUIStore((s) => s.setCtxMenu);
  const setStatus = useUIStore((s) => s.setStatus);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('mousedown', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('blur', close);
    };
  }, [ctxMenu, setCtxMenu]);

  if (!ctxMenu) return null;

  return (
    <div
      className={styles.menu}
      style={{ left: ctxMenu.x, top: ctxMenu.y }}
      onMouseDown={(e) => e.stopPropagation()}
      role="menu"
    >
      {ITEMS.map((label) => (
        <button
          key={label}
          type="button"
          className={styles.item}
          role="menuitem"
          onClick={() => {
            setCtxMenu(null);
            setStatus(`${label} — not implemented yet in this build`);
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
