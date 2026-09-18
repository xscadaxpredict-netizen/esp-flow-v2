import {
  ELEMENT_LABEL,
  isCoil,
  type ElementType,
  type LadderElement,
  type NodePath,
  type ParallelNode,
  type SeriesChild,
} from '../models/ladderNode';
import type { Network } from '../models/network';
import type { InsertSide, Selection } from '../models/selection';
import { newElement, newNetwork, par, ser } from './builders';
import {
  insertIndex,
  NO_APPEND_POINT,
  NO_BRANCH_POINT,
  NO_INSERT_POINT,
  NOTHING_SELECTED,
  NOTHING_TO_BRANCH,
  seriesAt,
  verdict,
  type Intent,
} from './legality';
import { cloneNetworks, nodeAt, pathOfElement } from './path';
import { width } from './span';

/**
 * Every mutation returns the new network list, where the selection should land,
 * and the sentence the status bar reports. A rejected mutation returns the
 * networks unchanged with `changed: false` and an explanatory message — the
 * editor tells you why nothing happened rather than silently doing nothing.
 *
 * Whether an edit is legal at all is asked of `legality.ts`, which the canvas
 * asks too so it can show the answer before the click. Mutations resolve, ask,
 * and edit; they carry no second copy of rules 6 and 7.
 */
export interface MutationResult {
  networks: Network[];
  selection: Selection | null;
  statusMsg: string;
  changed: boolean;
}

const reject = (networks: Network[], selection: Selection | null, statusMsg: string): MutationResult => ({
  networks,
  selection,
  statusMsg,
  changed: false,
});

export const isCoilType = (t: ElementType) => isCoil(t);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/* ────────────────────────────────────────────────────────────────
   Placement
   ──────────────────────────────────────────────────────────────── */

/**
 * Insert next to an element, inside the series that owns it.
 * Inserting in series pushes everything after it right, and the rung grows.
 */
export function placeAt(
  nets: Network[],
  n: number,
  path: NodePath,
  side: InsertSide,
  type: ElementType,
  selection: Selection | null,
): MutationResult {
  const networks = cloneNetworks(nets);
  const net = networks[n];
  if (!net) return reject(nets, selection, 'No such network');

  // An empty path means the rung itself, which is the same intent as its
  // trailing slot: append to the body.
  const intent: Intent =
    path && path.length ? { kind: 'cell', path, zone: side } : { kind: 'slot', path: [] };

  const allowed = verdict(net.body, intent, type);
  if (!allowed.ok) return reject(nets, selection, allowed.reason);

  const element = newElement(type, n);

  if (intent.kind === 'slot') {
    net.body.kids.push(element);
    return {
      networks,
      selection: { n, kind: 'cell', path: [net.body.kids.length - 1] },
      statusMsg: `Appended to Network ${n + 1}`,
      changed: true,
    };
  }

  const ppath = path.slice(0, -1);
  const idx = path[path.length - 1];
  const owner = seriesAt(net.body, ppath);
  if (!owner) return reject(nets, selection, NO_INSERT_POINT);

  const at = insertIndex(owner.kids.length, idx, side);
  owner.kids.splice(at, 0, element);

  return {
    networks,
    selection: { n, kind: 'cell', path: ppath.concat(at) },
    statusMsg: `Inserted ${side === 'left' ? 'before' : 'after'} — the rest of that line shifted right`,
    changed: true,
  };
}

/** Append to the end of a line — the empty slot at a series' right edge. */
export function appendTo(
  nets: Network[],
  n: number,
  ppath: NodePath,
  type: ElementType,
  selection: Selection | null,
): MutationResult {
  const networks = cloneNetworks(nets);
  const net = networks[n];
  if (!net) return reject(nets, selection, 'No such network');

  const allowed = verdict(net.body, { kind: 'slot', path: ppath }, type);
  if (!allowed.ok) return reject(nets, selection, allowed.reason);

  const owner = seriesAt(net.body, ppath);
  if (!owner) return reject(nets, selection, NO_APPEND_POINT);

  owner.kids.push(newElement(type, n));
  return {
    networks,
    selection: { n, kind: 'cell', path: ppath.concat(owner.kids.length - 1) },
    statusMsg: isCoilType(type)
      ? 'Output added — it ends this line at the right rail'
      : 'Appended to that line',
    changed: true,
  };
}

/* ────────────────────────────────────────────────────────────────
   Branching
   ──────────────────────────────────────────────────────────────── */

