import { describe, expect, it } from 'vitest';
import type { SeriesNode } from '../../models/ladderNode';
import { el, par, ser } from '../builders';
import { CH, CW, elementShape, layoutLadder, X0, type Hit } from '../layout';
import { OUTPUT_ENDS_LINE } from '../legality';
import { accepts, answerFor, ghostAt, previewLegality } from '../preview';
import { fb, rung } from './helpers';

/**
 * PLACEMENT PREVIEW — the table the canvas draws its outlines from.
 *
 * That every answer here matches what a real click does is pinned end to end
 * in services/store/__tests__/previewAgreement.test.ts. This file pins the
 * table's shape and the geometry the ghost is drawn at.
 */

const layoutOf = (body: SeriesNode) => {
  const networks = [rung(body)];
  const { hits } = layoutLadder({ networks, values: {}, online: false, selection: null });
  return { networks, hits };
};

const cellAt = (hits: Hit[], path: number[]): Hit => {
  const hit = hits.find((h) => h.kind === 'cell' && (h.path ?? []).join('.') === path.join('.'));
  if (!hit) throw new Error(`no cell at [${path.join('.')}]`);
  return hit;
};

const slotAt = (hits: Hit[], path: number[]): Hit => {
  const hit = hits.find((h) => h.kind === 'slot' && (h.path ?? []).join('.') === path.join('.'));
  if (!hit) throw new Error(`no slot at [${path.join('.')}]`);
  return hit;
};

describe('the table covers every way of clicking', () => {
  it('asks left, right and below of an ordinary cell', () => {
    const { networks, hits } = layoutOf(ser(el('no', 'A'), el('coil', 'M')));
    const table = previewLegality(networks, hits, 'no');

    expect(Object.keys(table[cellAt(hits, [0]).key]).sort()).toEqual(['below', 'left', 'right']);
  });

  it('asks only left and right of a function block, which has no lower band', () => {
    const { networks, hits } = layoutOf(ser(fb(), el('coil', 'M')));
    const table = previewLegality(networks, hits, 'no');

    expect(Object.keys(table[cellAt(hits, [0]).key]).sort()).toEqual(['left', 'right']);
  });

  it('asks a slot only about itself', () => {
    const { networks, hits } = layoutOf(ser(el('no', 'A')));
    const table = previewLegality(networks, hits, 'coil');

    expect(Object.keys(table[slotAt(hits, []).key])).toEqual(['slot']);
  });

  it('gives an entry to every hit when a tool is armed', () => {
    const { networks, hits } = layoutOf(
      ser(el('no', 'A'), par(ser(el('no', 'X')), ser(el('no', 'Y'))), el('coil', 'M')),
    );
    const table = previewLegality(networks, hits, 'no');

    expect(Object.keys(table).sort()).toEqual(hits.map((h) => h.key).sort());
  });
});

describe('what the table answers', () => {
  const body = () => ser(el('no', 'A'), el('coil', 'M'));

  it('refuses a contact after an output, and carries the same sentence', () => {
    const { networks, hits } = layoutOf(body());
    const table = previewLegality(networks, hits, 'no');
    const coil = cellAt(hits, [1]);

    expect(answerFor(table, coil, 'left')?.ok).toBe(true);
    expect(answerFor(table, coil, 'right')).toEqual({ ok: false, reason: OUTPUT_ENDS_LINE });
  });

  it('allows a coil only where a coil can go', () => {
    const { networks, hits } = layoutOf(ser(el('no', 'A')));
    const table = previewLegality(networks, hits, 'coil');

    expect(answerFor(table, slotAt(hits, []), 'right')?.ok).toBe(true);
    expect(answerFor(table, cellAt(hits, [0]), 'left')?.ok).toBe(false);
    expect(answerFor(table, cellAt(hits, [0]), 'below')?.ok).toBe(false);
  });

  it('answers a slot the same whichever zone the pointer was last in', () => {
    const { networks, hits } = layoutOf(ser(el('no', 'A')));
    const table = previewLegality(networks, hits, 'no');
    const slot = slotAt(hits, []);

    expect(answerFor(table, slot, 'left')).toEqual(answerFor(table, slot, 'below'));
  });

  it('returns null for a hit the table knows nothing about', () => {
    const { hits } = layoutOf(body());
    expect(answerFor({}, cellAt(hits, [0]), 'left')).toBeNull();
  });
});

describe('an armed branch ignores where you point', () => {
  it('answers every zone of a cell with the branch verdict', () => {
    const { networks, hits } = layoutOf(ser(el('no', 'A'), el('coil', 'M')));
    const table = previewLegality(networks, hits, 'coil', 'branch');
    const coil = table[cellAt(hits, [1]).key];

    expect(coil.left).toEqual(coil.below);
    expect(coil.right).toEqual(coil.below);
    expect(coil.below?.ok).toBe(true);
  });

  it('offers nothing at a slot, because there is nothing there to branch from', () => {
    const { networks, hits } = layoutOf(ser(el('no', 'A')));
    const table = previewLegality(networks, hits, 'no', 'branch');

    expect(table[slotAt(hits, []).key]).toBeUndefined();
  });
});

