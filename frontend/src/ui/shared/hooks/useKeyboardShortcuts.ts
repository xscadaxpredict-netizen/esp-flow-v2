import { useEffect } from 'react';
import type { ElementType } from '../../../core/models/ladderNode';
import { useLadderStore } from '../../../services/store/useLadderStore';
import { useUIStore } from '../../../services/store/useUIStore';
import { runCommand } from '../../features/menu-bar/commands';

/** True when focus is in a field, where bare function keys must stand down. */
const inTextField = (t: EventTarget | null): boolean => {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
};

/**
 * Element placement keys, as the LADDER toolbar labels them.
 *
 * Note the design double-books F4 and Shift+F4: the LADDER group assigns them to
 * the edge contacts and the COMPILE group to error navigation. The contacts win
 * here because F2-F9 form one continuous placement run, and error navigation
 * keeps its toolbar and menu entries.
 */
const TOOL_KEYS: Record<string, ElementType> = {
  F2: 'no',
  F3: 'nc',
  F5: 'coil',
  F6: 'set',
  F7: 'reset',
  F9: 'fb',
};

/**
 * The global keyboard map from the design handoff.
 *
 * Delete and Backspace are deliberately guarded: an engineer clearing a symbol
 * name in Properties must not have the selected contact vanish underneath them.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUIStore.getState();
      const ladder = useLadderStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      const typing = inTextField(e.target);

      if (mod && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        ui.setOverlay('palette', !ui.palette);
        return;
      }

      if (e.key === 'Escape') {
        if (ui.palette || ui.hardware || ui.launcher || ui.openMenu || ui.ctxMenu) {
          ui.closeAllOverlays();
        } else if (ladder.branchArm || ladder.activeTool) {
          ladder.cancelArm();
        }
        return;
      }

      if (typing) return;

      /* ── element placement tools ──────────────────────────── */
      const armTool = (tool: ElementType) => {
        if (ui.mode === 'online') {
          ui.setStatus('Editing is disabled in online monitor mode');
          return;
        }
        ladder.setActiveTool(ladder.activeTool === tool ? null : tool);
      };

      if (!mod && !e.shiftKey && TOOL_KEYS[e.key]) {
        e.preventDefault();
        return armTool(TOOL_KEYS[e.key]);
      }
      if (e.key === 'F4') {
        e.preventDefault();
        return armTool(e.shiftKey ? 'n' : 'p');
      }

      /* ── ladder editing ───────────────────────────────────── */
      if (mod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        return runCommand('edit.branch');
      }
      if (mod && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        return runCommand('edit.insnet');
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        return runCommand('edit.delnet');
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (ui.mode === 'online') {
          ui.setStatus('Editing is disabled in online monitor mode');
          return;
        }
        e.preventDefault();
        return runCommand('edit.delelem');
      }

      /* ── history ──────────────────────────────────────────── */
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        return ladder.undo();
      }
      if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        return ladder.redo();
      }

      /* ── view ─────────────────────────────────────────────── */
      if (mod && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        return runCommand('view.grid');
      }
      if (mod && e.key === ';') {
        e.preventDefault();
        return runCommand('view.comments');
      }
      if (mod && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        return runCommand('view.zin');
      }
      if (mod && e.key === '-') {
        e.preventDefault();
        return runCommand('view.zout');
      }
      if (mod && e.key === '0') {
        e.preventDefault();
        return runCommand('view.zfit');
      }

      /* ── device ───────────────────────────────────────────── */
      if (mod && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        return runCommand('plc.online');
      }
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        return runCommand('plc.connect');
      }
      if (mod && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        return runCommand('plc.run');
      }
      if (mod && e.key === '.') {
        e.preventDefault();
        return runCommand('plc.stop');
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        return runCommand('plc.force');
      }
      if (e.key === 'F8') {
        e.preventDefault();
        return runCommand(e.shiftKey ? 'plc.upload' : 'plc.download');
      }

      /* ── build ────────────────────────────────────────────── */
      if (e.key === 'F11') {
        e.preventDefault();
        return runCommand(mod ? 'compile.rebuild' : 'compile.build');
      }
      if (e.key === 'F12') {
        e.preventDefault();
        return runCommand('compile.check');
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        return runCommand('compile.xref');
      }
      if (mod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        return runCommand('edit.find');
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
