import { useEffect, useMemo, useRef, useState } from 'react';
import { useUIStore } from '../../../../services/store/useUIStore';
import { Icon } from '../../../shared/icons/Icon';
import { MENUS } from '../../menu-bar/menuConfig';
import { runCommand } from '../../menu-bar/commands';
import styles from './CommandPalette.module.css';

/** Every menu item, flattened — one command surface, reachable from the keyboard. */
const COMMANDS = MENUS.flatMap((menu) =>
  menu.items
    .filter((i) => i.id && i.label)
    .map((i) => ({ id: i.id!, label: i.label!, group: menu.label, icon: i.icon, shortcut: i.shortcut })),
);

export function CommandPalette() {
  const open = useUIStore((s) => s.palette);
  const setOverlay = useUIStore((s) => s.setOverlay);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      inputRef.current?.focus();
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS.slice(0, 40);
    return COMMANDS.filter(
      (c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q),
    ).slice(0, 40);
  }, [query]);

  const close = () => setOverlay('palette', false);

  const run = (i: number) => {
    const cmd = results[i];
    close();
    if (cmd) runCommand(cmd.id);
  };

  /**
   * Navigation keys are handled on the window rather than on the input, so they
   * keep working when focus drifts out of the field — clicking in the result
   * list, for instance. Escape is left to the global shortcut handler.
   */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIndex((i) => Math.min(results.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        run(index);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!open) return null;

  return (
    <div className={styles.scrim} onMouseDown={close} role="presentation">
      <div className={styles.palette} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
        <div className={styles.inputRow}>
          <Icon name="find" size={13} />
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            placeholder="Type a command…"
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
          />
          <kbd className={styles.esc}>Esc</kbd>
        </div>

        <div className={styles.list}>
          {results.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className={i === index ? `${styles.row} ${styles.rowActive}` : styles.row}
              onMouseEnter={() => setIndex(i)}
              onClick={() => run(i)}
            >
              <span className={styles.rowIcon}>{c.icon && <Icon name={c.icon} size={12} />}</span>
              <span className={styles.rowLabel}>{c.label}</span>
              <span className={styles.rowGroup}>{c.group}</span>
              {c.shortcut && <span className={styles.rowShortcut}>{c.shortcut}</span>}
            </button>
          ))}
          {results.length === 0 && <div className={styles.none}>No matching command.</div>}
        </div>
      </div>
    </div>
  );
}
