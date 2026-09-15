import type { NodePath } from './ladderNode';

/**
 * What the user has clicked on.
 *
 * `cell` — an element inside a network body, addressed by path
 * `slot` — the empty insertion position at the end of a line
 *
 * Outputs need no kind of their own: a coil is an element in the tree like any
 * other, so it is a `cell` with a path (rule 6).
 */
export interface Selection {
  /** Index of the network within the program. */
  n: number;
  kind: 'cell' | 'slot';
  /** Path into the network body. */
  path?: NodePath;
}

/** Which side of an element an insertion lands on. */
export type InsertSide = 'left' | 'right';
