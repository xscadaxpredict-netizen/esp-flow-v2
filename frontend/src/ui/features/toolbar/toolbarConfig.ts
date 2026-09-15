import type { ElementType } from '../../../core/models/ladderNode';
import type { IconName } from '../../shared/icons/paths';

export interface ToolButton {
  icon: IconName;
  title: string;
  shortcut: string;
  /**
   * Letter drawn inside the glyph to distinguish a variant. The design reuses
   * one contact and one coil outline and overlays P / N / S / R, so the four
   * contact types and three coil modes stay visually related.
   */
  overlay?: string;
  /** Command id dispatched through runCommand. */
  cmd?: string;
  /** Arms this element placement tool instead of running a command. */
  tool?: ElementType;
}

export interface ToolGroup {
  id: string;
  label: string;
  items: ToolButton[];
}

/**
 * Five toolbars over two rows, transcribed from the `G` array in
 * `ESP-Flow IDE.dc.html`. Row 1 is STD + LADDER, row 2 is PLC + COMPILE + VIEW.
 *
 * There is deliberately no horizontal-wire or vertical-link tool: wires are not
 * objects in this model. A branch is created from a selection, and a level
 * narrower than its block is filled out to the rejoin node automatically.
 */
const STD: ToolGroup = {
  id: 'std',
  label: 'STD',
  items: [
    { icon: 'nw', title: 'New', shortcut: 'Ctrl+N', cmd: 'file.new' },
    { icon: 'open', title: 'Open', shortcut: 'Ctrl+O', cmd: 'file.open' },
    { icon: 'save', title: 'Save', shortcut: 'Ctrl+S', cmd: 'file.save' },
    { icon: 'print', title: 'Print', shortcut: 'Ctrl+P', cmd: 'file.print' },
    { icon: 'undo', title: 'Undo', shortcut: 'Ctrl+Z', cmd: 'edit.undo' },
    { icon: 'redo', title: 'Redo', shortcut: 'Ctrl+Y', cmd: 'edit.redo' },
    { icon: 'cut', title: 'Cut', shortcut: 'Ctrl+X', cmd: 'edit.cut' },
    { icon: 'copy', title: 'Copy', shortcut: 'Ctrl+C', cmd: 'edit.copy' },
    { icon: 'paste', title: 'Paste', shortcut: 'Ctrl+V', cmd: 'edit.paste' },
    { icon: 'find', title: 'Find', shortcut: 'Ctrl+F', cmd: 'edit.find' },
  ],
};

const LADDER: ToolGroup = {
  id: 'ladder',
  label: 'LADDER',
  items: [
    { icon: 'no', title: 'Normally-open contact', shortcut: 'F2', tool: 'no' },
    { icon: 'nc', title: 'Normally-closed contact', shortcut: 'F3', tool: 'nc' },
    { icon: 'no', title: 'Rising-edge contact', shortcut: 'F4', overlay: 'P', tool: 'p' },
    { icon: 'no', title: 'Falling-edge contact', shortcut: 'Shift+F4', overlay: 'N', tool: 'n' },
    { icon: 'coil', title: 'Output coil', shortcut: 'F5', tool: 'coil' },
    { icon: 'coil', title: 'Set coil', shortcut: 'F6', overlay: 'S', tool: 'set' },
    { icon: 'coil', title: 'Reset coil', shortcut: 'F7', overlay: 'R', tool: 'reset' },
    { icon: 'fb', title: 'Function block', shortcut: 'F9', tool: 'fb' },
    { icon: 'vbr', title: 'Branch from selection', shortcut: 'Ctrl+B', cmd: 'edit.branch' },
    { icon: 'delel', title: 'Delete element', shortcut: 'Del', cmd: 'edit.delelem' },
    { icon: 'insnw', title: 'Insert network', shortcut: 'Ctrl+I', cmd: 'edit.insnet' },
    { icon: 'delnw', title: 'Delete network', shortcut: 'Ctrl+D', cmd: 'edit.delnet' },
  ],
};

const PLC: ToolGroup = {
  id: 'plc',
  label: 'PLC',
  items: [
    { icon: 'conn', title: 'Connect device', shortcut: 'Ctrl+K', cmd: 'plc.connect' },
    { icon: 'down', title: 'Download to PLC', shortcut: 'F8', cmd: 'plc.download' },
    { icon: 'up', title: 'Upload from PLC', shortcut: 'Shift+F8', cmd: 'plc.upload' },
    { icon: 'run', title: 'Run', shortcut: 'Ctrl+R', cmd: 'plc.run' },
    { icon: 'stop', title: 'Stop', shortcut: 'Ctrl+.', cmd: 'plc.stop' },
    { icon: 'mon', title: 'Online monitor', shortcut: 'Ctrl+M', cmd: 'plc.online' },
    { icon: 'force', title: 'Force values', shortcut: 'Ctrl+Shift+F', cmd: 'plc.force' },
  ],
};

const COMPILE: ToolGroup = {
  id: 'compile',
  label: 'COMPILE',
  items: [
    { icon: 'comp', title: 'Compile', shortcut: 'F11', cmd: 'compile.build' },
    { icon: 'rebuild', title: 'Rebuild all', shortcut: 'Ctrl+F11', cmd: 'compile.rebuild' },
    { icon: 'check', title: 'Check program', shortcut: 'F12', cmd: 'compile.check' },
    // The design gives these F4 / Shift+F4, which it also gives the edge
    // contacts. The contacts keep the keys, so these advertise none.
    { icon: 'prev', title: 'Previous error', shortcut: '', cmd: 'compile.prev' },
    { icon: 'next', title: 'Next error', shortcut: '', cmd: 'compile.next' },
    { icon: 'xref', title: 'Cross reference', shortcut: 'Ctrl+Shift+X', cmd: 'compile.xref' },
  ],
};

const VIEW: ToolGroup = {
  id: 'view',
  label: 'VIEW',
  items: [
    { icon: 'zin', title: 'Zoom in', shortcut: 'Ctrl++', cmd: 'view.zin' },
    { icon: 'zout', title: 'Zoom out', shortcut: 'Ctrl+-', cmd: 'view.zout' },
    { icon: 'zfit', title: 'Zoom to fit', shortcut: 'Ctrl+0', cmd: 'view.zfit' },
    { icon: 'grid', title: 'Toggle grid', shortcut: 'Ctrl+G', cmd: 'view.grid' },
    { icon: 'cmt', title: 'Toggle comments', shortcut: 'Ctrl+;', cmd: 'view.comments' },
    { icon: 'panels', title: 'Toggle panels', shortcut: '', cmd: 'view.panels' },
  ],
};

export const TOOLBAR_ROWS: ToolGroup[][] = [
  [STD, LADDER],
  [PLC, COMPILE, VIEW],
];
