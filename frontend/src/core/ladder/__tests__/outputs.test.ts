import { describe, expect, it } from 'vitest';
import { el, par, ser } from '../builders';
import { conducts, passes } from '../evaluate';
import { CW, GUTTER_W, layoutLadder, RAIL_L, X0 } from '../layout';
import { appendTo, placeAt, setElementType } from '../mutations';
import { nodeAt } from '../path';
import { canTerminate, terminates } from '../shape';
import { asElement, rung } from './helpers';

/**
 * RULES 6 and 7 — outputs inside the rung.
 *
 * "A coil terminates the line it sits on and reaches the right power rail.
 * Nothing may follow it... A coil is transparent to power: it is written by the
 * flow that reaches it and never gates that flow."
 *   — documentation/reference/rules/LD building.txt
 */

describe('what counts as terminating', () => {
  it('sees a coil as the end of a line', () => {
    expect(terminates(el('coil', 'M'))).toBe(true);
    expect(terminates(el('set', 'M'))).toBe(true);
    expect(terminates(el('no', 'A'))).toBe(false);
  });

  it('sees a line as terminating only through its last element', () => {
    expect(terminates(ser(el('no', 'A'), el('coil', 'M')))).toBe(true);
    expect(terminates(ser(el('coil', 'M'), el('no', 'A')))).toBe(false);
    expect(terminates(ser())).toBe(false);
  });

  it('sees a block as terminating only when every leg does', () => {
    expect(terminates(par(ser(el('coil', 'M1')), ser(el('coil', 'M2'))))).toBe(true);
    expect(terminates(par(ser(el('coil', 'M1')), ser(el('no', 'B'))))).toBe(false);
  });
});

describe('a coil is transparent to power', () => {
  it('passes whatever reached it, whatever its own value says', () => {
    expect(passes(el('coil', 'Off'), { Off: false })).toBe(true);
    expect(passes(el('coil', 'On'), { On: true })).toBe(true);
  });

  it('does not gate the line it sits on', () => {
    const live = { A: true };
    expect(conducts(ser(el('no', 'A'), el('coil', 'Unset')), live)).toBe(true);
    expect(conducts(ser(el('no', 'Missing'), el('coil', 'Unset')), live)).toBe(false);
  });
});

describe('rule 6 — placement refuses to put anything after an output', () => {
  const msg = /ends its line/i;

  it('refuses a contact appended to a line that already ends in an output', () => {
    const nets = [rung(ser(el('no', 'A'), el('coil', 'M')))];
    const r = appendTo(nets, 0, [], 'no', null);

    expect(r.changed).toBe(false);
    expect(r.statusMsg).toMatch(msg);
  });

  it('refuses a contact inserted to the right of an output', () => {
    const nets = [rung(ser(el('no', 'A'), el('coil', 'M')))];
    const r = placeAt(nets, 0, [1], 'right', 'no', null);

    expect(r.changed).toBe(false);
    expect(r.statusMsg).toMatch(msg);
  });

  it('allows a contact inserted to the left of an output', () => {
    const nets = [rung(ser(el('no', 'A'), el('coil', 'M')))];
    const r = placeAt(nets, 0, [1], 'left', 'nc', null);

    expect(r.changed).toBe(true);
    expect(asElement(nodeAt(r.networks[0].body, [1])).type).toBe('nc');
    expect(asElement(nodeAt(r.networks[0].body, [2])).sym).toBe('M');
  });

  it('refuses a second output in series with the first', () => {
    const nets = [rung(ser(el('no', 'A'), el('coil', 'M1')))];
    const r = placeAt(nets, 0, [1], 'right', 'coil', null);

    expect(r.changed).toBe(false);
    expect(r.statusMsg).toMatch(msg);
  });

  it('refuses an output dropped into the middle of a line', () => {
    const nets = [rung(ser(el('no', 'A'), el('no', 'B')))];
    const r = placeAt(nets, 0, [0], 'right', 'coil', null);

    expect(r.changed).toBe(false);
    expect(r.statusMsg).toMatch(msg);
  });

  it('accepts an output at the end of a line that has none', () => {
    const nets = [rung(ser(el('no', 'A')))];
    const r = appendTo(nets, 0, [], 'coil', null);

    expect(r.changed).toBe(true);
    expect(terminates(r.networks[0].body)).toBe(true);
    expect(r.statusMsg).toMatch(/right rail/i);
  });

  it('refuses to convert a mid-line contact into an output', () => {
    const nets = [rung(ser(el('no', 'A'), el('no', 'B'), el('coil', 'M')))];
    const r = setElementType(nets, { n: 0, kind: 'cell', path: [0] }, 'coil');

    expect(r.changed).toBe(false);
    expect(r.statusMsg).toMatch(msg);
  });
});

