import { useEffect } from 'react';
import { useUIStore } from '../../services/store/useUIStore';
import { useKeyboardShortcuts } from '../shared/hooks/useKeyboardShortcuts';
import { ContextMenu } from '../shared/components/ContextMenu';
import { TooltipLayer } from '../shared/components/Tooltip';
import { EditorLayout } from '../layouts/EditorLayout';
import { CommandPalette } from '../features/command-palette';
import { HardwareModal } from '../features/hardware-config';

export function App() {
  const theme = useUIStore((s) => s.theme);
  useKeyboardShortcuts();

  // The theme is a single attribute on <html>; every colour follows from the
  // token block it selects, so nothing needs to re-render to change it.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      <EditorLayout />
      <CommandPalette />
      <HardwareModal />
      <ContextMenu />
      <TooltipLayer />
    </>
  );
}

export default App;