describe('which positions earn an outline', () => {
  it('outlines a position that accepts the element in at least one way', () => {
    expect(accepts({ left: { ok: false, reason: 'x' }, right: { ok: true } })).toBe(true);
  });

  it('leaves out a position that refuses every way', () => {
    expect(accepts({ left: { ok: false, reason: 'x' }, below: { ok: false, reason: 'y' } })).toBe(
      false,
    );
    expect(accepts(undefined)).toBe(false);
  });

  it('with a coil armed on a finished rung, outlines only the coil — to branch it', () => {
    const { networks, hits } = layoutOf(ser(el('no', 'A'), el('coil', 'M')));
    const table = previewLegality(networks, hits, 'coil');
    const open = hits.filter((h) => accepts(table[h.key])).map((h) => h.path?.join('.'));

    expect(open).toEqual(['1']);
  });
});

describe('where the ghost is drawn', () => {
  const { hits } = layoutOf(ser(el('no', 'A'), el('coil', 'M')));
  const first = cellAt(hits, [0]);

  it('knows each cell’s column edges and centre line', () => {
    expect(first.xL).toBe(X0);
    expect(first.xR).toBe(X0 + CW);
    expect(first.cy).toBe(first.y + 32);
  });

  it('puts an insert on the boundary it goes in at', () => {
    expect(ghostAt(first, 'left', 'no')).toEqual({ cx: X0, cy: first.cy });
    expect(ghostAt(first, 'right', 'no')).toEqual({ cx: X0 + CW, cy: first.cy });
  });

  it('puts a branch exactly where the new level appears, one row down', () => {
    expect(ghostAt(first, 'below', 'no')).toEqual({ cx: X0 + CW / 2, cy: first.cy + CH });
  });

  it('puts a slot’s ghost in the middle of the slot, whatever the zone', () => {
    const { hits: open } = layoutOf(ser(el('no', 'A')));
    const slot = slotAt(open, []);

    expect(ghostAt(slot, 'left', 'no')).toEqual({ cx: slot.xL + CW / 2, cy: slot.cy });
    expect(ghostAt(slot, 'below', 'no')).toEqual(ghostAt(slot, 'left', 'no'));
  });
});

describe('a function block ghost sits where the block will land', () => {
  // Two cells wide. Centred on a boundary it covered half of each neighbour, so
  // it starts at the boundary instead — which is exactly the column it takes.
  const { hits } = layoutOf(ser(el('no', 'A'), el('no', 'B'), el('coil', 'M')));
  const b = cellAt(hits, [1]);

  it('inserted after an element, starts at that element’s right edge', () => {
    expect(ghostAt(b, 'right', 'fb')).toEqual({ cx: b.xR + CW, cy: b.cy });
  });

  it('inserted before an element, takes that element’s column', () => {
    expect(ghostAt(b, 'left', 'fb')).toEqual({ cx: b.xL + CW, cy: b.cy });
  });

  it('branched below, starts at the element’s column one row down', () => {
    expect(ghostAt(b, 'below', 'fb')).toEqual({ cx: b.xL + CW, cy: b.cy + CH });
  });

  it('never straddles the boundary the way a one-cell element does', () => {
    const box = elementShape('fb', ghostAt(b, 'right', 'fb').cx, b.cy).paths[0];
    const left = Number(box.match(/^M(-?[\d.]+)/)![1]);
    expect(left).toBeGreaterThanOrEqual(b.xR);
    expect(ghostAt(b, 'right', 'no').cx).toBe(b.xR);
  });

  it('in a slot, fills the two cells from the slot’s left edge', () => {
    const { hits: open } = layoutOf(ser(el('no', 'A')));
    const slot = slotAt(open, []);
    expect(ghostAt(slot, 'right', 'fb')).toEqual({ cx: slot.xL + CW, cy: slot.cy });
  });
});

describe('a ghost is drawn with the element’s real shape', () => {
  it('matches the glyphs the canvas draws for a placed element', () => {
    // Build a rung holding one of each, and check that its drawn glyphs are
    // exactly the shapes elementShape gives for those positions.
    const { hits } = layoutOf(ser(el('nc', 'A'), el('coil', 'M')));
    const { glyphs } = layoutLadder({
      networks: [rung(ser(el('nc', 'A'), el('coil', 'M')))],
      values: {},
      online: false,
      selection: null,
    });
    const drawn = glyphs.map((g) => g.d);

    for (const [path, type] of [
      [[0], 'nc'],
      [[1], 'coil'],
    ] as const) {
      const h = cellAt(hits, [...path]);
      const shape = elementShape(type, (h.xL + h.xR) / 2, h.cy);
      for (const d of shape.paths) expect(drawn).toContain(d);
    }
  });

  it('gives each kind its own marks', () => {
    expect(elementShape('no', 0, 0).paths).toHaveLength(2);
    expect(elementShape('nc', 0, 0).paths).toHaveLength(3);
    expect(elementShape('p', 0, 0).letter).toBe('P');
    expect(elementShape('coil', 0, 0).letter).toBeUndefined();
    expect(elementShape('set', 0, 0).letter).toBe('S');
    expect(elementShape('fb', 0, 0).paths).toHaveLength(1);
  });
});