/**
 * Wrap exactly the clicked node in a parallel, at any depth.
 *
 * The subtlety: if the clicked element IS the whole line inside an existing
 * block, its displayed span is the block's width. Nesting a narrower parallel
 * inside would make the new branch look smaller than its parent, so instead the
 * child joins that block as a new level directly below and inherits its width.
 */
export function branchAt(
  nets: Network[],
  n: number,
  path: NodePath,
  armType: ElementType,
  selection: Selection | null,
): MutationResult {
  const networks = cloneNetworks(nets);
  const net = networks[n];
  if (!net) return reject(nets, selection, 'No such network');

  const allowed = verdict(net.body, { kind: 'cell', path, zone: 'below' }, armType);
  if (!allowed.ok) return reject(nets, selection, allowed.reason);

  const ppath = path.slice(0, -1);
  const idx = path[path.length - 1];
  const owner = seriesAt(net.body, ppath);
  if (!owner) return reject(nets, selection, NO_BRANCH_POINT);

  const target = owner.kids[idx];
  if (!target) return reject(nets, selection, NOTHING_TO_BRANCH);

  // The clicked element is the entire line inside a block.
  if (ppath.length >= 2 && owner.kids.length === 1) {
    const parPath = ppath.slice(0, -1);
    const lvl = ppath[ppath.length - 1];
    const block = nodeAt(net.body, parPath);
    if (block && block.t === 'par') {
      const w = width(block);
      (block as ParallelNode).kids.splice(lvl + 1, 0, ser(newElement(armType, n)));
      return {
        networks,
        selection: { n, kind: 'cell', path: parPath.concat(lvl + 1, 0) },
        statusMsg: `Branch spans its parent — ${plural(w, 'element')}; insert inside the block to widen it`,
        changed: true,
      };
    }
  }

  const span = width(target);
  owner.kids[idx] = par(ser(target), ser(newElement(armType, n)));
  return {
    networks,
    selection: { n, kind: 'cell', path: ppath.concat(idx, 1, 0) },
    statusMsg: `Branch spans its parent — ${plural(span, 'element')}; insert inside the block to widen it`,
    changed: true,
  };
}

/* ────────────────────────────────────────────────────────────────
   Deletion
   ──────────────────────────────────────────────────────────────── */

/**
 * Delete runs the construction rules backwards: remove the element, drop a level
 * left empty, and collapse a parallel left with one level back into its parent
 * series. Without that pruning the tree accumulates degenerate blocks that render
 * as stray vertical wires.
 */
export function deleteAt(nets: Network[], sel: Selection | null): MutationResult {
  if (!sel) return reject(nets, sel, 'Nothing selected');

  const networks = cloneNetworks(nets);
  const net = networks[sel.n];
  if (!net) return reject(nets, sel, 'No such network');

  if (!sel.path || !sel.path.length) return reject(nets, sel, 'Nothing selected');

  const ppath = sel.path.slice(0, -1);
  const idx = sel.path[sel.path.length - 1];
  const owner = nodeAt(net.body, ppath);
  if (!owner || owner.t !== 'ser') return reject(nets, sel, 'Cannot delete there');

  // The selection follows the neighbour on the left so the engineer keeps their
  // place. Noted before the splice, and found again afterwards by identity —
  // pruning moves the survivors, which makes any remembered path a lie.
  const asElement = (k: SeriesChild | undefined): LadderElement | null =>
    k && k.t === 'el' ? k : null;
  const neighbour =
    asElement(idx > 0 ? owner.kids[idx - 1] : undefined) ?? asElement(owner.kids[idx + 1]);

  owner.kids.splice(idx, 1);

  // Prune upward: empty level -> drop it; single-level parallel -> inline it.
  let pruned = false;
  let p = ppath.slice();
  while (p.length >= 2) {
    const block = nodeAt(net.body, p.slice(0, -1));
    const lvl = p[p.length - 1];
    if (!block || block.t !== 'par') break;

    if (block.kids[lvl] && block.kids[lvl].kids.length === 0) {
      block.kids.splice(lvl, 1);
      pruned = true;
    }

    if (block.kids.length === 1) {
      const grandPath = p.slice(0, -2);
      const gIdx = p[p.length - 2];
      const gp = grandPath.length ? nodeAt(net.body, grandPath) : net.body;
      if (gp && gp.t === 'ser') gp.kids.splice(gIdx, 1, ...block.kids[0].kids);
      pruned = true;
      p = grandPath;
      continue;
    }
    break;
  }

  // Nothing to land on beside it: take the trailing slot of the line we deleted
  // from, or the rung's own slot when pruning carried that line away.
  const landed = neighbour ? pathOfElement(net.body, neighbour.id) : null;
  const lineIntact = !pruned && (ppath.length === 0 || nodeAt(net.body, ppath)?.t === 'ser');

  return {
    networks,
    selection: landed
      ? { n: sel.n, kind: 'cell', path: landed }
      : { n: sel.n, kind: 'slot', path: lineIntact ? ppath : [] },
    statusMsg: 'Element removed — the line closed up',
    changed: true,
  };
}

