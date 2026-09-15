import { describe, expect, it } from 'vitest';
import { el, par, ser } from '../builders';
import { bindSymbol, branchAt, deleteAt, placeAt, setElementType } from '../mutations';
import { asParallel, fb, rung } from './helpers';

/**
 * IMMUTABILITY.
 *
 * Undo is a stack of fifty complete network lists. Every mutation copies before
 * it touches anything, so a state sitting in history can never be modified
 * through a shared reference. One missed copy would give an undo stack that
 * silently rewrites its own past, which is close to invisible by hand.
 */

const sample = () => [
  rung(ser(el('no', 'A'), par(ser(el('no', 'B')), ser(el('no', 'C'))), el('nc', 'D'), el('coil', 'M1'))),
];

describe('a mutation never touches what it was given', () => {
  it('leaves the original list byte for byte after every operation', () => {
    const original = sample();
    const before = JSON.stringify(original);

    placeAt(original, 0, [0], 'right', 'no', null);
    branchAt(original, 0, [0], 'no', null);
    deleteAt(original, { n: 0, kind: 'cell', path: [2] });
    bindSymbol(original, { n: 0, kind: 'cell', path: [0] }, 'Renamed', '%IX9.9');
    setElementType(original, { n: 0, kind: 'cell', path: [0] }, 'nc');

    expect(JSON.stringify(original)).toBe(before);
  });

  it('shares no node with the list it returns', () => {
    const original = sample();
    const r = placeAt(original, 0, [0], 'right', 'no', null);

    expect(r.networks).not.toBe(original);
    expect(r.networks[0]).not.toBe(original[0]);
    expect(r.networks[0].body).not.toBe(original[0].body);
    expect(r.networks[0].body.kids[0]).not.toBe(original[0].body.kids[0]);
    // Index 1 is the element just inserted, so the copied block moved to 2.
    expect(r.networks[0].body.kids[2]).not.toBe(original[0].body.kids[1]);
  });

  it('copies deep inside a block, not just the top of the tree', () => {
    const original = sample();
    const r = branchAt(original, 0, [0], 'no', null);

    const before = asParallel(original[0].body.kids[1]);
    const after = asParallel(r.networks[0].body.kids[1]);
    expect(after).not.toBe(before);
    expect(after.kids[0]).not.toBe(before.kids[0]);
    expect(after.kids[0].kids[0]).not.toBe(before.kids[0].kids[0]);
  });

  it('hands back the very same list when it refuses', () => {
    // A refusal must not consume an undo slot, which the store decides from
    // whether anything changed.
    const original = [rung(ser(fb()))];
    const r = branchAt(original, 0, [0], 'no', null);

    expect(r.changed).toBe(false);
    expect(r.networks).toBe(original);
  });
});
