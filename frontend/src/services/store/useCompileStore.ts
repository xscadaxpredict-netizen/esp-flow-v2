import { create } from 'zustand';
import type { Diagnostic, Severity } from '../../core/models/diagnostic';
import { BUILD_LOG, BUILD_STAGES, SEED_PROBLEMS } from '../../core/data/seed';

export type BottomTab = 'compile' | 'problems' | 'xref';
/** Filter labels as the design writes them, plural. */
export type SeverityFilter = 'All' | 'Errors' | 'Warnings' | 'Info';
export type SourceFilter = 'All' | 'Editor' | 'Compiler';

const SEVERITY_OF: Record<Exclude<SeverityFilter, 'All'>, Severity> = {
  Errors: 'error',
  Warnings: 'warning',
  Info: 'info',
};

/** Does a diagnostic pass the current filter pair? */
export const matchesFilters = (
  d: { severity: Severity; origin: 'browser' | 'server' },
  sev: SeverityFilter,
  src: SourceFilter,
) =>
  (sev === 'All' || d.severity === SEVERITY_OF[sev]) &&
  (src === 'All' || (src === 'Compiler' ? d.origin === 'server' : d.origin === 'browser'));

interface CompileState {
  bottomTab: BottomTab;
  building: boolean;
  /** Index into BUILD_STAGES. */
  stage: number;
  elapsed: number;
  /** How many log lines are revealed. */
  logN: number;

  problems: Diagnostic[];
  sevFilter: SeverityFilter;
  srcFilter: SourceFilter;
  hoveredProblem: number;

  setBottomTab: (t: BottomTab) => void;
  setSevFilter: (s: SeverityFilter) => void;
  setSrcFilter: (s: SourceFilter) => void;
  setHoveredProblem: (i: number) => void;
  /** Structural diagnostics recomputed by the editor; compiler ones are left alone. */
  setStructuralProblems: (d: Diagnostic[]) => void;
  startBuild: () => void;
  stopBuild: () => void;
  tick: () => void;
}

let timer: ReturnType<typeof setInterval> | null = null;

export const useCompileStore = create<CompileState>((set, get) => ({
  bottomTab: 'compile',
  building: false,
  stage: BUILD_STAGES.length - 1,
  elapsed: 28.3,
  logN: BUILD_LOG.length,

  problems: SEED_PROBLEMS,
  sevFilter: 'All',
  srcFilter: 'All',
  hoveredProblem: -1,

  setBottomTab: (bottomTab) => set({ bottomTab }),
  setSevFilter: (sevFilter) => set({ sevFilter }),
  setSrcFilter: (srcFilter) => set({ srcFilter }),
  setHoveredProblem: (hoveredProblem) => set({ hoveredProblem }),

  setStructuralProblems: (structural) =>
    set((s) => ({
      problems: [...s.problems.filter((p) => p.origin === 'server'), ...structural],
    })),

  startBuild: () => {
    if (timer) clearInterval(timer);
    set({ building: true, stage: 0, elapsed: 0, logN: 0, bottomTab: 'compile' });
    timer = setInterval(() => get().tick(), 100);
  },

  stopBuild: () => {
    if (timer) clearInterval(timer);
    timer = null;
    set({ building: false });
  },

  /**
   * Advances the staged progress. The real build streams this from Celery over
   * the WebSocket; the shape of the state is the same either way.
   */
  tick: () => {
    const { elapsed, stage, logN } = get();
    const next = elapsed + 0.1;
    const stageEnds = [1.4, 3.5, 23.1, 28.3, 28.3];
    let nextStage = stage;
    while (nextStage < stageEnds.length - 1 && next >= stageEnds[nextStage]) nextStage += 1;

    const visible = BUILD_LOG.filter(([s]) => s <= nextStage).length;
    const nextLogN = Math.min(visible, logN + 1);

    if (next >= 28.3) {
      get().stopBuild();
      set({ elapsed: 28.3, stage: BUILD_STAGES.length - 1, logN: BUILD_LOG.length });
      return;
    }
    set({ elapsed: next, stage: nextStage, logN: nextLogN });
  },
}));
