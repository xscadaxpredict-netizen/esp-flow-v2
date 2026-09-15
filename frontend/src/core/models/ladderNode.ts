/**
 * THE LADDER MODEL
 *
 * A network (rung) is a series/parallel tree, never a flat grid.
 *
 *   - A SERIES node holds children evaluated left to right   -> logical AND
 *   - A PARALLEL node holds levels evaluated top to bottom   -> logical OR
 *   - ELEMENTS (contacts, coils, function blocks) are leaves
 *
 * Everything else falls out of that shape. A branch's displayed span is the
 * width of its parent because width is computed from structure, never stored;
 * inserting into one level widens the whole block automatically; deleting
 * closes the gap and collapses a parallel left with a single level.
 *
 * See documentation/reference/rules/LD building.txt and the IEC 61131-3 primer.
 */

/** Contacts read a boolean variable and gate power flow. */
export type ContactType = 'no' | 'nc' | 'p' | 'n';

/** Coils write the power-flow state to a boolean variable. */
export type CoilType = 'coil' | 'set' | 'reset';

export type ElementType = ContactType | CoilType | 'fb';

export interface LadderElement {
  t: 'el';
  id: string;
  type: ElementType;
  /** The declared symbol this element reads or writes. Empty until bound. */
  sym: string;
  /** Mirror of the symbol's declared address. Never edited directly. */
  addr: string;
  /** Cells occupied. Function blocks are wider than a contact. */
  span?: number;
  /** Function block type name, e.g. 'TON'. Only set when type === 'fb'. */
  fb?: string;
  /** Preset literal for timers, e.g. 'T#5s'. */
  pt?: string;
  /** Carries a diagnostic. Cleared as soon as the element is edited. */
  err?: boolean;
  /** Value is forced during commissioning. Online mode only. */
  forced?: boolean;
}

/** Children evaluated left to right. AND. */
export interface SeriesNode {
  t: 'ser';
  kids: SeriesChild[];
}

/** Levels evaluated top to bottom. OR. Every level is itself a series. */
export interface ParallelNode {
  t: 'par';
  kids: SeriesNode[];
}

/** A series may hold elements and branch blocks, never another bare series. */
export type SeriesChild = LadderElement | ParallelNode;

export type LadderNode = LadderElement | SeriesNode | ParallelNode;

/**
 * Addresses a node by its index at each level, walked from a network body.
 * `[]` is the body itself; `[1, 0, 2]` is child 1, then level 0, then child 2.
 */
export type NodePath = number[];

export const isElement = (n: LadderNode): n is LadderElement => n.t === 'el';
export const isSeries = (n: LadderNode): n is SeriesNode => n.t === 'ser';
export const isParallel = (n: LadderNode): n is ParallelNode => n.t === 'par';

export const isContact = (type: ElementType): type is ContactType =>
  type === 'no' || type === 'nc' || type === 'p' || type === 'n';

export const isCoil = (type: ElementType): type is CoilType =>
  type === 'coil' || type === 'set' || type === 'reset';

/** Human-readable element names, used in status messages and tooltips. */
export const ELEMENT_LABEL: Record<ElementType, string> = {
  no: 'NO contact',
  nc: 'NC contact',
  p: 'rising-edge contact',
  n: 'falling-edge contact',
  coil: 'output coil',
  set: 'set coil',
  reset: 'reset coil',
  fb: 'function block',
};
