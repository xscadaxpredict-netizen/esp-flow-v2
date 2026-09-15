import { create } from 'zustand';

export type Theme = 'dark' | 'light';
/** `edit` is offline authoring; `online` disables editing and shows live data. */
export type Mode = 'edit' | 'online';

export interface ContextMenuState {
  x: number;
  y: number;
  target: string;
}

interface UIState {
  theme: Theme;
  mode: Mode;

  /* panel geometry, in px */
  leftW: number;
  rightW: number;
  bottomH: number;
  symH: number;

  /* collapse flags — Library and Properties collapse independently */
  symOpen: boolean;
  libOpen: boolean;
  propsOpen: boolean;
  bottomHidden: boolean;
  leftHidden: boolean;
  rightHidden: boolean;

  /* transient chrome */
  openMenu: string | null;
  palette: boolean;
  hardware: boolean;
  launcher: boolean;
  ctxMenu: ContextMenuState | null;
  tooltip: { key: string; x: number; y: number; text: string } | null;

  /* canvas view options */
  showGrid: boolean;
  showComments: boolean;
  zoom: number;

  /** The sentence the status bar reports — how the editor says what a click did. */
  statusMsg: string;

  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setMode: (m: Mode) => void;
  toggleMode: () => void;
  setPanel: (k: 'leftW' | 'rightW' | 'bottomH' | 'symH', v: number) => void;
  toggle: (
    k:
      | 'symOpen'
      | 'libOpen'
      | 'propsOpen'
      | 'bottomHidden'
      | 'leftHidden'
      | 'rightHidden'
      | 'showGrid'
      | 'showComments',
  ) => void;
  /** View > Panels: hide or restore both side panels together. */
  togglePanels: () => void;
  /** Put every panel back to the size the design specifies. */
  resetLayout: () => void;
  setOpenMenu: (m: string | null) => void;
  setOverlay: (k: 'palette' | 'hardware' | 'launcher', v: boolean) => void;
  setCtxMenu: (c: ContextMenuState | null) => void;
  setTooltip: (t: UIState['tooltip']) => void;
  setZoom: (z: number) => void;
  setStatus: (msg: string) => void;
  closeAllOverlays: () => void;
}

const THEME_KEY = 'espflow.theme';

const initialTheme = (): Theme => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Private windows and blocked site data both throw here; dark is the default.
  }
  return 'dark';
};

export const useUIStore = create<UIState>((set, get) => ({
  theme: initialTheme(),
  mode: 'edit',

  leftW: 238,
  rightW: 296,
  bottomH: 150,
  symH: 65,

  symOpen: true,
  libOpen: true,
  propsOpen: true,
  bottomHidden: false,
  leftHidden: false,
  rightHidden: false,

  openMenu: null,
  palette: false,
  hardware: false,
  launcher: false,
  ctxMenu: null,
  tooltip: null,

  showGrid: true,
  showComments: true,
  zoom: 1,

  statusMsg: 'Ready',

  setTheme: (theme) => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Not being able to remember the choice is not a reason to refuse it.
    }
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),

  setMode: (mode) =>
    set({
      mode,
      statusMsg:
        mode === 'online'
          ? 'Online monitor — editing is disabled while connected'
          : 'Offline edit mode',
    }),
  toggleMode: () => get().setMode(get().mode === 'edit' ? 'online' : 'edit'),

  setPanel: (k, v) => set({ [k]: v } as unknown as Partial<UIState>),
  toggle: (k) => set((s) => ({ [k]: !s[k] }) as unknown as Partial<UIState>),

  togglePanels: () =>
    set((s) => {
      const hide = !(s.leftHidden && s.rightHidden);
      return {
        leftHidden: hide,
        rightHidden: hide,
        statusMsg: hide ? 'Side panels hidden — the canvas has the width' : 'Side panels restored',
      };
    }),

  resetLayout: () => {
    set({
      leftW: 238,
      rightW: 296,
      bottomH: 150,
      symH: 65,
      symOpen: true,
      libOpen: true,
      propsOpen: true,
      bottomHidden: false,
      leftHidden: false,
      rightHidden: false,
      zoom: 1,
      statusMsg: 'Layout reset',
    });
  },

  setOpenMenu: (openMenu) => set({ openMenu }),
  setOverlay: (k, v) => set({ [k]: v } as unknown as Partial<UIState>),
  setCtxMenu: (ctxMenu) => set({ ctxMenu }),
  setTooltip: (tooltip) => set({ tooltip }),
  setZoom: (zoom) => set({ zoom: Math.max(0.4, Math.min(2.5, zoom)) }),
  setStatus: (statusMsg) => set({ statusMsg }),

  closeAllOverlays: () =>
    set({ openMenu: null, palette: false, hardware: false, launcher: false, ctxMenu: null }),
}));
