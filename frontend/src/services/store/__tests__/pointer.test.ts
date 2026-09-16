import { beforeEach, describe, expect, it } from 'vitest';
import { el, ser } from '../../../core/ladder/builders';
import { nodeAt } from '../../../core/ladder/path';
import type { Network } from '../../../core/models/network';
import { useLadderStore } from '../useLadderStore';
import { useUIStore } from '../useUIStore';

/**
 * POSITION DECIDES THE SHAPE.
 *
 * With a tool armed, pointing below an element branches and pointing at either
 * side inserts in series. Branching therefore needs no armed mode — which is
 * how ISPSoft has always worked, and one fewer step than this editor had.
 *
 * The toolbar's branch command still works; an armed branch overrides position,
 * because the user asked for one explicitly.
 */

const oneRung = (): Network[] => [
  { id: 'net1', comment: '', body: ser(el('no', 'A'), el('coil', 'M')) },
];

const store = () => useLadderStore.getState();
const body = () => store().networks[0].body;
const statusMsg = () => useUIStore.getState().statusMsg;

beforeEach(() => {
  useLadderStore.setState({
    networks: oneRung(),
    selection: null,
    past: [],
    future: [],
    activeTool: null,
    branchArm: null,
    hoverZone: 'right',
  });
});

describe('pointing below an element branches it', () => {
  it('turns the element into a two-level block', () => {
    useLadderStore.setState({ activeTool: 'no', hoverZone: 'below' });
    store().cellClick(0, 'cell', [0]);

    const block = nodeAt(body(), [0]);
    expect(block?.t).toBe('par');
    expect(block?.t === 'par' && block.kids).toHaveLength(2);
    expect(statusMsg()).toMatch(/branch spans its parent/i);
  });

  it('gives the new leg the armed tool, not the type it branched from', () => {
    // The old armed-branch route copied the selected element's type. Taking it
    // from the tool is both simpler and what ISPSoft does.
    useLadderStore.setState({ activeTool: 'nc', hoverZone: 'below' });
    store().cellClick(0, 'cell', [0]);

    const leg = nodeAt(body(), [0, 1, 0]);
    expect(leg?.t === 'el' && leg.type).toBe('nc');
  });

  it('records one step of history, like any other change', () => {
    useLadderStore.setState({ activeTool: 'no', hoverZone: 'below' });
    store().cellClick(0, 'cell', [0]);

    expect(store().past).toHaveLength(1);
  });

  it('still refuses what rule 7 refuses, and says why', () => {
    // A contact cannot branch an output — every leg must end the same way.
    useLadderStore.setState({ activeTool: 'no', hoverZone: 'below' });
    store().cellClick(0, 'cell', [1]);

    expect(nodeAt(body(), [1])?.t).toBe('el');
    expect(store().past).toHaveLength(0);
    expect(statusMsg()).toMatch(/needs another output/i);
  });
});

describe('pointing at either side still inserts in series', () => {
  it('inserts before on the left', () => {
    useLadderStore.setState({ activeTool: 'nc', hoverZone: 'left' });
    store().cellClick(0, 'cell', [0]);

    expect(body().kids).toHaveLength(3);
    const first = nodeAt(body(), [0]);
    expect(first?.t === 'el' && first.type).toBe('nc');
  });

  it('inserts after on the right', () => {
    useLadderStore.setState({ activeTool: 'nc', hoverZone: 'right' });
    store().cellClick(0, 'cell', [0]);

    const second = nodeAt(body(), [1]);
    expect(second?.t === 'el' && second.type).toBe('nc');
  });

  it('never branches, whichever side is pointed at', () => {
    useLadderStore.setState({ activeTool: 'no', hoverZone: 'left' });
    store().cellClick(0, 'cell', [0]);

    expect(body().kids.every((k) => k.t === 'el')).toBe(true);
  });
});

describe('what the pointer does not change', () => {
  it('selects the element when no tool is armed, wherever it is pointed', () => {
    useLadderStore.setState({ hoverZone: 'below' });
    store().cellClick(0, 'cell', [0]);

    expect(store().selection).toEqual({ n: 0, kind: 'cell', path: [0] });
    expect(body().kids).toHaveLength(2);
  });

  it('lets an armed branch override the pointer, since it was asked for', () => {
    useLadderStore.setState({
      selection: { n: 0, kind: 'cell', path: [0] },
      branchArm: { type: 'no' },
      hoverZone: 'right',
    });
    store().cellClick(0, 'cell', [0]);

    expect(nodeAt(body(), [0])?.t).toBe('par');
    expect(store().branchArm).toBeNull();
  });

  it('appends at a trailing slot, which has no bands of its own', () => {
    useLadderStore.setState({
      networks: [{ id: 'net1', comment: '', body: ser(el('no', 'A')) }],
      activeTool: 'coil',
      hoverZone: 'below',
    });
    store().cellClick(0, 'slot', []);

    expect(body().kids).toHaveLength(2);
    const last = nodeAt(body(), [1]);
    expect(last?.t === 'el' && last.type).toBe('coil');
  });
});
