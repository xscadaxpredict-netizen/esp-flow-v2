import { create } from 'zustand';
import type { SymbolDecl } from '../../core/models/symbolDecl';
import type { BoardId } from '../../core/models/board';
import { EXTRA_SYMBOLS, SEED_SYMBOLS } from '../../core/data/seed';

/** `kind` decides the tab's icon — the mapping lives in the UI layer, not here. */
export interface EditorTab {
  id: string;
  label: string;
  kind: 'ld' | 'st' | 'table' | 'chart' | 'fb';
  dirty?: boolean;
}

export type TreeGroup = 'root' | 'programs' | 'fbs' | 'tasks' | 'tables';

interface ProjectState {
  projectName: string;
  board: BoardId;
  dirty: boolean;

  tabs: EditorTab[];
  activeTab: number;

  /** Which project-tree groups are expanded. */
  expanded: Record<TreeGroup, boolean>;
  /** Which library groups are expanded. */
  libExpanded: Record<string, boolean>;
  selectedNode: string | null;

  symbols: SymbolDecl[];

  setActiveTab: (i: number) => void;
  closeTab: (i: number) => void;
  toggleGroup: (g: TreeGroup) => void;
  toggleLibGroup: (id: string) => void;
  selectNode: (id: string | null) => void;
  setBoard: (b: BoardId) => void;
  setSymbolField: (index: number, key: keyof SymbolDecl, value: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectName: 'BottlingLine_v3',
  board: 'ESP32-S3',
  dirty: true,

  tabs: [
    { id: 'prog0', label: 'Prog0', kind: 'ld', dirty: true },
    { id: 'motorstarter', label: 'MotorStarter', kind: 'fb' },
    { id: 'devtable1', label: 'Device Table 1', kind: 'table' },
    { id: 'chart', label: 'Monitor Chart', kind: 'chart' },
  ],
  activeTab: 0,

  expanded: { root: true, programs: true, fbs: true, tasks: true, tables: false },
  libExpanded: { std: true, esp: true, user: true },
  selectedNode: 'prog0',

  symbols: [...SEED_SYMBOLS, ...EXTRA_SYMBOLS],

  setActiveTab: (activeTab) => set({ activeTab }),

  closeTab: (i) =>
    set((s) => {
      if (s.tabs.length < 2) return s;
      const tabs = s.tabs.filter((_, idx) => idx !== i);
      const activeTab = s.activeTab >= tabs.length ? tabs.length - 1 : s.activeTab;
      return { tabs, activeTab };
    }),

  toggleGroup: (g) => set((s) => ({ expanded: { ...s.expanded, [g]: !s.expanded[g] } })),
  toggleLibGroup: (id) => set((s) => ({ libExpanded: { ...s.libExpanded, [id]: !s.libExpanded[id] } })),
  selectNode: (selectedNode) => set({ selectedNode }),
  setBoard: (board) => set({ board }),

  setSymbolField: (index, key, value) =>
    set((s) => ({
      symbols: s.symbols.map((sym, i) => (i === index ? { ...sym, [key]: value } : sym)),
      dirty: true,
    })),
}));
