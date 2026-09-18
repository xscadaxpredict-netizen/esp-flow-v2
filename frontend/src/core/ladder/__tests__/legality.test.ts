import { describe, expect, it } from 'vitest';
import type { ElementType, SeriesNode } from '../../models/ladderNode';
import { el, par, ser } from '../builders';
import {
  BRANCH_NEEDS_CONTACT,
  BRANCH_NEEDS_OUTPUT,
  FB_NOT_BRANCHABLE,
  FB_NOT_CONVERTIBLE,
  insertIndex,
  NO_INSERT_POINT,
  NOTHING_SELECTED,
  NOTHING_TO_BRANCH,
  OUTPUT_CANNOT_REACH_RAIL,
  OUTPUT_ENDS_LINE,
  seriesAt,
  verdict,
  type Intent,
} from '../legality';
import { appendTo, branchAt, placeAt, setElementType } from '../mutations';
import { fb, rung } from './helpers';

/**
 * LEGALITY — the one place that answers "may this go here?".
 *
 * The rules themselves are pinned by outputs.test.ts and branch.test.ts. What
 * this file protects is the *contract*: that the answer given before a click is
 * the same answer the mutation gives after one. The canvas is about to draw
 * legal positions from `verdict`, and a preview that promises something the
 * mutation then refuses is worse than no preview at all.
 */

const refusal = (body: SeriesNode, intent: Intent, type: ElementType): string => {
  const v = verdict(body, intent, type);
  return v.ok ? '' : v.reason;
};

describe('the verdict and the mutation never disagree', () => {
  /**
   * Each case is a tree, an intent, and the type being placed. Both sides are
   * run and compared — verdict's yes/no against the mutation's `changed`, and
   * its sentence against the mutation's `statusMsg`.
   */
  const cases: { name: string; body: () => SeriesNode; intent: Intent; type: ElementType }[] = [
    {
      name: 'contact after a contact',
      body: () => ser(el('no', 'A'), el('no', 'B')),
      intent: { kind: 'cell', path: [0], zone: 'right' },
      type: 'no',
    },
    {
      name: 'contact after an output',
      body: () => ser(el('no', 'A'), el('coil', 'M')),
      intent: { kind: 'cell', path: [1], zone: 'right' },
      type: 'no',
    },
    {
      name: 'contact before an output',
      body: () => ser(el('no', 'A'), el('coil', 'M')),
      intent: { kind: 'cell', path: [1], zone: 'left' },
      type: 'nc',
    },
    {
      name: 'output mid-line',
      body: () => ser(el('no', 'A'), el('no', 'B')),
      intent: { kind: 'cell', path: [0], zone: 'right' },
      type: 'coil',
    },
    {
      name: 'second output in series',
      body: () => ser(el('no', 'A'), el('coil', 'M')),
      intent: { kind: 'cell', path: [1], zone: 'right' },
      type: 'coil',
    },
    {
      name: 'output on a leg that rejoins',
      body: () => ser(el('no', 'A'), par(ser(el('no', 'X')), ser(el('no', 'Y'))), el('coil', 'M')),
      intent: { kind: 'cell', path: [1, 1, 0], zone: 'right' },
      type: 'coil',
    },
    {
      name: 'append to the rung',
      body: () => ser(el('no', 'A')),
      intent: { kind: 'slot', path: [] },
      type: 'coil',
    },
    {
      name: 'append to a finished rung',
      body: () => ser(el('no', 'A'), el('coil', 'M')),
      intent: { kind: 'slot', path: [] },
      type: 'no',
    },
    {
      name: 'append an output to a rejoining leg',
      body: () => ser(par(ser(el('no', 'A')), ser(el('no', 'B')))),
      intent: { kind: 'slot', path: [0, 1] },
      type: 'coil',
    },
    {
      name: 'append an output to the last leg once its siblings terminate',
      body: () => ser(el('no', 'A'), par(ser(el('coil', 'M1')), ser(el('no', 'B')))),
      intent: { kind: 'slot', path: [1, 1] },
      type: 'coil',
    },
    {
      name: 'branch a contact with a contact',
      body: () => ser(el('no', 'A'), el('coil', 'M')),
      intent: { kind: 'cell', path: [0], zone: 'below' },
      type: 'no',
    },
    {
      name: 'branch a contact with an output',
      body: () => ser(el('no', 'A'), el('coil', 'M')),
      intent: { kind: 'cell', path: [0], zone: 'below' },
      type: 'coil',
    },
    {
      name: 'branch an output with a contact',
      body: () => ser(el('no', 'A'), el('coil', 'M')),
      intent: { kind: 'cell', path: [1], zone: 'below' },
      type: 'no',
    },
    {
      name: 'branch an output with an output',
      body: () => ser(el('no', 'A'), el('coil', 'M')),
      intent: { kind: 'cell', path: [1], zone: 'below' },
      type: 'coil',
    },
    {
      name: 'branch a function block',
      body: () => ser(fb()),
      intent: { kind: 'cell', path: [0], zone: 'below' },
      type: 'no',
    },
    {
      name: 'branch a path that points at nothing',
      body: () => ser(el('no', 'A')),
      intent: { kind: 'cell', path: [7], zone: 'below' },
      type: 'no',
    },
    {
      name: 'convert the last contact into an output',
      body: () => ser(el('no', 'A'), el('no', 'B')),
      intent: { kind: 'convert', path: [1] },
      type: 'coil',
    },
    {
      name: 'convert a mid-line contact into an output',
      body: () => ser(el('no', 'A'), el('no', 'B'), el('coil', 'M')),
      intent: { kind: 'convert', path: [0] },
      type: 'coil',
    },
    {
      name: 'convert a contact on a rejoining leg into an output',
      body: () => ser(el('no', 'A'), par(ser(el('no', 'X')), ser(el('no', 'Y'))), el('coil', 'M')),
      intent: { kind: 'convert', path: [1, 1, 0] },
      type: 'coil',
    },
    {
      name: 'convert a contact into another contact',
      body: () => ser(el('no', 'A'), el('no', 'B')),
      intent: { kind: 'convert', path: [0] },
      type: 'nc',
    },
    {
      name: 'convert a function block',
      body: () => ser(fb()),
      intent: { kind: 'convert', path: [0] },
      type: 'nc',
    },
  ];

  /** Run the mutation that the given intent stands for. */
  const mutate = (body: SeriesNode, intent: Intent, type: ElementType) => {
    const nets = [rung(body)];
    if (intent.kind === 'slot') return appendTo(nets, 0, intent.path, type, null);
    if (intent.kind === 'convert') {
      return setElementType(nets, { n: 0, kind: 'cell', path: intent.path }, type);
    }
    if (intent.zone === 'below') return branchAt(nets, 0, intent.path, type, null);
    return placeAt(nets, 0, intent.path, intent.zone, type, null);
  };

  it.each(cases)('agrees about $name', ({ body, intent, type }) => {
    const asked = verdict(body(), intent, type);
    const done = mutate(body(), intent, type);

    expect(asked.ok).toBe(done.changed);
    if (!asked.ok) expect(done.statusMsg).toBe(asked.reason);
  });

  it('covers both answers, so the comparison means something', () => {
    const answers = cases.map((c) => verdict(c.body(), c.intent, c.type).ok);
    expect(answers).toContain(true);
    expect(answers).toContain(false);
  });
});

