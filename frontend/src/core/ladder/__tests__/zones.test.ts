import { describe, expect, it } from 'vitest';
import type { SeriesNode } from '../../models/ladderNode';
import { el, par, ser } from '../builders';
import { BRANCH_BAND, layoutLadder, zoneAt, type Hit } from '../layout';
import { fb, rung } from './helpers';

/**
 * WHERE YOU POINT IS WHAT YOU MEAN.
 *
 * ISPSoft has one contact tool and reads the pointer's position: "the mouse
 * cursor appears as a contact when the mouse cursor is at the right side of a
 * contact, at the left side of a contact, or at the bottom of a contact...
 * bottom connects in parallel."
 *   — documentation/reference/rules/ispsoft-behaviour.md §1
 *
 * These pin the bands themselves. That the resulting branch is legal at all is
 * legality.ts's job, and is tested there.
 */

const hitsOf = (body: SeriesNode): Hit[] =>
  layoutLadder({ networks: [rung(body)], values: {}, online: false, selection: null }).hits;

const cellAt = (body: SeriesNode, path: number[]): Hit => {
  const want = path.join('.');
  const hit = hitsOf(body).find((h) => h.kind === 'cell' && (h.path ?? []).join('.') === want);
  if (!hit) throw new Error(`no cell hit at [${want}]`);
  return hit;
};

describe('the three bands of a cell', () => {
  const cell = () => cellAt(ser(el('no', 'A'), el('coil', 'M')), [0]);

  it('reads the lower band as a branch', () => {
    const h = cell();
    expect(zoneAt(h, h.w / 2, h.h - 1)).toBe('below');
    expect(zoneAt(h, h.w / 2, h.h - BRANCH_BAND)).toBe('below');
  });

  it('reads the left half above that band as inserting before', () => {
    const h = cell();
    expect(zoneAt(h, 1, h.h / 2)).toBe('left');
    expect(zoneAt(h, h.w / 2 - 1, 0)).toBe('left');
  });

  it('reads the right half above that band as inserting after', () => {
    const h = cell();
    expect(zoneAt(h, h.w / 2, h.h / 2)).toBe('right');
    expect(zoneAt(h, h.w - 1, 0)).toBe('right');
  });

  it('puts the boundary exactly at the foot of the glyph', () => {
    // A cell is 70 tall around an element whose glyph ends 46 down. One pixel
    // either side of that edge must mean two different things, or the band has
    // drifted away from what it is drawn to line up with.
    const h = cell();
    expect(h.h).toBe(70);
    expect(zoneAt(h, h.w / 2, h.h - BRANCH_BAND - 1)).not.toBe('below');
    expect(zoneAt(h, h.w / 2, h.h - BRANCH_BAND)).toBe('below');
  });

  it('leaves the left and right halves split down the middle', () => {
    const h = cell();
    expect(zoneAt(h, h.w / 2 - 0.01, 10)).toBe('left');
    expect(zoneAt(h, h.w / 2, 10)).toBe('right');
  });
});

describe('what has no lower band at all', () => {
  it('gives a trailing slot none — there is nothing there to branch from', () => {
    const slot = hitsOf(ser(el('no', 'A'))).find((h) => h.kind === 'slot');
    expect(slot).toBeDefined();
    expect(slot!.branchable).toBe(false);
    expect(zoneAt(slot!, slot!.w / 2, slot!.h - 1)).toBe('right');
  });

  it('gives a function block none — a block cannot be branched', () => {
    const h = cellAt(ser(fb(), el('coil', 'M')), [0]);
    expect(h.branchable).toBe(false);
    expect(zoneAt(h, h.w / 2, h.h - 1)).toBe('right');
    expect(zoneAt(h, 1, h.h - 1)).toBe('left');
  });
});

describe('the bands hold wherever an element sits', () => {
  it('works the same on a branch leg as on the rung', () => {
    const body = ser(par(ser(el('no', 'A')), ser(el('no', 'B'))), el('coil', 'M'));
    const leg = cellAt(body, [0, 1, 0]);

    expect(leg.branchable).toBe(true);
    expect(zoneAt(leg, leg.w / 2, leg.h - 1)).toBe('below');
    expect(zoneAt(leg, 1, 10)).toBe('left');
  });

  it('works the same on an output', () => {
    const coil = cellAt(ser(el('no', 'A'), el('coil', 'M')), [1]);

    expect(coil.branchable).toBe(true);
    expect(zoneAt(coil, coil.w / 2, coil.h - 1)).toBe('below');
  });
});
