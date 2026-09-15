import { isCoil, type LadderElement, type NodePath, type SeriesNode } from '../models/ladderNode';
import type { Network } from '../models/network';
import type { Selection } from '../models/selection';
import { conducts, passes, type ValueMap } from './evaluate';
import { terminates } from './shape';
import { height, width } from './span';

/**
 * LADDER LAYOUT — pure geometry.
 *
 * Turns a list of network trees into flat draw lists. Knows nothing about React,
 * nothing about the DOM, and nothing about the current theme: colours are emitted
 * as `var(--token)` strings so the stylesheet keeps owning them.
 *
 * Keeping this pure is what lets the canvas component stay thin and lets the
 * branching rules be tested without rendering anything.
 */

/* ── canvas metrics ─────────────────────────────────────────── */
export const CW = 116; // column width, one contact
export const CH = 78; // row height, one branch level
export const X0 = 76; // x of column 0
export const RAIL_L = 56; // left power rail
export const RIGHT_PAD = 40; // air past the last cell before the canvas ends
export const MINCOLS = 6; // canvas never narrower than this
export const GUTTER_W = 34; // rung-number gutter
const NET_HEAD = 56; // comment line above each network's main row
const ELEM_HALF = 11; // contact half-width, where wires meet the element
// A coil is two arcs that bulge outward from cx±16 to cx±32, so a wire has to
// stop at 32 or it is drawn straight through the glyph.
const COIL_HALF = 32;

const tok = (name: string) => `var(--${name})`;

export interface Wire {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  sw: number;
}

export interface Plate {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke: string;
  dash?: string;
}

export interface Dot {
  cx: number;
  cy: number;
  fill: string;
}

export interface Glyph {
  d: string;
  stroke: string;
  sw: number;
}

