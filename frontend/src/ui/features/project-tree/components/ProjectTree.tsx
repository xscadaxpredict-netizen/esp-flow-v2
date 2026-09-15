import { useProjectStore, type TreeGroup } from '../../../../services/store/useProjectStore';
import { useUIStore } from '../../../../services/store/useUIStore';
import { Panel, PanelBody, PanelHeader } from '../../../shared/components/Panel';
import { Icon, type IconName } from '../../../shared/icons/Icon';
import styles from './ProjectTree.module.css';

interface Row {
  id: string;
  label: string;
  icon: IconName;
  depth: number;
  /** Set when this row expands a group. */
  group?: TreeGroup;
  /** Colour role for the node icon. */
  tone?: 'accent' | 'amber' | 'muted';
  tag?: string;
}

/**
 * The project tree. Every node here is an IEC concept: Global Symbols is the
 * variable declaration table, Programs and Function Blocks are POUs, and Tasks
 * is the configuration that decides when each program runs.
 */
export function ProjectTree() {
  const { projectName, expanded, selectedNode, toggleGroup, selectNode } = useProjectStore();
  const setCtxMenu = useUIStore((s) => s.setCtxMenu);
  const setOverlay = useUIStore((s) => s.setOverlay);

  const rows: Row[] = [{ id: 'root', label: projectName, icon: 'folder', depth: 0, group: 'root', tone: 'amber' }];

  if (expanded.root) {
    rows.push(
      { id: 'hwconfig', label: 'Hardware Configuration', icon: 'chip', depth: 1, tone: 'accent' },
      { id: 'nwconfig', label: 'Network Configuration', icon: 'net', depth: 1, tone: 'accent' },
      { id: 'globals', label: 'Global Symbols', icon: 'sym', depth: 1, tag: '18' },
      { id: 'programs', label: 'Programs', icon: 'folder', depth: 1, group: 'programs', tone: 'amber' },
    );
    if (expanded.programs) {
      rows.push(
        { id: 'prog0', label: 'Prog0', icon: 'ld', depth: 2, tag: 'LD' },
        { id: 'prog1', label: 'Prog1', icon: 'st', depth: 2, tag: 'ST' },
      );
    }
    rows.push({ id: 'fbs', label: 'Function Blocks', icon: 'folder', depth: 1, group: 'fbs', tone: 'amber' });
    if (expanded.fbs) {
      rows.push(
        { id: 'fb-motorstarter', label: 'MotorStarter', icon: 'fb', depth: 2 },
        { id: 'fb-tankfill', label: 'TankFill', icon: 'fb', depth: 2 },
      );
    }
    rows.push({ id: 'tasks', label: 'Tasks', icon: 'folder', depth: 1, group: 'tasks', tone: 'amber' });
    if (expanded.tasks) {
      rows.push(
        { id: 'task-fast', label: 'CyclicTask_10ms', icon: 'task', depth: 2, tag: '10 ms' },
        { id: 'task-slow', label: 'CyclicTask_500ms', icon: 'task', depth: 2, tag: '500 ms' },
      );
    }
    rows.push({ id: 'tables', label: 'Device Monitor Tables', icon: 'table', depth: 1, group: 'tables' });
    if (expanded.tables) {
      rows.push({ id: 'devtable1', label: 'Device Table 1', icon: 'table', depth: 2 });
    }
  }

  return (
    <Panel>
      <PanelHeader title="PROJECT" />
      <PanelBody>
        <div role="tree">
          {rows.map((row) => {
            const isGroup = !!row.group;
            const open = isGroup ? expanded[row.group as TreeGroup] : false;
            const selected = selectedNode === row.id;

            return (
              <div
                key={row.id}
                className={selected ? `${styles.row} ${styles.rowSelected}` : styles.row}
                style={{ paddingLeft: 4 + row.depth * 12 }}
                onClick={() => {
                  selectNode(row.id);
                  if (isGroup) toggleGroup(row.group as TreeGroup);
                  if (row.id === 'hwconfig') setOverlay('hardware', true);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  selectNode(row.id);
                  setCtxMenu({ x: e.clientX, y: e.clientY, target: row.id });
                }}
                role="treeitem"
                aria-selected={selected}
                aria-expanded={isGroup ? open : undefined}
              >
                <span className={styles.chev}>
                  {isGroup && (
                    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d={open ? 'M3 6l5 5 5-5' : 'M5 3l5 5-5 5'} />
                    </svg>
                  )}
                </span>
                <span className={`${styles.icon} ${row.tone ? styles[row.tone] : ''}`}>
                  <Icon name={row.icon} size={12} strokeWidth={1.3} />
                </span>
                <span className={styles.label}>{row.label}</span>
                {row.tag && <span className={styles.tag}>{row.tag}</span>}
              </div>
            );
          })}
        </div>
      </PanelBody>
    </Panel>
  );
}
