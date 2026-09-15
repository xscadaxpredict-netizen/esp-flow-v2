/**
 * ICON PATH CATALOGUE
 *
 * Line-art icon set from the design handoff. Every icon is a single path on a
 * 16x16 viewBox, drawn with `fill: none` and `stroke: currentColor` at 1.4-1.5
 * stroke width, so icons inherit their colour from the surrounding text.
 *
 * Source: `ICON` map in ESP-Flow IDE.dc.html, catalogued in ESP-Flow Design System.dc.html.
 */

export const ICON_PATHS = {
  // ── file & clipboard (STD toolbar) ──────────────────────────
  nw: 'M4 2h5l3 3v9H4z',
  open: 'M2 4h5l1.5 2H14v8H2z',
  save: 'M3 2h10v12H3zM6 2v4h4V2M5 10h6',
  print: 'M5 2h6v3H5zM3 5h10v6H3zM5 9h6v5H5z',
  undo: 'M3 7h7a3 3 0 110 6H7M3 7l3-3M3 7l3 3',
  redo: 'M13 7H6a3 3 0 100 6h3M13 7l-3-3M13 7l-3 3',
  cut: 'M5 2l6 9M11 2l-6 9M4 13a1.5 1.5 0 100-3 1.5 1.5 0 000 3M12 13a1.5 1.5 0 100-3 1.5 1.5 0 000 3',
  copy: 'M6 1h7v9H6zM3 5h7v10H3z',
  paste: 'M4 3h8v11H4zM6 1h4v3H6z',
  find: 'M7 2a5 5 0 100 10A5 5 0 007 2M11 11l3 3',

  // ── ladder elements (LADDER toolbar) ────────────────────────
  no: 'M1 8h3M4 3v10M12 3v10M12 8h3',
  nc: 'M1 8h3M4 3v10M12 3v10M12 8h3M3 12l10-8',
  coil: 'M1 8h3M15 8h-3M5 3a6.5 6.5 0 000 10M11 3a6.5 6.5 0 010 10',
  wire: 'M1 8h14',
  vbr: 'M4 2v12M12 2v12M4 8h8',
  insnw: 'M2 3h12M2 13h12M8 6v4M6 8h4',
  delnw: 'M2 3h12M2 13h12M6 6l4 4M10 6l-4 4',
  /** Delete element: a cell with an X through it. */
  delel: 'M3 3h10v10H3zM6 6l4 4M10 6l-4 4',
  fb: 'M4 4h8v8H4zM2 6h2M2 10h2M12 6h2M12 10h2',

  // ── device & runtime (PLC toolbar) ──────────────────────────
  conn: 'M2 8h4M10 8h4M6 5h4v6H6z',
  down: 'M8 2v7M5 6l3 3 3-3M3 13h10',
  up: 'M8 11V4M5 7l3-3 3 3M3 13h10',
  run: 'M5 3l8 5-8 5z',
  stop: 'M4 4h8v8H4z',
  mon: 'M2 3h12v8H2zM6 13h4M8 11v2M4 7l2-2 2 3 2-3 2 2',
  force: 'M9 2l-4 6h3l-1 6 4-7H8z',

  // ── build (COMPILE toolbar) ─────────────────────────────────
  comp: 'M4 3l4 5-4 5M9 13h5',
  rebuild: 'M13 6A5 5 0 103 9M13 2v4h-4',
  check: 'M3 8l3 3 7-7',
  prev: 'M10 4L5 8l5 4M4 3v10',
  next: 'M6 4l5 4-5 4M12 3v10',
  xref: 'M2 3h5v5H2zM9 8h5v5H9zM7 5h4v4',

  // ── view (VIEW toolbar) ─────────────────────────────────────
  zin: 'M7 2a5 5 0 100 10A5 5 0 007 2M11 11l3 3M5 7h4M7 5v4',
  zout: 'M7 2a5 5 0 100 10A5 5 0 007 2M11 11l3 3M5 7h4',
  zfit: 'M2 5V2h3M14 5V2h-3M2 11v3h3M14 11v3h-3',
  grid: 'M2 2h12v12H2zM6 2v12M10 2v12M2 6h12M2 10h12',
  cmt: 'M2 3h12v8H6l-3 3z',
  panels: 'M2 3h12v10H2zM6 3v10M2 10h12',

  // ── project tree node types ─────────────────────────────────
  folder: 'M2 4h4l1.5 2H14v8H2z',
  chip: 'M5 5h6v6H5zM2 7h3M2 10h3M11 7h3M11 10h3M7 2v3M10 2v3M7 11v3M10 11v3',
  net: 'M4 2h8v3H4zM2 11h4v3H2zM10 11h4v3h-4zM8 5v3M4 8h8v3',
  sym: 'M4 2h8v12H4zM6 6h4M6 9h4',
  ld: 'M3 3v10M13 3v10M3 8h3M10 8h3M6 5v6M10 5v6',
  st: 'M3 4h10M3 8h7M3 12h9',
  task: 'M8 3a5 5 0 100 10A5 5 0 008 3M8 5.5V8l2 1.5',
  table: 'M2 3h12v10H2zM2 6h12M6 6v7M10 6v7',

  // ── diagnostics & state ─────────────────────────────────────
  err: 'M8 8m-6 0a6 6 0 1012 0 6 6 0 10-12 0M8 4v5M8 11v.5',
  warn: 'M8 2l6 11H2zM8 6v3M8 11v.5',
  info: 'M8 8m-6 0a6 6 0 1012 0 6 6 0 10-12 0M8 7v5M8 5v.5',
  dot: 'M8 8m-2 0a2 2 0 104 0 2 2 0 10-4 0',
  tickc: 'M4 8l3 3 5-6',
  spin: 'M8 3a5 5 0 105 5',
  pend: 'M8 3a5 5 0 100 10A5 5 0 008 3',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];
