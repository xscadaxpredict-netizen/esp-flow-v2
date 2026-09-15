import { useUIStore } from '../../services/store/useUIStore';
import { useProjectStore } from '../../services/store/useProjectStore';
import { Splitter } from '../shared/components/Splitter';
import { EmptyState } from '../shared/components/EmptyState';
import { useSplitter } from '../shared/hooks/useSplitter';
import { TitleBar } from '../features/title-bar';
import { MenuBar } from '../features/menu-bar';
import { Toolbar } from '../features/toolbar';
import { ProjectTree } from '../features/project-tree';
import { EditorTabs } from '../features/editor-tabs';
import { Breadcrumb } from '../features/breadcrumb';
import { LadderCanvas } from '../features/ladder-editor';
import { SymbolsTable } from '../features/symbols-table';
import { LibraryPanel } from '../features/block-library';
import { PropertiesPanel } from '../features/properties-panel';
import { MessagePanel, MessagePanelCollapsed } from '../features/message-panel';
import { StatusBar } from '../features/status-bar';
import styles from './EditorLayout.module.css';

/**
 * Three rows over a three-column middle band.
 *
 * Inside the work-edit area the order is tab strip, breadcrumb, LOCAL SYMBOLS,
 * splitter, then canvas — as the design prototype builds it. The declarations
 * sit above the diagram that refers to them, which is also how ISPSoft reads.
 *
 * Panel widths are clamped rather than hidden as the viewport shrinks: at the
 * 980x640 floor every region is still present, just at its minimum.
 */
export function EditorLayout() {
  const ui = useUIStore();
  const { tabs, activeTab } = useProjectStore();
  const tab = tabs[activeTab];

  const dragLeft = useSplitter({
    axis: 'x',
    sign: 1,
    min: 96,
    max: () => Math.max(96, window.innerWidth * 0.4),
    value: () => useUIStore.getState().leftW,
    onChange: (v) => useUIStore.getState().setPanel('leftW', v),
  });

  const dragRight = useSplitter({
    axis: 'x',
    sign: -1,
    min: 150,
    max: () => Math.max(150, window.innerWidth * 0.4),
    value: () => useUIStore.getState().rightW,
    onChange: (v) => useUIStore.getState().setPanel('rightW', v),
  });

  const dragBottom = useSplitter({
    axis: 'y',
    sign: -1,
    min: 64,
    max: () => Math.max(64, window.innerHeight * 0.55),
    value: () => useUIStore.getState().bottomH,
    onChange: (v) => useUIStore.getState().setPanel('bottomH', v),
  });

  // The symbols splitter grows the table downward, so dragging down is positive.
  const dragSymbols = useSplitter({
    axis: 'y',
    sign: 1,
    min: 43,
    max: () => Math.max(43, window.innerHeight * 0.4),
    value: () => useUIStore.getState().symH,
    onChange: (v) => useUIStore.getState().setPanel('symH', v),
  });

  const isLadder = tab?.kind === 'ld' || tab?.kind === 'fb';

  return (
    <div className={styles.shell}>
      <TitleBar />
      <MenuBar />
      <Toolbar />

      <div className={styles.middle}>
        {!ui.leftHidden && (
          <>
            <div className={styles.left} style={{ width: ui.leftW }}>
              <ProjectTree />
            </div>
            <Splitter orientation="vertical" onMouseDown={dragLeft} title="Resize project panel" />
          </>
        )}

        <div className={styles.center}>
          <EditorTabs />
          <Breadcrumb />

          {isLadder ? (
            <>
              <SymbolsTable />
              {ui.symOpen && (
                <Splitter
                  orientation="horizontal"
                  grip
                  onMouseDown={dragSymbols}
                  title="Drag to resize the symbol table"
                />
              )}
              <LadderCanvas />
            </>
          ) : tab?.kind === 'st' ? (
            <EmptyState
              icon="st"
              title="Structured Text editor"
              detail="Not designed yet. The ST language front-end lives in the Python compiler, so this tab arrives with the backend."
            />
          ) : tab?.kind === 'chart' ? (
            <EmptyState
              icon="mon"
              title="Monitor chart"
              detail="Not designed yet. Trend plotting needs live values from the device bridge over the WebSocket."
            />
          ) : (
            <EmptyState
              icon="table"
              title="Device monitor table"
              detail="Not designed yet. It will watch and force symbol values while the controller runs."
            />
          )}
        </div>

        {!ui.rightHidden && (
          <>
            <Splitter orientation="vertical" onMouseDown={dragRight} title="Resize right panel" />
            <div className={styles.right} style={{ width: ui.rightW }}>
              <div className={styles.libSlot} data-open={ui.libOpen}>
                <LibraryPanel />
              </div>
              <div className={styles.propsSlot} data-open={ui.propsOpen}>
                <PropertiesPanel />
              </div>
            </div>
          </>
        )}
      </div>

      {ui.bottomHidden ? (
        <MessagePanelCollapsed />
      ) : (
        <>
          <Splitter
            orientation="horizontal"
            grip
            onMouseDown={dragBottom}
            title="Resize message panel"
          />
          <div className={styles.bottom} style={{ height: ui.bottomH }}>
            <MessagePanel />
          </div>
        </>
      )}

      <StatusBar />
    </div>
  );
}
