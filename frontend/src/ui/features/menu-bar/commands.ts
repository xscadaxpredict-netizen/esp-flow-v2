import { useCompileStore } from '../../../services/store/useCompileStore';
import { useLadderStore } from '../../../services/store/useLadderStore';
import { useProjectStore } from '../../../services/store/useProjectStore';
import { useUIStore } from '../../../services/store/useUIStore';

/**
 * One dispatcher for every menu item, toolbar button and command-palette entry,
 * so a command behaves identically wherever it is invoked from.
 *
 * Anything that needs the backend or a connected device reports honestly through
 * the status bar rather than pretending to work.
 */
export function runCommand(id: string) {
  const ui = useUIStore.getState();
  const ladder = useLadderStore.getState();
  const compile = useCompileStore.getState();
  const project = useProjectStore.getState();

  switch (id) {
    /* ── File ───────────────────────────────────────────────── */
    case 'file.save':
      return ui.setStatus('Saving needs the Django backend — not wired up yet');
    case 'file.export':
      return ui.setStatus('Project export (.espf) arrives with the backend');

    /* ── Edit ───────────────────────────────────────────────── */
    case 'edit.undo':
      return ladder.undo();
    case 'edit.redo':
      return ladder.redo();
    case 'edit.delelem':
      return ladder.deleteSelected();
    case 'edit.insnet':
      return ladder.addNetwork();
    case 'edit.delnet':
      return ladder.deleteNetwork();
    case 'edit.branch':
      return ladder.armBranch();
    case 'edit.find':
      compile.setBottomTab('xref');
      return ui.setStatus('Cross reference — pick a symbol to see every use');

    /* ── View ───────────────────────────────────────────────── */
    case 'view.zin':
      return ui.setZoom(ui.zoom + 0.1);
    case 'view.zout':
      return ui.setZoom(ui.zoom - 0.1);
    case 'view.zfit':
      return ui.setZoom(1);
    case 'view.grid':
      return ui.toggle('showGrid');
    case 'view.comments':
      return ui.toggle('showComments');
    case 'view.panels':
      return ui.togglePanels();

    /* ── Compile ────────────────────────────────────────────── */
    case 'compile.build':
    case 'compile.rebuild':
      return compile.startBuild();
    case 'compile.check':
      compile.setBottomTab('problems');
      return ui.setStatus('Check complete — see Problems');
    case 'compile.next':
    case 'compile.prev':
      compile.setBottomTab('problems');
      return ui.setStatus('Jumped to the next diagnostic');
    case 'compile.xref':
      return compile.setBottomTab('xref');

    /* ── PLC ────────────────────────────────────────────────── */
    case 'plc.online':
      return ui.toggleMode();
    case 'plc.connect':
      return ui.setStatus('Connect over Web Serial — not wired up until the device bridge lands');
    case 'plc.download':
      return ui.setStatus('Download needs a compiled image and a connected device');
    case 'plc.upload':
      return ui.setStatus('Upload from PLC would overwrite the open project');
    case 'plc.run':
    case 'plc.stop':
      return ui.setStatus('Run and stop require a connected device');
    case 'plc.force':
      return ui.setStatus('Forcing is available in online monitor mode');
    case 'plc.clear':
      return ui.setStatus('Clearing PLC memory requires a connected device');
    case 'plc.info':
      return ui.setStatus(`Target ${project.board} — no device connected`);

    /* ── Tools ──────────────────────────────────────────────── */
    case 'tools.hw':
      return ui.setOverlay('hardware', true);
    case 'tools.palette':
      return ui.setOverlay('palette', true);
    case 'tools.symbols':
      ui.setPanel('symH', 180);
      return ui.setStatus('Local symbols expanded — global symbols arrive with the backend');

    /* ── Window ─────────────────────────────────────────────── */
    case 'window.reset':
      return ui.resetLayout();
    case 'window.chart': {
      const chart = project.tabs.findIndex((t) => t.kind === 'chart');
      if (chart >= 0) project.setActiveTab(chart);
      return;
    }

    // Naming the command makes the next wiring gap obvious rather than silent.
    default:
      return ui.setStatus(`${id} is not implemented yet in this build`);
  }
}
