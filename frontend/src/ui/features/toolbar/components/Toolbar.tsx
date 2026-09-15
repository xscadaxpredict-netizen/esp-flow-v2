import { useCompileStore } from '../../../../services/store/useCompileStore';
import { useLadderStore } from '../../../../services/store/useLadderStore';
import { useUIStore } from '../../../../services/store/useUIStore';
import { ICON_PATHS } from '../../../shared/icons/paths';
import { tooltipProps } from '../../../shared/components/tooltipProps';
import { runCommand } from '../../menu-bar/commands';
import { TOOLBAR_ROWS, type ToolButton } from '../toolbarConfig';
import styles from './Toolbar.module.css';

/**
 * One toolbar glyph. The overlay letter is drawn inside the same 16x16 viewBox
 * as the outline, so a set coil reads as a coil variant rather than a different
 * symbol — exactly how the design distinguishes P/N/S/R.
 */
function ToolGlyph({ item }: { item: ToolButton }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
    >
      <path d={ICON_PATHS[item.icon]} />
      {item.overlay && (
        <text
          x="8"
          y="10.5"
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize="6.5"
          fontWeight="600"
          stroke="none"
          fill="currentColor"
        >
          {item.overlay}
        </text>
      )}
    </svg>
  );
}

function ToolbarButton({ item, groupId, index }: { item: ToolButton; groupId: string; index: number }) {
  const activeTool = useLadderStore((s) => s.activeTool);
  const branchArm = useLadderStore((s) => s.branchArm);
  const setActiveTool = useLadderStore((s) => s.setActiveTool);
  const mode = useUIStore((s) => s.mode);
  const showGrid = useUIStore((s) => s.showGrid);
  const building = useCompileStore((s) => s.building);

  // Buttons that represent state show it, rather than only flashing on click.
  const armed = item.tool
    ? activeTool === item.tool
    : item.cmd === 'edit.branch'
      ? !!branchArm
      : item.cmd === 'plc.online'
        ? mode === 'online'
        : item.cmd === 'view.grid'
          ? showGrid
          : item.cmd === 'compile.build'
            ? building
            : false;

  const disabled = !!item.tool && mode === 'online';
  const label = item.shortcut ? `${item.title} (${item.shortcut})` : item.title;

  return (
    <button
      type="button"
      className={armed ? `${styles.btn} ${styles.btnArmed}` : styles.btn}
      disabled={disabled}
      onClick={() => {
        if (item.tool) setActiveTool(armed ? null : item.tool);
        else if (item.cmd) runCommand(item.cmd);
      }}
      aria-pressed={item.tool || armed ? armed : undefined}
      aria-label={item.title}
      {...tooltipProps(`${groupId}:${index}`, label)}
    >
      <ToolGlyph item={item} />
    </button>
  );
}

export function Toolbar() {
  return (
    <div className={styles.toolbar}>
      {TOOLBAR_ROWS.map((row, ri) => (
        <div key={ri} className={styles.row}>
          {row.map((group) => (
            <div key={group.id} className={styles.group}>
              <span className={styles.groupLabel}>{group.label}</span>
              {group.items.map((item, i) => (
                <ToolbarButton key={`${group.id}-${i}`} item={item} groupId={group.id} index={i} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
