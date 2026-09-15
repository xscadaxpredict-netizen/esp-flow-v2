import type { LadderElement, LadderNode, NodePath, SeriesNode } from '../models/ladderNode';
import type { Network } from '../models/network';

/**
 * Walk a path from a network body. Returns null rather than throwing when the
 * path has gone stale, which happens routinely after a mutation reshapes the tree.
 */
export const nodeAt = (root: SeriesNode, path: NodePath): LadderNode | null => {
  let n: LadderNode = root;
  for (const i of path) {
    if (n.t === 'el') return null;
    const next: LadderNode | undefined = n.kids[i];
    if (!next) return null;
    n = next;
  }
  return n;
};

/** Resolve a path to an element, or null if it points at a structural node. */
export const elementAt = (root: SeriesNode, path: NodePath): LadderElement | null => {
  const n = nodeAt(root, path);
  return n && n.t === 'el' ? n : null;
};

/**
 * Locate an element by id, returning its current path.
 *
 * A remembered path goes stale the moment a mutation reshapes the tree — pruning
 * a deletion moves the survivors. Identity outlives that; a path does not.
 */
export const pathOfElement = (root: SeriesNode, id: string): NodePath | null => {
  const walk = (n: LadderNode, p: NodePath): NodePath | null => {
    if (n.t === 'el') return n.id === id ? p : null;
    const kids = n.kids as LadderNode[];
    for (let i = 0; i < kids.length; i += 1) {
      const hit = walk(kids[i], p.concat(i));
      if (hit) return hit;
    }
    return null;
  };
  return walk(root, []);
};

export const cloneNode = <T extends LadderNode>(n: T): T =>
  (n.t === 'el' ? { ...n } : { t: n.t, kids: (n.kids as LadderNode[]).map(cloneNode) }) as T;

export const cloneNetwork = (net: Network): Network => ({
  ...net,
  body: cloneNode(net.body),
});

export const cloneNetworks = (nets: Network[]): Network[] => nets.map(cloneNetwork);
