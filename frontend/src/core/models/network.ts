import type { SeriesNode } from './ladderNode';

/**
 * A NETWORK (rung).
 *
 * IEC 61131-3 calls it a network; ladder tradition calls it a rung. Networks
 * execute strictly top to bottom, and within a network, left to right — that
 * ordering is semantic, not cosmetic.
 *
 * `body` is the whole rung, outputs included. A coil is an ordinary element
 * that ends the line it sits on and reaches the right rail (rule 6), which is
 * what lets two outputs in one rung carry different conditions.
 */
export interface Network {
  id: string;
  comment: string;
  body: SeriesNode;
}
