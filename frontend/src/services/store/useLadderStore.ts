import { create } from 'zustand';
import type { ElementType } from '../../core/models/ladderNode';
import type { Network } from '../../core/models/network';
import type { InsertSide, Selection } from '../../core/models/selection';
import type { ValueMap } from '../../core/ladder/evaluate';
import {
  addNetwork as addNetworkOp,
  appendTo,
  bindSymbol as bindSymbolOp,
  branchAt,
  deleteAt,
  deleteNetwork as deleteNetworkOp,
  placeAt,
  setElementField as setFieldOp,
  setElementType as setTypeOp,
  setNetworkComment as setCommentOp,
  type MutationResult,
} from '../../core/ladder/mutations';
import { elementAt } from '../../core/ladder/path';
import { checkProgram } from '../../core/rules/structural';
import { SEED_NETWORKS, SEED_VALUES } from '../../core/data/seed';
import { useCompileStore } from './useCompileStore';
import { useUIStore } from './useUIStore';

const HISTORY_LIMIT = 50;

interface LadderState {
  networks: Network[];
  selection: Selection | null;
  /** A branch is armed: the next click on an element creates a parallel level. */
  branchArm: { type: ElementType } | null;
  /** The element tool armed on the toolbar, if any. */
  activeTool: ElementType | null;
  /** Which half of an element the pointer is over, deciding insertion side. */
  hoverSide: InsertSide;
  /** Live values during monitoring. Seeded until the device bridge exists. */
  values: ValueMap;

  past: Network[][];
  future: Network[][];

  select: (sel: Selection | null) => void;
  setActiveTool: (t: ElementType | null) => void;
  setHoverSide: (s: InsertSide) => void;
  armBranch: () => void;
  cancelArm: () => void;

  /** A click on the canvas. Everything the editor does starts here. */
  cellClick: (n: number, kind: 'cell' | 'slot', arg: number[]) => void;

  addNetwork: () => void;
  deleteNetwork: () => void;
  deleteSelected: () => void;
  bindSymbol: (name: string, addr: string) => void;
  setElementType: (t: ElementType) => void;
  setElementField: (key: 'sym' | 'addr' | 'pt', value: string) => void;
  setNetworkComment: (n: number, comment: string) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const status = (msg: string) => useUIStore.getState().setStatus(msg);

export const useLadderStore = create<LadderState>((set, get) => {
  /** Apply a mutation result: push history, move the selection, report to the status bar. */
  const apply = (result: MutationResult, extra: Partial<LadderState> = {}) => {
    if (!result.changed) {
      status(result.statusMsg);
      set(extra as Partial<LadderState>);
      return;
    }
    set((s) => ({
      networks: result.networks,
      selection: result.selection,
      past: [...s.past, s.networks].slice(-HISTORY_LIMIT),
      future: [],
      ...extra,
    }));
    status(result.statusMsg);
  };

  return {
    networks: SEED_NETWORKS,
    selection: { n: 0, kind: 'cell', path: [1] },
    branchArm: null,
    activeTool: null,
    hoverSide: 'right',
    values: SEED_VALUES,
    past: [],
    future: [],

    select: (selection) => set({ selection }),
    setHoverSide: (hoverSide) => set({ hoverSide }),

    setActiveTool: (activeTool) => {
      set({ activeTool, branchArm: null });
      status(
        activeTool
          ? `Click a rung position to place a ${activeTool === 'fb' ? 'function block' : activeTool.toUpperCase()} element — Escape to cancel`
          : 'Tool cleared',
      );
    },

    armBranch: () => {
      const { selection, networks } = get();
      const net = selection ? networks[selection.n] : null;
      const element = net && selection?.path ? elementAt(net.body, selection.path) : null;

      if (!element) {
        status('Select a contact or coil first, then branch from it');
        return;
      }
      if (element.type === 'fb') {
        status('Function blocks cannot be branched');
        return;
      }
      set({ branchArm: { type: element.type }, activeTool: null });
      status(
        'Branch armed — click an element; the child spans that element and grows with anything inserted beside it inside the block',
      );
    },

    cancelArm: () => {
      set({ branchArm: null, activeTool: null });
      status('Cancelled');
    },

    cellClick: (n, kind, arg) => {
      const { activeTool, branchArm, hoverSide, selection } = get();
      const nets = get().networks;

      const path = arg;

      if (kind === 'slot') {
        if (branchArm) {
          set({ branchArm: null });
          status('Nothing to branch from — click an existing element');
          return;
        }
        if (activeTool) {
          // An output placed at a trailing slot ends that line (rule 6).
          apply(appendTo(nets, n, path, activeTool, selection));
          return;
        }
        set({ selection: { n, kind: 'slot', path } });
        return;
      }

      if (branchArm) {
        apply(branchAt(nets, n, path, branchArm.type, selection), { branchArm: null });
        return;
      }
      if (activeTool) {
        apply(placeAt(nets, n, path, hoverSide, activeTool, selection));
        return;
      }
      set({ selection: { n, kind: 'cell', path } });
    },

    addNetwork: () => apply(addNetworkOp(get().networks)),

    deleteNetwork: () => {
      const { networks, selection } = get();
      apply(deleteNetworkOp(networks, selection ? selection.n : networks.length - 1, selection));
    },

    deleteSelected: () => apply(deleteAt(get().networks, get().selection)),

    bindSymbol: (name, addr) => apply(bindSymbolOp(get().networks, get().selection, name, addr)),

    setElementType: (t) => apply(setTypeOp(get().networks, get().selection, t)),

    setElementField: (key, value) =>
      set((s) => ({ networks: setFieldOp(s.networks, s.selection, key, value) })),

    setNetworkComment: (n, comment) =>
      set((s) => ({ networks: setCommentOp(s.networks, n, comment) })),

    undo: () => {
      const { past, networks, future } = get();
      if (!past.length) {
        status('Nothing to undo');
        return;
      }
      set({
        networks: past[past.length - 1],
        past: past.slice(0, -1),
        future: [networks, ...future].slice(0, HISTORY_LIMIT),
        selection: null,
      });
      status('Undo');
    },

    redo: () => {
      const { past, networks, future } = get();
      if (!future.length) {
        status('Nothing to redo');
        return;
      }
      set({
        networks: future[0],
        future: future.slice(1),
        past: [...past, networks].slice(-HISTORY_LIMIT),
        selection: null,
      });
      status('Redo');
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  };
});

/**
 * Structural diagnostics follow the tree.
 *
 * ADR-001 puts these on the browser's side precisely so they can appear as you
 * draw rather than waiting for a compile. Server diagnostics are left alone and
 * keep arriving over the WebSocket.
 */
const publishStructural = (networks: Network[]) =>
  useCompileStore.getState().setStructuralProblems(checkProgram(networks));

useLadderStore.subscribe((s, prev) => {
  if (s.networks !== prev.networks) publishStructural(s.networks);
});

publishStructural(useLadderStore.getState().networks);
