import { useUIStore } from '../../../services/store/useUIStore';

/**
 * Handlers that show and hide the shared tooltip for a control.
 *
 * Lives apart from the component so the module exports only functions and Fast
 * Refresh keeps working on TooltipLayer.
 */
export function tooltipProps(key: string, text: string) {
  return {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      useUIStore.getState().setTooltip({ key, text, x: r.left, y: r.bottom + 4 });
    },
    onMouseLeave: () => useUIStore.getState().setTooltip(null),
  };
}
