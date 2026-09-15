import { useCallback, useRef } from 'react';

interface SplitterOptions {
  axis: 'x' | 'y';
  /** +1 when dragging right/down grows the panel, -1 when it shrinks it. */
  sign: 1 | -1;
  min: number;
  max: () => number;
  value: () => number;
  onChange: (v: number) => void;
}

/**
 * Drag-to-resize for a panel edge.
 *
 * Listeners go on the window rather than the handle, so the drag survives the
 * pointer leaving the 4px grab strip — which it does constantly at these sizes.
 */
export function useSplitter({ axis, sign, min, max, value, onChange }: SplitterOptions) {
  const dragging = useRef(false);

  return useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (dragging.current) return;
      dragging.current = true;

      const start = axis === 'x' ? e.clientX : e.clientY;
      const startValue = value();
      const previousCursor = document.body.style.cursor;
      const previousSelect = document.body.style.userSelect;
      document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';

      const move = (ev: MouseEvent) => {
        const delta = ((axis === 'x' ? ev.clientX : ev.clientY) - start) * sign;
        onChange(Math.max(min, Math.min(max(), startValue + delta)));
      };

      const up = () => {
        dragging.current = false;
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousSelect;
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
      };

      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    },
    [axis, sign, min, max, value, onChange],
  );
}
