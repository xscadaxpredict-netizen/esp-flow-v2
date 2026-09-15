import { describe, expect, it } from 'vitest';
import { el, par, ser } from '../builders';
import { branchAt, placeAt } from '../mutations';
import { nodeAt } from '../path';
import { width } from '../span';
import { asElement, asParallel, asSeries, fb, rung } from './helpers';

/**
 * RULES 2, 3 and 4 — branching and widening.
 *
 * Rule 2: a branch spans exactly its parent.
 * Rule 3: if the clicked element is the entire line inside a block, the child
 *         is added as a new level of that block, directly below.
 * Rule 4: widening is a side effect, never bookkeeping.
 *   — documentation/reference/rules/LD building.txt
 */

describe('rule 2 — a branch spans exactly its parent', () => {
  it('wraps a lone contact in a block of two lines', () => {
    const nets = [rung(ser(el('no', 'A')))];
    const r = branchAt(nets, 0, [0], 'no', null);

    expect(r.changed).toBe(true);
    const body = r.networks[0].body;
    expect(body.kids).toHaveLength(1);

    const block = asParallel(nodeAt(body, [0]));
    expect(block.kids).toHaveLength(2);
    expect(asElement(nodeAt(body, [0, 0, 0])).sym).toBe('A');
    expect(asElement(nodeAt(body, [0, 1, 0])).type).toBe('no');
  });

  it('leaves the block one column wide, the width of what it wrapped', () => {
    const r = branchAt([rung(ser(el('no', 'A')))], 0, [0], 'no', null);
    expect(width(r.networks[0].body)).toBe(1);
  });

  it('wraps a contact that shares the rung, leaving its neighbour alone', () => {
    const nets = [rung(ser(el('no', 'A'), el('no', 'B')))];
    const r = branchAt(nets, 0, [0], 'no', null);

    expect(r.networks[0].body.kids).toHaveLength(2);
    expect(asParallel(nodeAt(r.networks[0].body, [0])).kids).toHaveLength(2);
    expect(asElement(nodeAt(r.networks[0].body, [1])).sym).toBe('B');
  });

  it('selects the newly branched element', () => {
    const r = branchAt([rung(ser(el('no', 'A')))], 0, [0], 'nc', null);
    expect(r.selection).toEqual({ n: 0, kind: 'cell', path: [0, 1, 0] });
  });
});

describe('rule 3 — the whole line inside a block joins that block', () => {
  it('adds a line to the existing block instead of nesting a new one', () => {
    const nets = [rung(ser(par(ser(el('no', 'A')), ser(el('no', 'B')))))];
    const r = branchAt(nets, 0, [0, 0, 0], 'no', null);

    const block = asParallel(nodeAt(r.networks[0].body, [0]));
    expect(block.kids).toHaveLength(3);
    // Line 0 was not restructured: it still holds a bare element.
    expect(asSeries(block.kids[0]).kids.every((k) => k.t === 'el')).toBe(true);
  });

  it('puts the new line directly below the clicked one', () => {
    const nets = [
      rung(ser(par(ser(el('no', 'A')), ser(el('no', 'B')), ser(el('no', 'C'))))),
    ];
    const r = branchAt(nets, 0, [0, 0, 0], 'nc', null);

    const block = asParallel(nodeAt(r.networks[0].body, [0]));
    expect(block.kids).toHaveLength(4);
    expect(asElement(nodeAt(r.networks[0].body, [0, 1, 0])).type).toBe('nc');
    expect(asElement(nodeAt(r.networks[0].body, [0, 2, 0])).sym).toBe('B');
    expect(asElement(nodeAt(r.networks[0].body, [0, 3, 0])).sym).toBe('C');
  });

  it('inherits the block width rather than narrowing', () => {
    const block = par(ser(el('no', 'A'), el('no', 'A2')), ser(el('no', 'B')));
    const r = branchAt([rung(ser(block))], 0, [0, 1, 0], 'no', null);

    expect(width(r.networks[0].body)).toBe(2);
    expect(asParallel(nodeAt(r.networks[0].body, [0])).kids).toHaveLength(3);
  });

  it('does not apply when the clicked element shares its line', () => {
    const block = par(ser(el('no', 'A'), el('no', 'A2')), ser(el('no', 'B')));
    const r = branchAt([rung(ser(block))], 0, [0, 0, 0], 'no', null);

    // The outer block is untouched; a narrower one appeared inside line 0.
    expect(asParallel(nodeAt(r.networks[0].body, [0])).kids).toHaveLength(2);
    expect(asParallel(nodeAt(r.networks[0].body, [0, 0, 0])).kids).toHaveLength(2);
  });
});

