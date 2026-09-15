import { describe, expect, it } from 'vitest';
import { el, par, ser } from '../../ladder/builders';
import { fb, rung } from '../../ladder/__tests__/helpers';
import { STRUCTURAL } from '../../diagnostics/codes';
import { checkNetwork, checkProgram } from '../structural';

/**
 * ADR-001 — the compiler boundary.
 *
 * "Python owns all language semantics. The browser owns only the editor model."
 * The browser may report a missing operand, an empty network, an output-less
 * network, and the two shape rules that govern where an output may stand. It
 * may never resolve a symbol, infer a type, or detect a double coil — those
 * carry SEM-, TYP-, CFG- and GEN- codes and belong to the Python compiler.
 *
 * The first test in this file is the only mechanical enforcement of that rule
 * anywhere in the codebase.
 */

const codesOf = (net: Parameters<typeof checkNetwork>[0]) =>
  checkNetwork(net, 0).map((d) => d.code);

describe('the boundary', () => {
  it('emits nothing but browser-owned structural codes', () => {
    const program = [
      rung(ser()),
      rung(ser(el('no', 'Declared', '%IX0.0'))),
      rung(ser(el('no', ''), el('coil', ''))),
      rung(ser(par(ser(el('nc', '')), ser(el('no', 'Named'))), el('coil', 'M1'))),
      rung(ser(el('coil', 'Early'), el('no', 'Late'))),
      rung(ser(par(ser(el('coil', 'M2')), ser(el('no', 'Rejoins'))))),
    ];

    const out = checkProgram(program);
    expect(out.length).toBeGreaterThan(0);

    for (const d of out) {
      expect(d.code.startsWith('STR-')).toBe(true);
      expect(d.origin).toBe('browser');
      expect(STRUCTURAL[d.code]).toBeDefined();
      expect(STRUCTURAL[d.code].owner).toBe('browser');
    }
  });

  it('keeps every registered code owned by the browser', () => {
    for (const def of Object.values(STRUCTURAL)) {
      expect(def.code.startsWith('STR-')).toBe(true);
      expect(def.owner).toBe('browser');
    }
  });
});

describe('what the browser checks', () => {
  it('reports an empty rung once and stops', () => {
    const out = checkNetwork(rung(ser()), 0);

    expect(out).toHaveLength(1);
    expect(out[0].code).toBe('STR-0110');
    expect(out[0].severity).toBe('info');
  });

  it('reports a rung with logic and no output', () => {
    expect(codesOf(rung(ser(el('no', 'A', '%IX0.0'))))).toContain('STR-0111');
  });

  it('reports a contact with nothing bound to it, and says where', () => {
    const body = ser(
      el('no', 'A', '%IX0.0'),
      par(ser(el('no', '')), ser(el('nc', 'B'))),
      el('coil', 'M'),
    );
    const missing = checkNetwork(rung(body), 0).filter((d) => d.code === 'STR-0101');

    expect(missing).toHaveLength(1);
    expect(missing[0].location.path).toEqual([1, 0, 0]);
  });

  it('exempts a function block from the missing-operand check', () => {
    // A block instance is named in the variable table, not on the element.
    expect(codesOf(rung(ser(fb(''), el('coil', 'M'))))).not.toContain('STR-0101');
  });

  it('reports an output with nothing bound to it', () => {
    const out = checkNetwork(rung(ser(el('no', 'A', '%IX0.0'), el('coil', ''))), 0);
    const missing = out.filter((d) => d.code === 'STR-0102');

    expect(missing).toHaveLength(1);
    expect(missing[0].location.path).toEqual([1]);
  });

  it('says nothing about a complete rung', () => {
    const body = ser(el('no', 'A', '%IX0.0'), el('nc', 'B', '%IX0.1'), el('coil', 'M', '%QX0.1'));
    expect(checkNetwork(rung(body), 0)).toHaveLength(0);
  });
});

describe('rule 6 — an output ends its line', () => {
  it('reports anything standing after an output', () => {
    const out = checkNetwork(rung(ser(el('coil', 'M'), el('no', 'Late', '%IX0.0'))), 0);
    const late = out.filter((d) => d.code === 'STR-0103');

    expect(late).toHaveLength(1);
    expect(late[0].location.path).toEqual([0]);
    expect(late[0].severity).toBe('error');
  });

  it('reports a whole output block that is not last', () => {
    const block = par(ser(el('coil', 'M1')), ser(el('coil', 'M2')));
    const out = checkNetwork(rung(ser(block, el('no', 'Late', '%IX0.0'))), 0);

    expect(out.map((d) => d.code)).toContain('STR-0103');
  });

  it('says nothing when the output is last', () => {
    expect(codesOf(rung(ser(el('no', 'A', '%IX0.0'), el('coil', 'M', '%QX0.1'))))).toHaveLength(0);
  });
});

describe('rule 7 — every leg of an output block terminates', () => {
  it('reports a block that mixes a terminating leg with a rejoining one', () => {
    const block = par(ser(el('coil', 'M', '%QX0.1')), ser(el('no', 'B', '%IX0.1')));
    const out = checkNetwork(rung(ser(block)), 0);
    const mixed = out.filter((d) => d.code === 'STR-0104');

    expect(mixed).toHaveLength(1);
    expect(mixed[0].location.path).toEqual([0]);
  });

  it('accepts a block where every leg ends in an output', () => {
    const block = par(
      ser(el('no', 'B', '%IX0.1'), el('coil', 'M1', '%QX0.1')),
      ser(el('no', 'C', '%IX0.2'), el('coil', 'M2', '%QX0.2')),
    );
    expect(checkNetwork(rung(ser(el('no', 'A', '%IX0.0'), block)), 0)).toHaveLength(0);
  });

  it('accepts an ordinary block where no leg ends in an output', () => {
    const block = par(ser(el('no', 'B', '%IX0.1')), ser(el('no', 'C', '%IX0.2')));
    const body = ser(block, el('coil', 'M', '%QX0.1'));
    expect(checkNetwork(rung(body), 0)).toHaveLength(0);
  });
});

describe('across a program', () => {
  it('numbers rungs from one, as the engineer sees them', () => {
    const program = [
      rung(ser(el('no', 'A', '%IX0.0'), el('coil', 'M', '%QX0.1'))),
      rung(ser()),
    ];

    const out = checkProgram(program);
    expect(out).toHaveLength(1);
    expect(out[0].location.network).toBe(2);
  });

  it('gathers the findings from every rung into one list', () => {
    const program = [rung(ser()), rung(ser()), rung(ser())];
    expect(checkProgram(program)).toHaveLength(3);
  });
});
