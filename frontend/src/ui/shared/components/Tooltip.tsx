import { useUIStore } from '../../../services/store/useUIStore';
import styles from './Tooltip.module.css';

/**
 * A single tooltip rendered at the app root and positioned from store state, so
 * every toolbar button does not carry its own floating element.
 */
export function TooltipLayer() {
  const tooltip = useUIStore((s) => s.tooltip);
  if (!tooltip) return null;
  return (
    <div className={styles.tip} style={{ left: tooltip.x, top: tooltip.y }} role="tooltip">
      {tooltip.text}
    </div>
  );
}