describe('what each refusal says', () => {
  it('names rule 6 when something would follow an output', () => {
    const body = ser(el('no', 'A'), el('coil', 'M'));
    expect(refusal(body, { kind: 'cell', path: [1], zone: 'right' }, 'no')).toBe(OUTPUT_ENDS_LINE);
    expect(refusal(body, { kind: 'slot', path: [] }, 'no')).toBe(OUTPUT_ENDS_LINE);
  });

  it('names rule 7 when power could not reach the rail', () => {
    const body = ser(par(ser(el('no', 'A')), ser(el('no', 'B'))));
    expect(refusal(body, { kind: 'slot', path: [0, 1] }, 'coil')).toBe(OUTPUT_CANNOT_REACH_RAIL);
  });

  it('names the mismatch when a branch would not end like its siblings', () => {
    const body = ser(el('no', 'A'), el('coil', 'M'));
    expect(refusal(body, { kind: 'cell', path: [0], zone: 'below' }, 'coil')).toBe(
      BRANCH_NEEDS_CONTACT,
    );
    expect(refusal(body, { kind: 'cell', path: [1], zone: 'below' }, 'no')).toBe(
      BRANCH_NEEDS_OUTPUT,
    );
  });

  it('names the function block, which is neither branchable nor convertible', () => {
    const body = ser(fb());
    expect(refusal(body, { kind: 'cell', path: [0], zone: 'below' }, 'no')).toBe(FB_NOT_BRANCHABLE);
    expect(refusal(body, { kind: 'convert', path: [0] }, 'nc')).toBe(FB_NOT_CONVERTIBLE);
  });

  it('says so plainly when the path leads nowhere', () => {
    const body = ser(el('no', 'A'));
    expect(refusal(body, { kind: 'cell', path: [7], zone: 'below' }, 'no')).toBe(NOTHING_TO_BRANCH);
    expect(refusal(body, { kind: 'cell', path: [0, 4], zone: 'right' }, 'no')).toBe(NO_INSERT_POINT);
    expect(refusal(body, { kind: 'convert', path: [7] }, 'nc')).toBe(NOTHING_SELECTED);
  });
});

describe('a contact may go where an element already is', () => {
  it('allows either side of a mid-line contact', () => {
    const body = ser(el('no', 'A'), el('no', 'B'), el('coil', 'M'));
    expect(verdict(body, { kind: 'cell', path: [1], zone: 'left' }, 'no').ok).toBe(true);
    expect(verdict(body, { kind: 'cell', path: [1], zone: 'right' }, 'no').ok).toBe(true);
  });

  it('allows a contact on a leg that rejoins, where an output is refused', () => {
    const body = ser(par(ser(el('no', 'A')), ser(el('no', 'B'))), el('coil', 'M'));
    const leg: Intent = { kind: 'slot', path: [0, 1] };

    expect(verdict(body, leg, 'no').ok).toBe(true);
    expect(verdict(body, leg, 'coil').ok).toBe(false);
  });
});

describe('the shared resolution helpers', () => {
  it('insertIndex puts left before and right after, clamped to the line', () => {
    expect(insertIndex(3, 1, 'left')).toBe(1);
    expect(insertIndex(3, 1, 'right')).toBe(2);
    expect(insertIndex(3, 2, 'right')).toBe(3);
    expect(insertIndex(3, 9, 'right')).toBe(3);
    expect(insertIndex(3, -4, 'left')).toBe(0);
  });

  it('seriesAt treats the empty path as the rung itself', () => {
    const body = ser(el('no', 'A'), par(ser(el('no', 'X'))));
    expect(seriesAt(body, [])).toBe(body);
    expect(seriesAt(body, [1, 0])?.t).toBe('ser');
  });

  it('seriesAt returns null for a path that lands on anything else', () => {
    const body = ser(el('no', 'A'), par(ser(el('no', 'X'))));
    expect(seriesAt(body, [0])).toBeNull(); // an element
    expect(seriesAt(body, [1])).toBeNull(); // a block
    expect(seriesAt(body, [9])).toBeNull(); // nowhere
  });
});
