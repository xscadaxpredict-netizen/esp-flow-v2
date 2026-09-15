import type { LadderElement, LadderNode } from '../models/ladderNode';

/** Live values keyed by symbol name, as delivered by the device during monitoring. */
export type ValueMap = Record<string, number | boolean | undefined>;

export const valueOf = (values: ValueMap, sym: string): boolean => !!values[sym];

/**
 * Does power pass through this element?
 *
 * Edge contacts (`p`, `n`) conduct for a single scan, and telling that scan from
 * any other needs the previous value, which only the device holds. Until
 * monitoring delivers scan history they are drawn dead, as the design prototype
 * has them: showing no flow is the safer of the two available wrong answers.
 */
export const passes = (el: LadderElement | null | undefined, values: ValueMap): boolean => {
  if (!el) return false;
  const v = valueOf(values, el.sym);
  switch (el.type) {
    case 'no':
      return v;
    case 'nc':
      return !v;
    case 'p':
    case 'n':
      return false;
    case 'fb':
      // The block's output is reported by the device like any other symbol.
      return v;
    default:
      // Rule 6: a coil is transparent. It is written by the flow that reaches
      // it and never gates that flow. Asking a coil whether power passes would
      // be circular, since the arriving power is what sets its value.
      return true;
  }
};

/**
 * Power flow through the tree: series is AND over children, parallel is OR over
 * levels. An empty series conducts — an empty rung is a closed circuit.
 *
 * The set of nodes reached with power true is the conducting path, which is what
 * online monitoring highlights.
 */
export const conducts = (n: LadderNode, values: ValueMap): boolean =>
  n.t === 'el'
    ? passes(n, values)
    : n.t === 'ser'
      ? n.kids.every((k) => conducts(k, values))
      : n.kids.some((k) => conducts(k, values));