describe('rule 4 — widening is a side effect', () => {
  it('widens the whole block when one line grows', () => {
    const nets = [rung(ser(par(ser(el('no', 'A')), ser(el('no', 'B')))))];
    expect(width(nets[0].body)).toBe(1);

    const two = placeAt(nets, 0, [0, 0, 0], 'right', 'no', null);
    expect(width(two.networks[0].body)).toBe(2);

    const three = placeAt(two.networks, 0, [0, 0, 1], 'right', 'no', null);
    expect(width(three.networks[0].body)).toBe(3);
  });

  it('leaves the other lines holding what they held', () => {
    const nets = [rung(ser(par(ser(el('no', 'A')), ser(el('no', 'B')))))];
    const r = placeAt(nets, 0, [0, 0, 0], 'right', 'no', null);

    // Only the filler wire stretches; line 1 gains nothing of its own.
    expect(asSeries(nodeAt(r.networks[0].body, [0, 1])).kids).toHaveLength(1);
  });

  it('is not affected by an insert outside the block', () => {
    const nets = [rung(ser(par(ser(el('no', 'A')), ser(el('no', 'B'))), el('no', 'C')))];
    const before = width(asParallel(nodeAt(nets[0].body, [0])));

    const r = placeAt(nets, 0, [1], 'right', 'no', null);
    expect(width(asParallel(nodeAt(r.networks[0].body, [0])))).toBe(before);
  });

  it('never writes a width onto a placed contact', () => {
    const r = placeAt([rung(ser(el('no', 'A')))], 0, [0], 'right', 'no', null);
    expect(asElement(nodeAt(r.networks[0].body, [1])).span).toBeUndefined();
  });
});

describe('what branching refuses', () => {
  it('refuses a coil arm on a contact — every leg must end the same way', () => {
    const nets = [rung(ser(el('no', 'A'), el('coil', 'M')))];
    const r = branchAt(nets, 0, [0], 'coil', null);

    expect(r.changed).toBe(false);
    expect(r.networks).toBe(nets);
    expect(r.statusMsg).toMatch(/end the same way/i);
  });

  it('refuses a contact arm on an output', () => {
    const nets = [rung(ser(el('no', 'A'), el('coil', 'M')))];
    const r = branchAt(nets, 0, [1], 'no', null);

    expect(r.changed).toBe(false);
    expect(r.statusMsg).toMatch(/needs another output/i);
  });

  it('refuses to branch a function block', () => {
    const nets = [rung(ser(fb()))];
    const r = branchAt(nets, 0, [0], 'no', null);

    expect(r.changed).toBe(false);
    expect(r.statusMsg).toMatch(/function block/i);
  });

  it('refuses a path that points at nothing', () => {
    const nets = [rung(ser(el('no', 'A')))];
    expect(branchAt(nets, 0, [7], 'no', null).changed).toBe(false);
  });
});

/**
 * RULE 7 — outputs branch as a block whose every leg terminates.
 *
 * "Several outputs with the same condition are a block whose legs hold nothing
 * but their coils; outputs with different conditions are the same block with
 * contacts added to the legs."
 */
describe('rule 7 — output branches', () => {
  it('stacks a second output by branching the first', () => {
    const nets = [rung(ser(el('no', 'A'), el('coil', 'M1')))];
    const r = branchAt(nets, 0, [1], 'set', null);

    expect(r.changed).toBe(true);
    const block = asParallel(nodeAt(r.networks[0].body, [1]));
    expect(block.kids).toHaveLength(2);
    expect(asElement(nodeAt(r.networks[0].body, [1, 0, 0])).sym).toBe('M1');
    expect(asElement(nodeAt(r.networks[0].body, [1, 1, 0])).type).toBe('set');
  });

  it('lets a leg grow its own condition afterwards', () => {
    // Same shape, different widths: this is how two outputs come to differ.
    const nets = [
      rung(
        ser(
          el('no', 'A'),
          par(ser(el('coil', 'M1')), ser(el('coil', 'M2'))),
        ),
      ),
    ];
    const r = placeAt(nets, 0, [1, 1, 0], 'left', 'no', null);

    expect(r.changed).toBe(true);
    expect(asSeries(nodeAt(r.networks[0].body, [1, 1])).kids).toHaveLength(2);
    expect(asElement(nodeAt(r.networks[0].body, [1, 1, 1])).sym).toBe('M2');
    expect(width(r.networks[0].body)).toBe(3);
  });
});
