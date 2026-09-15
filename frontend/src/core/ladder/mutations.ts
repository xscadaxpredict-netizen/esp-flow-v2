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
import { el, newElement, newNetwork, par, ser } from './builders';
import { cloneNetworks, nodeAt, pathOfElement } from './path';
import { canTerminate, terminates } from './shape';
import { width } from './span';

/**
 * Every mutation returns the new network list, where the selection should land,
 * and the sentence the status bar reports. A rejected mutation returns the
 * networks unchanged with `changed: false` and an explanatory message — the
 * editor tells you why nothing happened rather than silently doing nothing.
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

/** Rule 6, in the one sentence the status bar shows when it is broken. */
const OUTPUT_ENDS_LINE = 'An output ends its line — nothing can follow it';

/** Rule 7, for a coil dropped where power cannot reach the rail. */
const OUTPUT_CANNOT_REACH_RAIL =
  'An output must reach the right rail — this branch rejoins and the rung carries on';

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

  const element = newElement(type, n);

  if (!path || path.length === 0) {
    if (terminates(net.body)) return reject(nets, selection, OUTPUT_ENDS_LINE);
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
  const owner = nodeAt(net.body, ppath);
  if (!owner || owner.t !== 'ser') return reject(nets, selection, 'Cannot insert there');

  const at = Math.max(0, Math.min(side === 'left' ? idx : idx + 1, owner.kids.length));
  const atEnd = at === owner.kids.length;

  // Rule 6. An output only ever lands at the end of a line that has none, and
  // nothing at all lands after one.
  if (isCoilType(type) ? !atEnd || terminates(owner) : atEnd && terminates(owner)) {
    return reject(nets, selection, OUTPUT_ENDS_LINE);
  }

  // Rule 7. Ending this line is only legal if power can get from here to the
  // rail — a leg of a block that rejoins and carries on cannot hold an output.
  if (isCoilType(type) && !canTerminate(net.body, ppath)) {
    return reject(nets, selection, OUTPUT_CANNOT_REACH_RAIL);
  }

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

  const owner = ppath.length ? nodeAt(net.body, ppath) : net.body;
  if (!owner || owner.t !== 'ser') return reject(nets, selection, 'Cannot append there');
  if (terminates(owner)) return reject(nets, selection, OUTPUT_ENDS_LINE);
  if (isCoilType(type) && !canTerminate(net.body, ppath)) {
    return reject(nets, selection, OUTPUT_CANNOT_REACH_RAIL);
  }

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

  const ppath = path.slice(0, -1);
  const idx = path[path.length - 1];
  const owner = nodeAt(net.body, ppath);
  if (!owner || owner.t !== 'ser') return reject(nets, selection, 'Cannot branch from there');

  const target = owner.kids[idx];
  if (!target) return reject(nets, selection, 'Nothing to branch from there');
  if (target.t === 'el' && target.type === 'fb') {
    return reject(nets, selection, 'Function blocks cannot be branched');
  }

  // Rule 7: a new leg must terminate exactly as its siblings do, so the armed
  // tool has to match what it is branching from.
  const targetIsOutput = target.t === 'el' && isCoil(target.type);
  if (targetIsOutput !== isCoilType(armType)) {
    return reject(
      nets,
      selection,
      targetIsOutput
        ? 'Branching an output needs another output — pick a coil'
        : 'An output cannot branch a contact — every leg must end the same way',
    );
  }

  // The clicked element is the entire line inside a block.
  if (ppath.length >= 2 && owner.kids.length === 1) {
    const parPath = ppath.slice(0, -1);
    const lvl = ppath[ppath.length - 1];
    const block = nodeAt(net.body, parPath);
    if (block && block.t === 'par') {
      const w = width(block);
      (block as ParallelNode).kids.splice(lvl + 1, 0, ser(el(armType)));
      return {
        networks,
        selection: { n, kind: 'cell', path: parPath.concat(lvl + 1, 0) },
        statusMsg: `Branch spans its parent — ${plural(w, 'element')}; insert inside the block to widen it`,
        changed: true,
      };
    }
  }

  const span = width(target);
  owner.kids[idx] = par(ser(target), ser(el(armType)));
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
  const element = net ? resolveElement(net, sel) : null;
  if (!element) return reject(nets, sel, 'Nothing selected');
  if (element.type === 'fb') return reject(nets, sel, 'A function block cannot be converted');

  // Rules 6 and 7: a contact may only become an output where an output may
  // stand — last on its line, and on a line that reaches the rail.
  if (isCoilType(type) && !isCoilType(element.type)) {
    const ppath = (sel.path ?? []).slice(0, -1);
    const idx = (sel.path ?? []).length - 1;
    const owner = ppath.length ? nodeAt(net.body, ppath) : net.body;
    const last = owner && owner.t === 'ser' && (sel.path ?? [])[idx] === owner.kids.length - 1;
    if (!last) return reject(nets, sel, OUTPUT_ENDS_LINE);
    if (!canTerminate(net.body, ppath)) return reject(nets, sel, OUTPUT_CANNOT_REACH_RAIL);
  }

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
