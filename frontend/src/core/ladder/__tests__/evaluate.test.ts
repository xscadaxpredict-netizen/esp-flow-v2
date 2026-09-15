import { describe, expect, it } from 'vitest';
import { el, par, ser } from '../builders';
import { conducts, passes } from '../evaluate';

/**
 * POWER FLOW.
 *
 * A series is AND over its children, a parallel is OR over its levels. Edge
 * contacts are drawn dead: they conduct for a single scan, and only the device
 * can tell that scan from any other (ruled 2026-09-12).
 */

const on = { A: true, B: true, Off: false };

describe('a single element', () => {
  it('passes a normally open contact when its variable is true', () => {
    expect(passes(el('no', 'A'), on)).toBe(true);
  });

  it('blocks a normally open contact when it is false', () => {
    expect(passes(el('no', 'Off'), on)).toBe(false);
  });

  it('inverts a normally closed contact', () => {
    expect(passes(el('nc', 'Off'), on)).toBe(true);
    expect(passes(el('nc', 'A'), on)).toBe(false);
  });

  it('reads an unknown symbol as false', () => {
    expect(passes(el('no', 'NeverDeclared'), on)).toBe(false);
    expect(passes(el('no', ''), on)).toBe(false);
  });

  it('never conducts a rising-edge contact, however its variable reads', () => {
    expect(passes(el('p', 'A'), on)).toBe(false);
    expect(passes(el('p', 'Off'), on)).toBe(false);
  });

  it('never conducts a falling-edge contact either', () => {
    expect(passes(el('n', 'A'), on)).toBe(false);
    expect(passes(el('n', 'Off'), on)).toBe(false);
  });

  it('blocks when there is no element at all', () => {
    expect(passes(null, on)).toBe(false);
    expect(passes(undefined, on)).toBe(false);
  });
});

describe('a whole rung', () => {
  it('conducts a line only when everything in it conducts', () => {
    expect(conducts(ser(el('no', 'A'), el('no', 'B')), on)).toBe(true);
    expect(conducts(ser(el('no', 'A'), el('no', 'Off')), on)).toBe(false);
  });

  it('conducts a block when any one line conducts', () => {
    const block = par(ser(el('no', 'Off')), ser(el('no', 'A')));
    expect(conducts(block, on)).toBe(true);
  });

  it('blocks a block when every line is dead', () => {
    const block = par(ser(el('no', 'Off')), ser(el('no', 'AlsoOff')));
    expect(conducts(block, on)).toBe(false);
  });

  it('conducts an empty line — an empty rung is a closed circuit', () => {
    expect(conducts(ser(), on)).toBe(true);
  });

  it('carries a live block through to the rest of the line', () => {
    const body = ser(el('no', 'A'), par(ser(el('no', 'Off')), ser(el('no', 'B'))));
    expect(conducts(body, on)).toBe(true);
  });

  it('a dead edge contact stops the rung it sits on', () => {
    expect(conducts(ser(el('no', 'A'), el('p', 'A')), on)).toBe(false);
  });
});
