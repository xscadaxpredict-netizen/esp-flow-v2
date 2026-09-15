import type {
  LadderElement,
  LadderNode,
  ParallelNode,
  SeriesNode,
} from '../../models/ladderNode';
import type { Network } from '../../models/network';

/**
 * Shared scaffolding for the ladder tests.
 *
 * The narrowing helpers throw rather than return null so a test that reaches
 * for the wrong kind of node fails with a sentence, not with `undefined`.
 */

let seq = 0;

/** A network with a fixed id, so a whole tree can be compared by value. */
export const rung = (body: SeriesNode): Network => ({
  id: `net${(seq += 1)}`,
  comment: '',
  body,
});

export const asElement = (n: LadderNode | null): LadderElement => {
  if (!n || n.t !== 'el') throw new Error(`expected an element, got ${n ? n.t : 'nothing'}`);
  return n;
};

export const asSeries = (n: LadderNode | null): SeriesNode => {
  if (!n || n.t !== 'ser') throw new Error(`expected a line, got ${n ? n.t : 'nothing'}`);
  return n;
};

export const asParallel = (n: LadderNode | null): ParallelNode => {
  if (!n || n.t !== 'par') throw new Error(`expected a block, got ${n ? n.t : 'nothing'}`);
  return n;
};

/** A two-cell TON, the only element that is wider than one column. */
export const fb = (sym = 'Timer1'): LadderElement => ({
  t: 'el',
  id: `fb${(seq += 1)}`,
  type: 'fb',
  sym,
  addr: '',
  fb: 'TON',
  pt: 'T#5s',
  span: 2,
});