describe('rule 7 — an output must be able to reach the rail', () => {
  it('knows the rung itself always reaches it', () => {
    expect(canTerminate(ser(el('no', 'A')), [])).toBe(true);
  });

  it('refuses an output on a leg of a block that rejoins and carries on', () => {
    // The reported case: branch a contact, then try to end the new leg with a
    // coil while the rung continues past the block to its real output.
    const body = ser(
      el('no', 'ConveyorMotor'),
      el('no', 'LevelSwitch'),
      par(ser(el('no', 'X')), ser(el('no', 'Y'))),
      el('nc', 'StopButton'),
      el('coil', 'FillValve'),
    );
    const r = appendTo([rung(body)], 0, [2, 1], 'coil', null);

    expect(r.changed).toBe(false);
    expect(r.statusMsg).toMatch(/reach the right rail/i);
  });

  it('refuses it on a bare parallel with no output in the rung at all', () => {
    // Confirmed against ISPSoft 2026-09-12: one contact, a second connected
    // below it in parallel, nothing else. ISPSoft will not put a coil on the
    // lower leg either.
    const body = ser(par(ser(el('no', 'A')), ser(el('no', 'B'))));
    expect(canTerminate(body, [0, 1])).toBe(false);

    const r = appendTo([rung(body)], 0, [0, 1], 'coil', null);
    expect(r.changed).toBe(false);
    expect(r.statusMsg).toMatch(/reach the right rail/i);
  });

  it('still lets the rung itself take that output', () => {
    const body = ser(par(ser(el('no', 'A')), ser(el('no', 'B'))));
    const r = appendTo([rung(body)], 0, [], 'coil', null);

    expect(r.changed).toBe(true);
    expect(terminates(r.networks[0].body)).toBe(true);
  });

  it('refuses the same thing when inserted beside a contact', () => {
    const body = ser(
      el('no', 'A'),
      par(ser(el('no', 'X')), ser(el('no', 'Y'))),
      el('coil', 'M'),
    );
    const r = placeAt([rung(body)], 0, [1, 1, 0], 'right', 'coil', null);

    expect(r.changed).toBe(false);
    expect(r.statusMsg).toMatch(/reach the right rail/i);
  });

  it('refuses converting a contact into an output in the same position', () => {
    const body = ser(
      el('no', 'A'),
      par(ser(el('no', 'X')), ser(el('no', 'Y'))),
      el('coil', 'M'),
    );
    const r = setElementType([rung(body)], { n: 0, kind: 'cell', path: [1, 1, 0] }, 'coil');

    expect(r.changed).toBe(false);
    expect(r.statusMsg).toMatch(/reach the right rail/i);
  });

  it('allows it once every sibling leg already ends in an output', () => {
    // The legal build order: branch the coil first, then grow each leg leftward.
    const body = ser(el('no', 'A'), par(ser(el('coil', 'M1')), ser(el('no', 'B'))));
    const r = appendTo([rung(body)], 0, [1, 1], 'coil', null);

    expect(r.changed).toBe(true);
    expect(terminates(r.networks[0].body)).toBe(true);
  });

  it('refuses when the block is not the last thing on its line', () => {
    const body = ser(par(ser(el('coil', 'M1')), ser(el('no', 'B'))), el('no', 'After'));
    expect(canTerminate(body, [0, 1])).toBe(false);
    expect(appendTo([rung(body)], 0, [0, 1], 'coil', null).changed).toBe(false);
  });
});

describe('rule 7 — how an output block is drawn', () => {
  const layoutOf = (body: Parameters<typeof rung>[0]) =>
    layoutLadder({ networks: [rung(body)], values: {}, online: false, selection: null });

  it('offers no trailing slot on a line that ends in an output', () => {
    const { hits } = layoutOf(ser(el('no', 'A'), el('coil', 'M')));
    expect(hits.filter((h) => h.kind === 'slot')).toHaveLength(0);
  });

  it('draws no rejoin node on an output block', () => {
    const ordinary = layoutOf(ser(par(ser(el('no', 'B')), ser(el('no', 'C'))), el('coil', 'M')));
    const outputs = layoutOf(
      ser(el('no', 'A'), par(ser(el('coil', 'M1')), ser(el('coil', 'M2')))),
    );

    // An ordinary block opens and closes; an output block only opens.
    expect(ordinary.dots).toHaveLength(2);
    expect(outputs.dots).toHaveLength(1);
  });

  it('lets two outputs in one rung sit in different columns', () => {
    const { hits } = layoutOf(
      ser(el('no', 'A'), par(ser(el('no', 'B'), el('coil', 'M1')), ser(el('coil', 'M2')))),
    );
    const cells = hits.filter((h) => h.kind === 'cell');
    const rows = [...new Set(cells.map((h) => h.y))].sort((a, b) => a - b);

    const onRow = (y: number) => cells.filter((h) => h.y === y).map((h) => h.x).sort((a, b) => a - b);
    expect(onRow(rows[0])).toEqual([84, 200, 316]);
    expect(onRow(rows[1])).toEqual([200]);
  });

  it('stops the wire at the coil outer edge, not inside its arc', () => {
    // A coil is two arcs bulging out to 32 from centre. A wire that stops at 16
    // is drawn straight through the glyph, which is what made outputs on branch
    // legs look overlapped rather than spaced.
    const { wires } = layoutOf(ser(el('no', 'A'), el('coil', 'M')));
    const cx = X0 + CW + CW / 2;
    const feeding = wires.filter((w) => w.y1 === w.y2 && w.x2 <= cx).map((w) => w.x2);

    expect(Math.max(...feeding)).toBe(cx - 32);
  });

  it('draws no right rail — a coil is where the line stops', () => {
    const { wires } = layoutOf(ser(el('no', 'A'), el('coil', 'M')));
    const verticals = wires.filter((w) => w.x1 === w.x2);

    // Only the gutter divider and the left rail run the height of the canvas.
    expect(verticals.map((w) => w.x1).sort((a, b) => a - b)).toEqual([GUTTER_W, RAIL_L]);
  });

  it('says so plainly when a rung has no output yet', () => {
    const { labels } = layoutOf(ser(el('no', 'A')));
    expect(labels.some((l) => l.text === 'no output')).toBe(true);
  });
});
