import { isCoil, type ElementType, type NodePath, type SeriesNode } from '../models/ladderNode';
import type { InsertSide } from '../models/selection';
import { nodeAt } from './path';
import { canTerminate, terminates } from './shape';

/**
 * MAY THIS GO HERE? — the one place that answers it.
 *
 * Rules 6 and 7 are asked in four different moments: inserting beside an
 * element, appending at a trailing slot, branching below one, and converting a
 * contact into an output. They used to be written out at each of those four
 * call sites, which is three chances for the copies to drift.
 *
 * They are asked in a fifth moment too, and that is the reason this module
 * exists: the canvas wants to show which positions will accept the armed tool
 * *before* the click, so `layout.ts` asks exactly the same question the
 * mutation will ask a moment later. One implementation, so the preview can
 * never promise something the mutation then refuses.
 *
 * Nothing here mutates and nothing here knows what a symbol means, so all of it
 * stays on the browser's side of ADR-001.
 */

/** Where the pointer is within an element: which side to insert, or below to branch. */
export type Zone = InsertSide | 'below';

export type Intent =
  /** Place beside the element at `path`, on the given side, or branch below it. */
  | { kind: 'cell'; path: NodePath; zone: Zone }
  /** Append at the trailing slot of the series at `path`. `[]` is the rung itself. */
  | { kind: 'slot'; path: NodePath }
  /** Change the element at `path` into another type. */
  | { kind: 'convert'; path: NodePath };

/** Legal, or refused with the sentence the status bar shows. */
export type Verdict = { ok: true } | { ok: false; reason: string };

/* ── the sentences ──────────────────────────────────────────────
   Every refusal names the rule in words an engineer can act on. A control that
   appears to do nothing is the defect class this project has been bitten by
   three times, so nothing here refuses silently. */

export const OUTPUT_ENDS_LINE = 'An output ends its line — nothing can follow it';
export const OUTPUT_CANNOT_REACH_RAIL =
  'An output must reach the right rail — this branch rejoins and the rung carries on';
export const NO_INSERT_POINT = 'Cannot insert there';
export const NO_APPEND_POINT = 'Cannot append there';
export const NO_BRANCH_POINT = 'Cannot branch from there';
export const NOTHING_TO_BRANCH = 'Nothing to branch from there';
export const FB_NOT_BRANCHABLE = 'Function blocks cannot be branched';
export const FB_NOT_CONVERTIBLE = 'A function block cannot be converted';
export const BRANCH_NEEDS_OUTPUT = 'Branching an output needs another output — pick a coil';
export const BRANCH_NEEDS_CONTACT =
  'An output cannot branch a contact — every leg must end the same way';
export const NOTHING_SELECTED = 'Nothing selected';

const OK: Verdict = { ok: true };
const no = (reason: string): Verdict => ({ ok: false, reason });

/* ── shared resolution, so the check and the edit agree ─────────── */

/** The series that owns a position, or null if the path does not lead to one. */
export const seriesAt = (body: SeriesNode, ppath: NodePath): SeriesNode | null => {
  const owner = ppath.length ? nodeAt(body, ppath) : body;
  return owner && owner.t === 'ser' ? owner : null;
};

/** Where an insertion beside `idx` lands, given the side clicked. */
export const insertIndex = (ownerLen: number, idx: number, zone: Zone): number =>
  Math.max(0, Math.min(zone === 'left' ? idx : idx + 1, ownerLen));

/* ── the question ───────────────────────────────────────────────── */

export function verdict(body: SeriesNode, intent: Intent, type: ElementType): Verdict {
  if (intent.kind === 'slot') {
    const owner = seriesAt(body, intent.path);
    if (!owner) return no(NO_APPEND_POINT);

    // Rule 6: nothing follows an output, so a finished line offers nothing.
    if (terminates(owner)) return no(OUTPUT_ENDS_LINE);

    // Rule 7: ending a line is only legal where power can reach the rail.
    if (isCoil(type) && !canTerminate(body, intent.path)) return no(OUTPUT_CANNOT_REACH_RAIL);
    return OK;
  }

  const ppath = intent.path.slice(0, -1);
  const pos = intent.path[intent.path.length - 1];

  if (intent.kind === 'convert') {
    const element = nodeAt(body, intent.path);
    if (!element || element.t !== 'el') return no(NOTHING_SELECTED);
    if (element.type === 'fb') return no(FB_NOT_CONVERTIBLE);

    // Only *becoming* an output moves the rules. A contact may stand wherever an
    // element already stands, and a coil already sits where a coil may sit.
    if (!isCoil(type) || isCoil(element.type)) return OK;

    const owner = seriesAt(body, ppath);
    if (!owner || pos !== owner.kids.length - 1) return no(OUTPUT_ENDS_LINE);
    if (!canTerminate(body, ppath)) return no(OUTPUT_CANNOT_REACH_RAIL);
    return OK;
  }

  const owner = seriesAt(body, ppath);

  if (intent.zone === 'below') {
    if (!owner) return no(NO_BRANCH_POINT);
    const target = owner.kids[pos];
    if (!target) return no(NOTHING_TO_BRANCH);
    if (target.t === 'el' && target.type === 'fb') return no(FB_NOT_BRANCHABLE);

    // Rule 7: a new leg must terminate exactly as its siblings do.
    const targetIsOutput = target.t === 'el' && isCoil(target.type);
    if (targetIsOutput !== isCoil(type)) {
      return no(targetIsOutput ? BRANCH_NEEDS_OUTPUT : BRANCH_NEEDS_CONTACT);
    }
    return OK;
  }

  if (!owner) return no(NO_INSERT_POINT);

  const at = insertIndex(owner.kids.length, pos, intent.zone);
  const atEnd = at === owner.kids.length;

  // Rule 6, both directions: an output only ever lands at the end of a line that
  // has none, and nothing at all lands after one.
  if (isCoil(type) ? !atEnd || terminates(owner) : atEnd && terminates(owner)) {
    return no(OUTPUT_ENDS_LINE);
  }

  // Rule 7, as above.
  if (isCoil(type) && !canTerminate(body, ppath)) return no(OUTPUT_CANNOT_REACH_RAIL);
  return OK;
}

/** Convenience for callers that only want the yes/no. */
export const allows = (body: SeriesNode, intent: Intent, type: ElementType): boolean =>
  verdict(body, intent, type).ok;
