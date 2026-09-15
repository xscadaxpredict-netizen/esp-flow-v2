import type { LadderNode } from '../models/ladderNode';

/**
 * WIDTH IS INTRINSIC — never stored, never bookkept.
 *
 * A series is the sum of its children's widths; a parallel is the max of its
 * levels'. This single rule is why a branch spans exactly its parent, and why
 * inserting an element inside a block widens every other level's filler wire
 * automatically. Nothing anywhere updates a span by hand.
 */
export const width = (n: LadderNode): number =>
  n.t === 'el'
    ? n.span ?? 1
    : n.t === 'ser'
      ? Math.max(1, n.kids.reduce((sum, k) => sum + width(k), 0))
      : Math.max(1, ...n.kids.map(width));

/** Rows occupied. Series takes the tallest child; parallel stacks its levels. */
export const height = (n: LadderNode): number =>
  n.t === 'el'
    ? 1
    : n.t === 'ser'
      ? Math.max(1, ...n.kids.map(height))
      : n.kids.reduce((sum, k) => sum + height(k), 0);