export interface Label {
  x: number;
  y: number;
  text: string;
  fill: string;
  fs: number;
  fw: string;
  anchor: 'start' | 'middle' | 'end';
  mono?: boolean;
  italic?: boolean;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Hit extends Rect {
  key: string;
  n: number;
  kind: 'cell' | 'slot';
  path?: NodePath;
  /** A branch may be anchored here. */
  branchable: boolean;
  /** An element may be inserted here, with a left/right side. */
  insertable: boolean;
}

export interface LadderLayout {
  width: number;
  height: number;
  plates: Plate[];
  wires: Wire[];
  dots: Dot[];
  glyphs: Glyph[];
  labels: Label[];
  hits: Hit[];
  selectionRing: Rect | null;
  caret: { x: number; y1: number; y2: number } | null;
  insertButton: Rect;
  /** Vertical centre of each network's main row, for scroll-into-view. */
  networkTops: number[];
}

export interface LayoutInput {
  networks: Network[];
  values: ValueMap;
  online: boolean;
  selection: Selection | null;
  /** View > Comments. Hiding them tightens the canvas for dense programs. */
  showComments?: boolean;
}

const samePath = (a: NodePath | undefined, b: NodePath) => (a ?? []).join('.') === b.join('.');

export function layoutLadder({
  networks,
  values,
  online,
  selection,
  showComments = true,
}: LayoutInput): LadderLayout {
  const plates: Plate[] = [];
  const wires: Wire[] = [];
  const dots: Dot[] = [];
  const glyphs: Glyph[] = [];
  const labels: Label[] = [];
  const hits: Hit[] = [];
  const networkTops: number[] = [];

  let selectionRing: Rect | null = null;
  let caret: LadderLayout['caret'] = null;

  /* ── colour helpers: only online mode distinguishes live from dead ── */
  const wireC = (live: boolean) => (online ? tok(live ? 'green' : 'dead') : tok('ink'));
  const wireW = (live: boolean) => (online && live ? 2.6 : 1.6);

  /* ── column arithmetic ──────────────────────────────────────── */
  // Outputs live in the tree now, so a rung's width already counts its coils
  // and there is no dedicated output column to leave room for.
  const cols = Math.max(
    MINCOLS,
    networks.reduce((m, net) => Math.max(m, width(net.body)), 1),
  );
  const nodeX = (c: number) => X0 + c * CW;
  const cellCx = (c: number, span = 1) => nodeX(c) + (CW * span) / 2;
  const RIGHT_EDGE = nodeX(cols) + RIGHT_PAD;
  const svgW = RIGHT_EDGE + 44;

  const txt = (
    x: number,
    y: number,
    text: string,
    o: Partial<Omit<Label, 'x' | 'y' | 'text'>> = {},
  ) => {
    labels.push({
      x,
      y,
      text,
      fill: o.fill ?? tok('lab'),
      fs: o.fs ?? 11,
      fw: o.fw ?? '400',
      anchor: o.anchor ?? 'start',
      mono: o.mono,
      italic: o.italic,
    });
  };

  const ring = (r: Rect): Rect => ({ ...r });

  /**
   * Draw one contact, coil or edge glyph. `ec` is the element colour, which is
   * red when the element carries a diagnostic and otherwise follows power flow.
   */
  const drawElem = (el: LadderElement, cx: number, cy: number, ec: string) => {
    if (el.type === 'coil' || el.type === 'set' || el.type === 'reset') {
      glyphs.push({ d: `M${cx - 16} ${cy - 14} A16 14 0 0 0 ${cx - 16} ${cy + 14}`, stroke: ec, sw: 2 });
      glyphs.push({ d: `M${cx + 16} ${cy - 14} A16 14 0 0 1 ${cx + 16} ${cy + 14}`, stroke: ec, sw: 2 });
      if (el.type !== 'coil') {
        txt(cx, cy + 4, el.type === 'set' ? 'S' : 'R', { anchor: 'middle', fw: '600', fill: ec, mono: true });
      }
    } else {
      glyphs.push({ d: `M${cx - ELEM_HALF} ${cy - 14}v28`, stroke: ec, sw: 2 });
      glyphs.push({ d: `M${cx + ELEM_HALF} ${cy - 14}v28`, stroke: ec, sw: 2 });
      if (el.type === 'nc') {
        glyphs.push({ d: `M${cx - 15} ${cy + 16}L${cx + 15} ${cy - 16}`, stroke: ec, sw: 2 });
      }
      if (el.type === 'p' || el.type === 'n') {
        txt(cx, cy + 4, el.type === 'p' ? 'P' : 'N', {
          anchor: 'middle',
          fw: '600',
          fill: ec,
          mono: true,
        });
      }
    }

    txt(cx, cy - 20, el.sym || '???', { anchor: 'middle', fill: el.sym ? tok('lab') : tok('tx3') });
    txt(cx, cy + 28, el.addr || '—', {
      anchor: 'middle',
      fill: el.err ? tok('red') : tok('addr'),
      fs: 10,
      mono: true,
    });

    // Diagnostic underline, the canvas end of the Problems panel.
    if (el.err) {
      glyphs.push({ d: `M${cx - 21} ${cy - 16}l4 3 4-3 4 3 4-3 4 3 4-3`, stroke: tok('red'), sw: 1.2 });
    }

    if (online) {
      txt(cx + (isCoil(el.type) ? 38 : 22), cy - 8, String(Number(values[el.sym] ?? 0)), {
        fill: el.forced ? tok('red') : tok('tx2'),
        fs: 10,
        fw: '600',
        mono: true,
      });
      if (el.forced) {
        txt(cx + 22, cy + 44, 'F forced 0', { fill: tok('red'), fs: 10, fw: '600', mono: true });
      }
    }
  };

  let y = 14;

  networks.forEach((net, ni) => {
    const netTop = y;
    const mainY = netTop + NET_HEAD;
    networkTops.push(netTop);

    wires.push({ x1: 40, y1: netTop, x2: svgW, y2: netTop, stroke: tok('bord'), sw: 1 });
    if (showComments) txt(56, netTop + 18, net.comment, { fill: tok('cmt'), italic: true });
    txt(24, mainY + 4, String(ni + 1), { fill: tok('tx3'), fs: 11, anchor: 'end', mono: true });

    const occupiedX = new Set<number>();
    const occupiedXY = new Set<string>();
    const slotCands: { rect: Rect; key: string; path: NodePath }[] = [];

    /**
     * Walk one series line. Returns whether power reaches its right edge.
     *
     * `allotW` is the width this line has been given by its parent block — a
     * level narrower than its block gets a filler wire out to the shared rejoin
     * node, which is what keeps every level starting and ending together.
     */
    const drawSer = (
      node: SeriesNode,
      path: NodePath,
      col: number,
      row: number,
      allotW: number,
      pIn: boolean,
    ): boolean => {
      const yy = mainY + row * CH;
      let prevX = nodeX(col);
      let live = pIn;
      let c = col;

      node.kids.forEach((kid, i) => {
        const kp = path.concat(i);

        if (kid.t === 'par') {
          const bw = width(kid);
          const xL = nodeX(c);
          const xR = nodeX(c + bw);
          // Rule 7: an output block has no rejoin node, because every leg runs
          // to the right rail on its own.
          const outputBlock = terminates(kid);
          wires.push({ x1: prevX, y1: yy, x2: xL, y2: yy, stroke: wireC(live), sw: wireW(live) });

          let r2 = row;
          const outs: boolean[] = [];
          kid.kids.forEach((lvl, li) => {
            outs.push(drawSer(lvl, kp.concat(li), c, r2, bw, live));
            if (li > 0) {
              const ly = mainY + r2 * CH;
              const anyOut = outs.some(Boolean);
              wires.push({ x1: xL, y1: yy, x2: xL, y2: ly, stroke: wireC(live), sw: wireW(live) });
              if (!outputBlock) {
                wires.push({ x1: xR, y1: yy, x2: xR, y2: ly, stroke: wireC(anyOut), sw: wireW(anyOut) });
              }
            }
            r2 += height(lvl);
          });

          const anyOut = outs.some(Boolean);
          dots.push({ cx: xL, cy: yy, fill: wireC(live) });
          if (!outputBlock) dots.push({ cx: xR, cy: yy, fill: wireC(anyOut) });
          live = outputBlock ? false : anyOut;
          prevX = xR;
          c += bw;
          return;
        }

        const el = kid;
        const span = el.span ?? 1;
        const cx = cellCx(c, span);
        const key = `${ni}:${kp.join('.')}`;
        const isSel =
          !!selection && selection.n === ni && selection.kind === 'cell' && samePath(selection.path, kp);
        const ec = el.err ? tok('red') : wireC(live);

        if (el.type === 'fb') {
          const boxL = nodeX(c) + 20;
          const boxR = nodeX(c + span) - 20;
          plates.push({ x: boxL, y: yy - 22, w: boxR - boxL, h: 92, fill: tok('fbfill'), stroke: ec });
          wires.push({ x1: boxL, y1: yy, x2: boxR, y2: yy, stroke: ec, sw: 1 });
          txt((boxL + boxR) / 2, yy - 6, el.fb || 'TON', { anchor: 'middle', fw: '600', mono: true });
          txt(boxL, yy - 30, el.sym || '???', { fw: '600', fill: el.sym ? tok('lab') : tok('tx3') });
          txt(boxL + 8, yy + 24, 'IN', { fill: tok('addr'), fs: 10.5, mono: true });
          txt(boxL + 8, yy + 52, 'PT', { fill: tok('addr'), fs: 10.5, mono: true });
          txt(boxR - 8, yy + 24, 'Q', { fill: tok('addr'), fs: 10.5, anchor: 'end', mono: true });
          txt(boxR - 8, yy + 52, 'ET', { fill: tok('addr'), fs: 10.5, anchor: 'end', mono: true });

          // Power enters at the IN pin, not the block's midline.
          wires.push({ x1: prevX, y1: yy, x2: boxL - 14, y2: yy, stroke: wireC(live), sw: wireW(live) });
          wires.push({ x1: boxL - 14, y1: yy, x2: boxL - 14, y2: yy + 20, stroke: wireC(live), sw: wireW(live) });
          wires.push({ x1: boxL - 14, y1: yy + 20, x2: boxL, y2: yy + 20, stroke: wireC(live), sw: wireW(live) });

          if (el.pt) {
            wires.push({ x1: boxL - 74, y1: yy + 48, x2: boxL, y2: yy + 48, stroke: tok('ink'), sw: 1.6 });
            txt(boxL - 80, yy + 52, el.pt, { fill: tok('addr'), fs: 10.5, anchor: 'end', mono: true });
          }

          wires.push({ x1: boxR, y1: yy + 20, x2: boxR + 16, y2: yy + 20, stroke: wireC(false), sw: 1.6 });
          wires.push({ x1: boxR + 16, y1: yy + 20, x2: boxR + 16, y2: yy, stroke: wireC(false), sw: 1.6 });

          const rect = { x: boxL - 6, y: yy - 30, w: boxR - boxL + 12, h: 104 };
          occupiedX.add(Math.round(nodeX(c) + 8));
          if (isSel) selectionRing = ring(rect);
          hits.push({ ...rect, key, n: ni, kind: 'cell', path: kp, branchable: false, insertable: true });

          live = false;
          prevX = boxR + 16;
        } else {
          const half = isCoil(el.type) ? COIL_HALF : ELEM_HALF;
          wires.push({ x1: prevX, y1: yy, x2: cx - half, y2: yy, stroke: wireC(live), sw: wireW(live) });
          drawElem(el, cx, yy, ec);
          live = live && passes(el, values);
          prevX = cx + half;

          const rect = { x: nodeX(c) + 8, y: yy - 32, w: CW - 16, h: 70 };
          occupiedX.add(Math.round(rect.x));
          if (isSel) selectionRing = ring(rect);
          hits.push({ ...rect, key, n: ni, kind: 'cell', path: kp, branchable: true, insertable: true });
        }

        c += span;
      });

      // Rule 6: a line that ends in an output stops at that output. Nothing is
      // drawn to its right, and it offers no trailing slot.
      if (terminates(node)) return live;

      // Filler wire out to the allotted right edge, so short levels rejoin cleanly.
      const xEnd = nodeX(col + allotW);
      if (prevX < xEnd) {
        wires.push({ x1: prevX, y1: yy, x2: xEnd, y2: yy, stroke: wireC(live), sw: wireW(live) });
      }

      // Trailing slot — clicking it extends this line.
      const slotRect = { x: nodeX(col + allotW) + 8, y: yy - 32, w: CW - 16, h: 70 };
      const slotSel =
        !!selection && selection.n === ni && selection.kind === 'slot' && samePath(selection.path, path);
      if (slotSel) {
        selectionRing = ring(slotRect);
        caret = { x: slotRect.x + 5, y1: slotRect.y + 6, y2: slotRect.y + slotRect.h - 6 };
      }
      slotCands.push({ rect: slotRect, key: `${ni}:slot:${path.join('.')}`, path: path.slice() });

      return live;
    };

    wires.push({ x1: RAIL_L, y1: mainY, x2: nodeX(0), y2: mainY, stroke: wireC(true), sw: wireW(true) });

    const bodyW = width(net.body);
    const rungHot = drawSer(net.body, [], 0, 0, bodyW, true);

    /**
     * SLOT RESOLUTION — shallowest path wins a shared position.
     *
     * Every series renders a trailing slot at the right edge of its allotted
     * width. When a parallel block is the last child of its parent series, the
     * parent's trailing slot and the block's level-0 trailing slot land on the
     * same x *and* the same y, because level 0 shares the parent's row. Two
     * insertion targets, one pixel region.
     *
     * Sorting by depth ascending makes the click mean "insert after the block,
     * in the parent series" — which is what an engineer intends. Letting the
     * deeper path win would silently swallow the element into the branch.
     *
     * Appending inside a level stays reachable: hover the right half of an
     * existing element and click, and the enclosing block widens automatically.
     * The two intents are separated by *where* you click, not by mode.
     *
     * Levels below row 0 never collide, since their y differs.
     */
    slotCands.sort((a, b) => a.path.length - b.path.length);

    // Elements are registered first and always win; a slot only claims a free cell.
    slotCands.forEach((sc) => {
      const kx = Math.round(sc.rect.x);
      const kxy = `${kx}:${Math.round(sc.rect.y)}`;
      if (!occupiedX.has(kx) && !occupiedXY.has(kxy)) {
        occupiedXY.add(kxy);
        hits.push({
          ...sc.rect,
          key: sc.key,
          n: ni,
          kind: 'slot',
          path: sc.path,
          branchable: false,
          insertable: false,
        });
      }
    });

    // A rung with no output yet runs an open wire on past its last element and
    // says so, rather than pretending to be finished.
    if (!terminates(net.body)) {
      wires.push({
        x1: nodeX(bodyW),
        y1: mainY,
        x2: RIGHT_EDGE,
        y2: mainY,
        stroke: wireC(rungHot),
        sw: wireW(rungHot),
      });
      txt(nodeX(bodyW) + 14, mainY - 10, 'no output', { fill: tok('tx3'), fs: 10, mono: true });
    }

    const rows = height(net.body);
    y = netTop + NET_HEAD + rows * CH - 20;
  });

  const svgH = y + 62;

  // Gutter behind the rung numbers, then the two power rails.
  plates.unshift({ x: 0, y: 0, w: GUTTER_W, h: svgH, fill: tok('gutter'), stroke: 'none' });
  wires.unshift({ x1: GUTTER_W, y1: 0, x2: GUTTER_W, y2: svgH, stroke: tok('bord'), sw: 1 });
  wires.push({
    x1: RAIL_L,
    y1: 14,
    x2: RAIL_L,
    y2: svgH - 48,
    stroke: online ? tok('green') : tok('ink'),
    sw: 2.4,
  });
  // No right rail. ISPSoft draws none, and a coil is where the line stops.

  const insertButton = { x: X0, y: svgH - 42, w: 212, h: 24 };
  txt(X0 + 106, svgH - 25, '+ Insert network  (Ctrl+I)', {
    anchor: 'middle',
    fill: tok('acc'),
    fs: 11,
    fw: '600',
    mono: true,
  });

  return {
    width: svgW,
    height: svgH,
    plates,
    wires,
    dots,
    glyphs,
    labels,
    hits,
    selectionRing,
    caret,
    insertButton,
    networkTops,
  };
}

/** Whether a whole rung conducts, used by the status bar and monitoring. */
export const rungConducts = (net: Network, values: ValueMap) => conducts(net.body, values);
