import type { ElementType } from '../models/ladderNode';
import type { Network } from '../models/network';
import { CH, type Hit } from './layout';
import { verdict, type Verdict, type Zone } from './legality';

/**
 * PLACEMENT PREVIEW — what a click would do, known before the click.
 *
 * ISPSoft shows the positions that will take an element rather than refusing
 * after the fact. This module is the domain half of that: it answers, for every
 * hit the layout produced, whether each way of clicking it would be accepted.
 *
 * It asks `verdict`, the same function the mutation asks at click time, and it
 * mirrors the store's routing exactly — a slot appends, a cell's sides insert,
 * a cell's lower band branches, and an armed branch branches wherever you point.
 * So the preview can never promise a position the click then refuses.
 *
 * It runs when the armed tool or the ladder changes, never when the pointer
 * moves. Moving the pointer is a lookup into the table built here.
 */

/** How the armed element will be used: placed by position, or branched by command. */
export type PreviewMode = 'tool' | 'branch';

/** The answer for each way of clicking one hit. A slot has no zones, only itself. */
export type HitAnswers = Partial<Record<Zone | 'slot', Verdict>>;

/** Answers for every hit, keyed by `Hit.key`. */
export type PreviewTable = Record<string, HitAnswers>;

export function previewLegality(
  networks: Network[],
  hits: Hit[],
  type: ElementType,
  mode: PreviewMode = 'tool',
): PreviewTable {
  const table: PreviewTable = {};

  for (const hit of hits) {
    const body = networks[hit.n]?.body;
    if (!body) continue;
    const path = hit.path ?? [];

    if (hit.kind === 'slot') {
      // An armed branch has nothing to branch from at a slot; the store refuses
      // and disarms, so there is nothing to preview there.
      if (mode === 'tool') table[hit.key] = { slot: verdict(body, { kind: 'slot', path }, type) };
      continue;
    }

    if (mode === 'branch') {
      // The branch command ignores position: every zone branches.
      const below = verdict(body, { kind: 'cell', path, zone: 'below' }, type);
      table[hit.key] = { left: below, right: below, below };
      continue;
    }

    const answers: HitAnswers = {
      left: verdict(body, { kind: 'cell', path, zone: 'left' }, type),
      right: verdict(body, { kind: 'cell', path, zone: 'right' }, type),
    };
    // Only a branchable cell has a lower band — see zoneAt.
    if (hit.branchable) answers.below = verdict(body, { kind: 'cell', path, zone: 'below' }, type);
    table[hit.key] = answers;
  }

  return table;
}

/** The answer for pointing at a hit in a zone, or null if the table says nothing. */
export const answerFor = (table: PreviewTable, hit: Hit, zone: Zone): Verdict | null => {
  const answers = table[hit.key];
  if (!answers) return null;
  return (hit.kind === 'slot' ? answers.slot : answers[zone]) ?? null;
};

/** Does a hit accept the armed element in at least one way? That is what earns it an outline. */
export const accepts = (answers: HitAnswers | undefined): boolean =>
  !!answers && Object.values(answers).some((v) => v?.ok);

/**
 * Where to draw the ghost of the element about to be placed.
 *
 * A slot and a branch show exactly where the element will land, since nothing
 * moves sideways to make room. An insert shows the boundary it goes in at —
 * drawing its true final column would mean laying out an imagined copy of the
 * whole ladder on every pointer move, which is the cost this preview avoids.
 */
export const ghostAt = (hit: Hit, zone: Zone): { cx: number; cy: number } => {
  if (hit.kind === 'slot') return { cx: (hit.xL + hit.xR) / 2, cy: hit.cy };
  if (zone === 'below') return { cx: (hit.xL + hit.xR) / 2, cy: hit.cy + CH };
  return { cx: zone === 'left' ? hit.xL : hit.xR, cy: hit.cy };
};
