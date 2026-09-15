import type { IconName } from '../../shared/icons/paths';

export interface MenuItem {
  /** Stable id used to dispatch the action. */
  id?: string;
  label?: string;
  icon?: IconName;
  shortcut?: string;
  /** A rule between groups of items. */
  sep?: boolean;
  disabled?: boolean;
}

export interface MenuDef {
  id: string;
  label: string;
  items: MenuItem[];
}

const sep: MenuItem = { sep: true };

/**
 * Exactly eight menus, transcribed from the `MITEMS` map in
 * `ESP-Flow IDE.dc.html`. Kept to what the design actually specifies rather than
 * padded out with plausible-looking extras — a menu item that does nothing is
 * worse than an absent one.
 */
export const MENUS: MenuDef[] = [
  {
    id: 'file',
    label: 'File',
    items: [
      { id: 'file.new', label: 'New Project', icon: 'nw', shortcut: 'Ctrl+N' },
      { id: 'file.open', label: 'Open Project…', icon: 'open', shortcut: 'Ctrl+O' },
      { id: 'file.save', label: 'Save', icon: 'save', shortcut: 'Ctrl+S' },
      sep,
      { id: 'file.print', label: 'Print…', icon: 'print', shortcut: 'Ctrl+P' },
      sep,
      { id: 'file.export', label: 'Export Project (.espf)', icon: 'up' },
      { id: 'file.close', label: 'Close Project', icon: 'stop' },
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    items: [
      { id: 'edit.undo', label: 'Undo', icon: 'undo', shortcut: 'Ctrl+Z' },
      { id: 'edit.redo', label: 'Redo', icon: 'redo', shortcut: 'Ctrl+Y' },
      sep,
      { id: 'edit.cut', label: 'Cut', icon: 'cut', shortcut: 'Ctrl+X' },
      { id: 'edit.copy', label: 'Copy', icon: 'copy', shortcut: 'Ctrl+C' },
      { id: 'edit.paste', label: 'Paste', icon: 'paste', shortcut: 'Ctrl+V' },
      { id: 'edit.find', label: 'Find / Replace', icon: 'find', shortcut: 'Ctrl+F' },
    ],
  },
  {
    id: 'view',
    label: 'View',
    items: [
      { id: 'view.zin', label: 'Zoom In', icon: 'zin', shortcut: 'Ctrl++' },
      { id: 'view.zout', label: 'Zoom Out', icon: 'zout', shortcut: 'Ctrl+-' },
      { id: 'view.zfit', label: 'Zoom to Fit', icon: 'zfit', shortcut: 'Ctrl+0' },
      sep,
      { id: 'view.grid', label: 'Grid', icon: 'grid', shortcut: 'Ctrl+G' },
      { id: 'view.comments', label: 'Comments', icon: 'cmt', shortcut: 'Ctrl+;' },
      { id: 'view.panels', label: 'Panels', icon: 'panels' },
    ],
  },
  {
    id: 'compile',
    label: 'Compile',
    items: [
      { id: 'compile.build', label: 'Compile', icon: 'comp', shortcut: 'F11' },
      { id: 'compile.rebuild', label: 'Rebuild All', icon: 'rebuild', shortcut: 'Ctrl+F11' },
      { id: 'compile.check', label: 'Check Program', icon: 'check', shortcut: 'F12' },
      sep,
      { id: 'compile.next', label: 'Next Error', icon: 'next', shortcut: 'F4' },
      { id: 'compile.xref', label: 'Cross Reference', icon: 'xref', shortcut: 'Ctrl+Shift+X' },
    ],
  },
  {
    id: 'plc',
    label: 'PLC',
    items: [
      { id: 'plc.connect', label: 'Connect Device', icon: 'conn', shortcut: 'Ctrl+K' },
      { id: 'plc.download', label: 'Download to PLC', icon: 'down', shortcut: 'F8' },
      { id: 'plc.upload', label: 'Upload from PLC', icon: 'up', shortcut: 'Shift+F8' },
      sep,
      { id: 'plc.run', label: 'Run', icon: 'run', shortcut: 'Ctrl+R' },
      { id: 'plc.stop', label: 'Stop', icon: 'stop', shortcut: 'Ctrl+.' },
      { id: 'plc.online', label: 'Online Mode', icon: 'mon', shortcut: 'Ctrl+M' },
      { id: 'plc.force', label: 'Force Values', icon: 'force', shortcut: 'Ctrl+Shift+F' },
      sep,
      { id: 'plc.clear', label: 'Clear PLC Memory', icon: 'delnw' },
      { id: 'plc.info', label: 'Device Info', icon: 'chip' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { id: 'tools.hw', label: 'Hardware Configuration…', icon: 'chip' },
      { id: 'tools.symbols', label: 'Symbol Manager', icon: 'sym' },
      { id: 'tools.palette', label: 'Command Palette', icon: 'comp', shortcut: 'Ctrl+Shift+P' },
      { id: 'tools.options', label: 'Options…', icon: 'panels' },
    ],
  },
  {
    id: 'window',
    label: 'Window',
    items: [
      { id: 'window.split', label: 'Split Editor', icon: 'panels' },
      { id: 'window.reset', label: 'Reset Layout', icon: 'grid' },
      { id: 'window.chart', label: 'Monitor Chart', icon: 'mon' },
    ],
  },
  {
    id: 'help',
    label: 'Help',
    items: [
      { id: 'help.docs', label: 'Documentation', icon: 'st', shortcut: 'F1' },
      { id: 'help.primer', label: 'IEC 61131-3 Reference', icon: 'sym' },
      { id: 'help.about', label: 'About ESP-Flow', icon: 'info' },
    ],
  },
];
