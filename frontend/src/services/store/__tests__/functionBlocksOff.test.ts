import { beforeEach, describe, expect, it } from 'vitest';
import { SEED_NETWORKS, SEED_SYMBOLS } from '../../../core/data/seed';
import { FUNCTION_BLOCKS_ENABLED, FUNCTION_BLOCKS_UNAVAILABLE } from '../../../core/features';
import { el, ser } from '../../../core/ladder/builders';
import type { LadderNode } from '../../../core/models/ladderNode';
import { useLadderStore } from '../useLadderStore';
import { useUIStore } from '../useUIStore';

/**
 * FUNCTION BLOCKS ARE SWITCHED OFF — see core/features.ts.
 *
 * The block the editor could draw was a hard-coded TON that did not follow
 * ISPSoft, so it is hidden until the redesign lands. These pin that it really is
 * unreachable, and that the switch says why rather than doing nothing.
 *
 * They skip themselves when the switch is turned back on, since then the
 * opposite is intended.
 */

const store = () => useLadderStore.getState();
const statusMsg = () => useUIStore.getState().statusMsg;

const anyBlock = (n: LadderNode): boolean =>
  n.t === 'el' ? n.type === 'fb' : (n.kids as LadderNode[]).some(anyBlock);

beforeEach(() => {
  useLadderStore.setState({
    networks: [{ id: 'net1', comment: '', body: ser(el('no', 'A'), el('coil', 'M')) }],
    selection: null,
    past: [],
    future: [],
    activeTool: null,
    branchArm: null,
    hoverZone: 'right',
  });
  useUIStore.getState().setStatus('Ready');
});

describe.skipIf(FUNCTION_BLOCKS_ENABLED)('with function blocks switched off', () => {
  it('will not arm the function block tool, and says why', () => {
    // The toolbar button and F9 both arm through setActiveTool.
    store().setActiveTool('fb');

    expect(store().activeTool).toBeNull();
    expect(statusMsg()).toBe(FUNCTION_BLOCKS_UNAVAILABLE);
  });

  it('leaves a tool that is already armed exactly as it was', () => {
    store().setActiveTool('nc');
    store().setActiveTool('fb');

    expect(store().activeTool).toBe('nc');
  });

  it('changes nothing about the other tools', () => {
    for (const tool of ['no', 'nc', 'p', 'n', 'coil', 'set', 'reset'] as const) {
      store().setActiveTool(tool);
      expect(store().activeTool).toBe(tool);
    }
  });

  it('opens onto a program that holds no function block', () => {
    expect(SEED_NETWORKS.some((net) => anyBlock(net.body))).toBe(false);
  });

  it('declares no function block instance in the seed either', () => {
    // A TON-typed symbol with nothing on the canvas using it would only confuse.
    expect(SEED_SYMBOLS.some((s) => s.type === 'TON')).toBe(false);
  });
});
