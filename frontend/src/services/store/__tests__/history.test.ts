import { beforeEach, describe, expect, it } from 'vitest';
import { el, ser } from '../../../core/ladder/builders';
import type { Network } from '../../../core/models/network';
import { useCompileStore } from '../useCompileStore';
import { useLadderStore } from '../useLadderStore';

/**
 * UNDO AND REDO.
 *
 * The history is a stack of fifty complete network lists, which only works
 * because every mutation returns a fresh copy. These tests guard the stack; the
 * copying itself is covered in core/ladder/__tests__/immutability.test.ts.
 */

const oneRung = (): Network[] => [
  { id: 'net1', comment: '', body: ser(el('no', 'A'), el('coil', 'M')) },
];

const store = () => useLadderStore.getState();

beforeEach(() => {
  useLadderStore.setState({
    networks: oneRung(),
    selection: { n: 0, kind: 'cell', path: [0] },
    past: [],
    future: [],
  });
});

describe('what earns a step of history', () => {
  it('records one step when something changes', () => {
    store().addNetwork();

    expect(store().networks).toHaveLength(2);
    expect(store().past).toHaveLength(1);
  });

  it('records nothing when the mutation is refused', () => {
    // A program needs at least one rung, so this one is turned down.
    store().deleteNetwork();

    expect(store().networks).toHaveLength(1);
    expect(store().past).toHaveLength(0);
    expect(store().canUndo()).toBe(false);
  });
});

describe('walking the stack', () => {
  it('puts the previous list back and offers a redo', () => {
    store().addNetwork();
    store().undo();

    expect(store().networks).toHaveLength(1);
    expect(store().past).toHaveLength(0);
    expect(store().future).toHaveLength(1);
    expect(store().canRedo()).toBe(true);
  });

  it('redoes what it undid', () => {
    store().addNetwork();
    store().undo();
    store().redo();

    expect(store().networks).toHaveLength(2);
    expect(store().canRedo()).toBe(false);
  });

  it('drops the redo stack once you change something new', () => {
    store().addNetwork();
    store().undo();
    expect(store().canRedo()).toBe(true);

    store().addNetwork();
    expect(store().future).toHaveLength(0);
    expect(store().canRedo()).toBe(false);
  });

  it('says there is nothing to undo on a fresh program', () => {
    store().undo();

    expect(store().networks).toHaveLength(1);
    expect(store().canUndo()).toBe(false);
  });
});

describe('structural diagnostics follow the tree', () => {
  it('reports a rung that has no output, without waiting for a compile', () => {
    useLadderStore.setState({ networks: [{ id: 'n', comment: '', body: ser(el('no', 'A')) }] });

    const own = useCompileStore.getState().problems.filter((p) => p.origin === 'browser');
    expect(own.map((p) => p.code)).toContain('STR-0111');
  });

  it('leaves the compiler own diagnostics alone', () => {
    useLadderStore.setState({ networks: [{ id: 'n', comment: '', body: ser(el('no', 'A')) }] });

    const server = useCompileStore.getState().problems.filter((p) => p.origin === 'server');
    expect(server.length).toBeGreaterThan(0);
  });
});

describe('the fifty-step limit', () => {
  it('keeps the fifty most recent states and drops the oldest', () => {
    for (let i = 0; i < 55; i += 1) store().addNetwork();

    expect(store().past).toHaveLength(50);
    expect(store().networks).toHaveLength(56);
  });
});
