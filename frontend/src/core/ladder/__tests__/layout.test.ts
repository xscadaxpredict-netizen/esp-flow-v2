import { describe, expect, it } from 'vitest';
import type { SeriesNode } from '../../models/ladderNode';
import { el, par, ser } from '../builders';
import { layoutLadder } from '../layout';
import { fb, rung } from './helpers';

/**
 * RULE 5 — a click on a shared position means the shallower line.
 *
 * "When a parallel block is the last child of its parent series, the parent's
 * slot and the block's first level's slot land on the same point... The
 * shallower path wins, so the click means 'after the block', not 'inside its
 * first level'." — documentation/reference/rules/LD building.txt
 *
 * Nothing moves on screen when this breaks, which is exactly why it needs a
 * test rather than an eyeball.
 */

const layoutOf = (body: SeriesNode) =>
  layoutLadder({ networks: [rung(body)], values: {}, online: false, selection: null });

const slotsOf = (body: SeriesNode) =>
  layoutOf(body)
    .hits.filter((h) => h.kind === 'slot')
    .sort((a, b) => a.y - b.y);

describe('rule 5 — shared positions', () => {
  it('leaves one insertion target where two would land together', () => {
    // The block is the last child, so its first line shares the rung's own row
    // and its own right edge. One region, two meanings.
    const slots = slotsOf(ser(el('no', 'A'), par(ser(el('no', 'B')), ser(el('no', 'C')))));

    expect(slots).toHaveLength(2);
    expect(slots[0].x).toBe(slots[1].x);
    expect(slots[0].y).not.toBe(slots[1].y);
  });

  it('gives that target to the rung, not to the block first line', () => {
    const slots = slotsOf(ser(el('no', 'A'), par(ser(el('no', 'B')), ser(el('no', 'C')))));

    expect(slots[0].path).toEqual([]);
    expect(slots[1].path).toEqual([1, 1]);
  });

  it('keeps a separate target for lines below the first row', () => {
    const slots = slotsOf(
      ser(par(ser(el('no', 'A')), ser(el('no', 'B')), ser(el('no', 'C')))),
    );

    // Rows 1 and 2 never collide with the rung's own slot, only row 0 does.
    expect(slots.map((s) => s.path)).toEqual([[], [0, 1], [0, 2]]);
  });

  it('lets an element take a column a slot would have wanted', () => {
    // The block is not the last child, so its lines' trailing slots land in the
    // column occupied by the contact that follows it.
    const slots = slotsOf(ser(par(ser(el('no', 'A')), ser(el('no', 'B'))), el('no', 'C')));

    expect(slots).toHaveLength(1);
    expect(slots[0].path).toEqual([]);
  });
});

describe('the layout is pure geometry', () => {
  it('returns the same drawing for the same rung', () => {
    const body = ser(el('no', 'A'), par(ser(el('no', 'B')), ser(el('no', 'C'))));
    const first = layoutOf(body);
    const second = layoutOf(body);

    expect(first.hits).toEqual(second.hits);
    expect(first.wires).toEqual(second.wires);
    expect(first.width).toBe(second.width);
    expect(first.height).toBe(second.height);
  });

  it('emits colours as tokens so the stylesheet keeps owning the palette', () => {
    const { wires } = layoutOf(ser(el('no', 'A')));
    expect(wires.length).toBeGreaterThan(0);
    for (const w of wires) expect(w.stroke).toMatch(/^var\(--[a-z0-9]+\)$/);
  });

  it('marks a contact as branchable and a function block as not', () => {
    const cells = layoutOf(ser(el('no', 'A'), fb())).hits.filter((h) => h.kind === 'cell');

    expect(cells[0].branchable).toBe(true);
    expect(cells[1].branchable).toBe(false);
  });
});
