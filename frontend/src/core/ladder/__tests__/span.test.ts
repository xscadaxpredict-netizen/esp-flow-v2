import { describe, expect, it } from 'vitest';
import { el, par, ser } from '../builders';
import { height, width } from '../span';
import { fb } from './helpers';

/**
 * RULE 1 — width is intrinsic.
 *
 * "A series is the sum of its children's widths; a parallel is the max of its
 * levels'." — documentation/reference/rules/LD building.txt
 *
 * Every coordinate on the canvas comes from these two functions, so a change
 * here moves every wire on screen.
 */

describe('width', () => {
  it('gives a contact one column', () => {
    expect(width(el('no'))).toBe(1);
  });

  it('gives a function block two', () => {
    expect(width(fb())).toBe(2);
  });

  it('gives an empty line one column, not none', () => {
    // The floor is what lets a brand new rung draw a cell you can click.
    expect(width(ser())).toBe(1);
  });

  it('adds up what a line holds', () => {
    expect(width(ser(el('no'), el('nc'), el('no')))).toBe(3);
  });

  it('counts a function block as two inside a line', () => {
    expect(width(ser(el('no'), fb()))).toBe(3);
  });

  it('takes a block as its widest line, never the sum', () => {
    const block = par(ser(el('no')), ser(el('no'), el('no'), el('no')));
    expect(width(block)).toBe(3);
  });

  it('gives a block of equal lines that single width', () => {
    expect(width(par(ser(el('no')), ser(el('no'))))).toBe(1);
  });

  it('adds a block to the line that holds it', () => {
    const rungBody = ser(el('no'), par(ser(el('no')), ser(el('no'), el('no'))));
    expect(width(rungBody)).toBe(3);
  });

  it('recomputes when a level grows, because nothing is stored', () => {
    // Rule 4 seen from below: widening is a side effect of measuring.
    const block = par(ser(el('no')), ser(el('no')));
    expect(width(block)).toBe(1);
    block.kids[1].kids.push(el('no'));
    expect(width(block)).toBe(2);
  });
});

describe('height', () => {
  it('gives an element one row', () => {
    expect(height(el('no'))).toBe(1);
  });

  it('gives a flat line one row however long it is', () => {
    expect(height(ser(el('no'), el('nc'), el('no')))).toBe(1);
  });

  it('stacks the rows of a block', () => {
    expect(height(par(ser(el('no')), ser(el('no')), ser(el('no'))))).toBe(3);
  });

  it('takes a line as its tallest child', () => {
    expect(height(ser(el('no'), par(ser(el('no')), ser(el('no')))))).toBe(2);
  });

  it('sums through a nested block', () => {
    const inner = par(ser(el('no')), ser(el('no')));
    expect(height(par(ser(el('no')), ser(inner)))).toBe(3);
  });
});
