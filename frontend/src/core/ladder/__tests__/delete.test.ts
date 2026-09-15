import { describe, expect, it } from 'vitest';
import { el, par, ser } from '../builders';
import { deleteAt, deleteNetwork } from '../mutations';
import { nodeAt } from '../path';
import { asElement, asParallel, asSeries, rung } from './helpers';

/**
 * DELETION — the rules run backwards.
 *
 * "Remove the element, drop a level left empty, and collapse a parallel left
 * with one level back into its parent series."
 *
 * "After a deletion the selection follows the neighbour on the left — the one
 * on the right when the deleted element was first in its line, that line's
 * trailing slot when no element is left beside it, and the rung's own slot when
 * pruning carried that line away."
 *   — documentation/reference/rules/LD building.txt
 */

describe('pruning', () => {
  it('closes the line when nothing else changes', () => {
    const nets = [rung(ser(el('no', 'A'), el('no', 'B'), el('no', 'C')))];
    const r = deleteAt(nets, { n: 0, kind: 'cell', path: [1] });

    expect(r.networks[0].body.kids).toHaveLength(2);
    expect(asElement(nodeAt(r.networks[0].body, [1])).sym).toBe('C');
  });

  it('drops an emptied line and collapses the block back into the rung', () => {
    const nets = [rung(ser(par(ser(el('no', 'A')), ser(el('no', 'B')))))];
    const r = deleteAt(nets, { n: 0, kind: 'cell', path: [0, 1, 0] });

    const body = r.networks[0].body;
    expect(body.kids).toHaveLength(1);
    expect(asElement(nodeAt(body, [0])).sym).toBe('A');
  });

  it('keeps a three-line block alive after losing one line', () => {
    const nets = [
      rung(ser(par(ser(el('no', 'A')), ser(el('no', 'B')), ser(el('no', 'C'))))),
    ];
    const r = deleteAt(nets, { n: 0, kind: 'cell', path: [0, 1, 0] });

    const block = asParallel(nodeAt(r.networks[0].body, [0]));
    expect(block.kids).toHaveLength(2);
    expect(asElement(nodeAt(r.networks[0].body, [0, 1, 0])).sym).toBe('C');
  });

  it('prunes nothing when the line still holds something', () => {
    const nets = [rung(ser(par(ser(el('no', 'A'), el('no', 'A2')), ser(el('no', 'B')))))];
    const r = deleteAt(nets, { n: 0, kind: 'cell', path: [0, 0, 1] });

    const block = asParallel(nodeAt(r.networks[0].body, [0]));
    expect(block.kids).toHaveLength(2);
    expect(asSeries(block.kids[0]).kids).toHaveLength(1);
  });

  it('inlines the survivor in place, keeping the order around it', () => {
    const nets = [
      rung(
        ser(
          el('no', 'Left'),
          par(ser(el('no', 'A')), ser(el('no', 'B'))),
          el('no', 'Right'),
        ),
      ),
    ];
    const r = deleteAt(nets, { n: 0, kind: 'cell', path: [1, 1, 0] });

    const kids = r.networks[0].body.kids;
    expect(kids).toHaveLength(3);
    expect(asElement(kids[0]).sym).toBe('Left');
    expect(asElement(kids[1]).sym).toBe('A');
    expect(asElement(kids[2]).sym).toBe('Right');
  });

  it('collapses the inner block only, leaving the outer one standing', () => {
    // A block inside a level of another block. Removing the inner block's second
    // line collapses that block and inlines its survivor, and stops there —
    // inlining never empties the level it lands in, so one deletion can trigger
    // at most one collapse in a canonical tree.
    const inner = par(ser(el('no', 'X')), ser(el('no', 'Y')));
    const outer = par(ser(inner), ser(el('no', 'B')));
    const r = deleteAt([rung(ser(outer))], { n: 0, kind: 'cell', path: [0, 0, 0, 1, 0] });

    const stillOuter = asParallel(nodeAt(r.networks[0].body, [0]));
    expect(stillOuter.kids).toHaveLength(2);
    expect(asElement(nodeAt(r.networks[0].body, [0, 0, 0])).sym).toBe('X');
    expect(asElement(nodeAt(r.networks[0].body, [0, 1, 0])).sym).toBe('B');
  });
});