/* ────────────────────────────────────────────────────────────────
   Networks
   ──────────────────────────────────────────────────────────────── */

export function addNetwork(nets: Network[]): MutationResult {
  const networks = cloneNetworks(nets);
  networks.push(newNetwork(networks.length));
  return {
    networks,
    selection: { n: networks.length - 1, kind: 'slot', path: [] },
    statusMsg: `Network ${networks.length} inserted — pick a contact, then click the rung`,
    changed: true,
  };
}

export function deleteNetwork(nets: Network[], n: number, selection: Selection | null): MutationResult {
  if (nets.length < 2) return reject(nets, selection, 'A program needs at least one network');
  const networks = cloneNetworks(nets);
  networks.splice(n, 1);
  return {
    networks,
    selection: { n: Math.max(0, n - 1), kind: 'cell', path: [0] },
    statusMsg: `Network ${n + 1} deleted — Ctrl+Z to undo`,
    changed: true,
  };
}

export function setNetworkComment(nets: Network[], n: number, comment: string): Network[] {
  const networks = cloneNetworks(nets);
  if (networks[n]) networks[n].comment = comment;
  return networks;
}

/* ────────────────────────────────────────────────────────────────
   Element editing
   ──────────────────────────────────────────────────────────────── */

const resolveElement = (net: Network, sel: Selection): LadderElement | null => {
  if (!sel.path) return null;
  const node = nodeAt(net.body, sel.path);
  return node && node.t === 'el' ? node : null;
};

/** Bind an element to a declared symbol. Address follows the declaration. */
export function bindSymbol(
  nets: Network[],
  sel: Selection | null,
  name: string,
  addr: string,
): MutationResult {
  if (!sel) return reject(nets, sel, 'Nothing selected');
  const networks = cloneNetworks(nets);
  const net = networks[sel.n];
  const element = net ? resolveElement(net, sel) : null;
  if (!element) return reject(nets, sel, 'Nothing selected');

  element.sym = name;
  element.addr = addr;
  element.err = false;

  return {
    networks,
    selection: sel,
    statusMsg: `Bound to ${name}${addr ? ` (${addr})` : ''}`,
    changed: true,
  };
}

/** Change a contact or coil's modifier. Function blocks are not convertible. */
export function setElementType(
  nets: Network[],
  sel: Selection | null,
  type: ElementType,
): MutationResult {
  if (!sel) return reject(nets, sel, 'Nothing selected');
  const networks = cloneNetworks(nets);
  const net = networks[sel.n];
  if (!net) return reject(nets, sel, NOTHING_SELECTED);

  // Rules 6 and 7: a contact may only become an output where an output may
  // stand — last on its line, and on a line that reaches the rail. A function
  // block is refused outright, and so is a path that points at no element.
  const allowed = verdict(net.body, { kind: 'convert', path: sel.path ?? [] }, type);
  if (!allowed.ok) return reject(nets, sel, allowed.reason);

  const element = resolveElement(net, sel);
  if (!element) return reject(nets, sel, NOTHING_SELECTED);

  element.type = type;
  return {
    networks,
    selection: sel,
    statusMsg: `Changed to ${ELEMENT_LABEL[type]}`,
    changed: true,
  };
}

/** Edit a free-text field on the selected element. */
export function setElementField(
  nets: Network[],
  sel: Selection | null,
  key: 'sym' | 'addr' | 'pt',
  value: string,
): Network[] {
  if (!sel) return nets;
  const networks = cloneNetworks(nets);
  const net = networks[sel.n];
  const element = net ? resolveElement(net, sel) : null;
  if (!element) return nets;

  element[key] = value;
  element.err = false;
  return networks;
}

export { resolveElement };
