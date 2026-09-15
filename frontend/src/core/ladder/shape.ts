import { isCoil, type LadderNode, type NodePath, type SeriesNode } from '../models/ladderNode';
import { nodeAt } from './path';

/**
 * STRUCTURAL PREDICATES — questions about the shape of a tree.
 *
 * Nothing here asks what a symbol means or what a value is, so all of it stays
 * on the browser's side of ADR-001.
 */

/**
 * Does power stop here rather than carry on?
 *
 * Rule 6: a coil ends the line it sits on and reaches the right rail. Rule 7: a
 * block ends its line when every one of its legs does. An empty line ends
 * nothing — it is a plain wire.
 */
export const terminates = (n: LadderNode): boolean => {
  if (n.t === 'el') return isCoil(n.type);
  if (n.t === 'ser') return n.kids.length > 0 && terminates(n.kids[n.kids.length - 1]);
  return n.kids.length > 0 && n.kids.every(terminates);
};

/** Does this tree hold an output anywhere? */
export const hasOutput = (n: LadderNode): boolean =>
  n.t === 'el' ? isCoil(n.type) : (n.kids as LadderNode[]).some(hasOutput);

/**
 * May the line at this path legally end in an output?
 *
 * Rules 6 and 7 together. Terminating a line is only legal if power can actually
 * get from there to the right rail, which means walking outward: every sibling
 * leg of the block holding this line must already terminate, that block must be
 * the last thing on the line holding *it*, and so on up to the rung.
 *
 * Without this a coil can be dropped into one leg of a block that rejoins and
 * carries on, which draws an output stranded in the middle of a rung.
 */
export const canTerminate = (root: SeriesNode, linePath: NodePath): boolean => {
  let p = linePath;
  for (;;) {
    if (p.length === 0) return true; // the rung itself always reaches the rail

    const block = nodeAt(root, p.slice(0, -1));
    const leg = p[p.length - 1];
    if (!block || block.t !== 'par') return false;
    if (block.kids.some((k, i) => i !== leg && !terminates(k))) return false;

    const holderPath = p.slice(0, -2);
    const idx = p[p.length - 2];
    const holder = holderPath.length ? nodeAt(root, holderPath) : root;
    if (!holder || holder.t !== 'ser') return false;
    if (idx !== holder.kids.length - 1) return false;

    p = holderPath;
  }
};