describe('where the selection lands', () => {
  it('takes the neighbour on the left', () => {
    const nets = [rung(ser(el('no', 'A'), el('no', 'B'), el('no', 'C')))];
    const r = deleteAt(nets, { n: 0, kind: 'cell', path: [1] });

    expect(r.selection?.kind).toBe('cell');
    expect(asElement(nodeAt(r.networks[0].body, r.selection?.path ?? [])).sym).toBe('A');
  });

  it('takes the one on the right when the deleted element was first', () => {
    const nets = [rung(ser(el('no', 'A'), el('no', 'B')))];
    const r = deleteAt(nets, { n: 0, kind: 'cell', path: [0] });

    expect(r.selection?.kind).toBe('cell');
    expect(asElement(nodeAt(r.networks[0].body, r.selection?.path ?? [])).sym).toBe('B');
  });

  it('finds the neighbour wherever pruning leaves it, not where it was', () => {
    // Identity is looked up again after the tree settles. Today pruning cannot
    // move a surviving neighbour, but deletion changes when outputs move into
    // the tree, and this keeps the guarantee rather than the coincidence.
    const nets = [rung(ser(par(ser(el('no', 'A'), el('no', 'B')), ser(el('no', 'C')))))];
    const r = deleteAt(nets, { n: 0, kind: 'cell', path: [0, 0, 1] });

    expect(asElement(nodeAt(r.networks[0].body, r.selection?.path ?? [])).sym).toBe('A');
  });

  it('falls to the rung slot when the left neighbour is a block', () => {
    const nets = [rung(ser(par(ser(el('no', 'A')), ser(el('no', 'B'))), el('no', 'C')))];
    const r = deleteAt(nets, { n: 0, kind: 'cell', path: [1] });

    expect(r.selection).toEqual({ n: 0, kind: 'slot', path: [] });
  });

  it('falls to the rung slot when the rung is emptied', () => {
    const r = deleteAt([rung(ser(el('no', 'A')))], { n: 0, kind: 'cell', path: [0] });
    expect(r.selection).toEqual({ n: 0, kind: 'slot', path: [] });
  });

  it('falls to the rung slot when pruning carried the line away', () => {
    const nets = [rung(ser(par(ser(el('no', 'A')), ser(el('no', 'B')))))];
    const r = deleteAt(nets, { n: 0, kind: 'cell', path: [0, 1, 0] });

    expect(r.selection).toEqual({ n: 0, kind: 'slot', path: [] });
  });
});

describe('outputs', () => {
  it('lands on the contact beside a deleted output', () => {
    // An output is an element like any other, so the neighbour rule applies.
    const nets = [rung(ser(el('no', 'A'), el('coil', 'M1')))];
    const r = deleteAt(nets, { n: 0, kind: 'cell', path: [1] });

    expect(r.networks[0].body.kids).toHaveLength(1);
    expect(asElement(nodeAt(r.networks[0].body, r.selection?.path ?? [])).sym).toBe('A');
  });

  it('collapses an output block back to a single output', () => {
    const nets = [
      rung(ser(el('no', 'A'), par(ser(el('coil', 'M1')), ser(el('coil', 'M2'))))),
    ];
    const r = deleteAt(nets, { n: 0, kind: 'cell', path: [1, 1, 0] });

    expect(r.networks[0].body.kids).toHaveLength(2);
    expect(asElement(nodeAt(r.networks[0].body, [1])).sym).toBe('M1');
  });

  it('leaves the output standing when its last contact goes', () => {
    const nets = [
      rung(
        ser(
          el('no', 'A'),
          par(
            ser(el('no', 'B'), el('coil', 'M1')),
            ser(el('no', 'C'), el('coil', 'M2')),
          ),
        ),
      ),
    ];
    const r = deleteAt(nets, { n: 0, kind: 'cell', path: [1, 0, 0] });

    const leg = asSeries(nodeAt(r.networks[0].body, [1, 0]));
    expect(leg.kids).toHaveLength(1);
    expect(asElement(leg.kids[0]).sym).toBe('M1');
  });
});

describe('what deletion refuses', () => {
  it('refuses with nothing selected', () => {
    const nets = [rung(ser(el('no', 'A')))];
    const r = deleteAt(nets, null);

    expect(r.changed).toBe(false);
    expect(r.networks).toBe(nets);
  });

  it('refuses to remove the only rung, because a program needs one', () => {
    const nets = [rung(ser(el('no', 'A')))];
    const r = deleteNetwork(nets, 0, null);

    expect(r.changed).toBe(false);
    expect(r.statusMsg).toMatch(/at least one/i);
  });
});
