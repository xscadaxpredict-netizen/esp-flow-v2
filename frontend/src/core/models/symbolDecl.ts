/**
 * SYMBOL DECLARATION
 *
 * The local symbols table is the IEC 61131-3 variable declaration: a named,
 * typed piece of memory, optionally located at a hardware address.
 *
 * This table is the single source of truth for addresses and data types. The
 * Properties panel mirrors them read-only — an element carries a symbol name,
 * and its address follows from the declaration, never the other way round.
 */

/** The declaration block a variable belongs to, which fixes its role. */
export type VarClass =
  | 'VAR'
  | 'VAR_INPUT'
  | 'VAR_OUTPUT'
  | 'VAR_IN_OUT'
  | 'VAR_TEMP'
  | 'VAR_GLOBAL'
  | 'VAR_EXTERNAL';

export interface SymbolDecl {
  /** Declaration block: VAR, VAR_INPUT, VAR_OUTPUT ... */
  cls: VarClass;
  /** Identifier used in the program. */
  name: string;
  /** Direct address (%IX0.0, %QW4) when located; empty when unlocated. */
  addr: string;
  /** BOOL, INT, REAL, TIME, or a function block type such as TON. */
  type: string;
  /** Initial value. Every IEC variable has one, explicit or by type default. */
  init: string;
  cmt: string;
  /** Value survives a power cycle. */
  retain?: boolean;
}

/** A declaration whose type is a function block is an instance, not a plain variable. */
export const FB_TYPES = ['TON', 'TOF', 'TP', 'CTU', 'CTD', 'CTUD', 'R_TRIG', 'F_TRIG', 'SR', 'RS'];

export const isFunctionBlockType = (type: string): boolean => FB_TYPES.includes(type);
