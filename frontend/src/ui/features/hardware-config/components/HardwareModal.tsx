import { useState } from 'react';
import { BOARD_IDS, type BoardId, type PinAssignment } from '../../../../core/models/board';
import { useProjectStore } from '../../../../services/store/useProjectStore';
import { useUIStore } from '../../../../services/store/useUIStore';
import { Icon } from '../../../shared/icons/Icon';
import styles from './HardwareModal.module.css';

/**
 * Hardware configuration — where a GPIO pin becomes an IEC located variable.
 *
 * The design specifies this only partially, so it is built to what is specified
 * and no further. The duplicate-pin conflict is a structural check the browser
 * owns (ADR-001 §4.1); pin validity for a board comes from a profile the backend
 * will publish, not from a rule encoded here.
 */
const INITIAL: PinAssignment[] = [
  { gpio: 34, direction: 'input', address: '%IX0.0', symbol: 'StartButton', comment: 'Line start pushbutton' },
  { gpio: 35, direction: 'input', address: '%IX0.1', symbol: 'StopButton', comment: 'E-stop, fail-safe NC' },
  { gpio: 32, direction: 'input', address: '%IX0.3', symbol: 'ResetBtn', comment: 'Operator reset' },
  { gpio: 26, direction: 'output', address: '%QX0.1', symbol: 'ConveyorMotor', comment: 'Main contactor' },
  { gpio: 27, direction: 'output', address: '%QX0.2', symbol: 'DrumRelease', comment: 'Release solenoid' },
  { gpio: 26, direction: 'output', address: '%QX0.3', symbol: 'FillValve', comment: 'Fill valve' },
];

export function HardwareModal() {
  const open = useUIStore((s) => s.hardware);
  const setOverlay = useUIStore((s) => s.setOverlay);
  const board = useProjectStore((s) => s.board);
  const setBoard = useProjectStore((s) => s.setBoard);
  const [rows] = useState<PinAssignment[]>(INITIAL);

  if (!open) return null;

  const counts = rows.reduce<Record<number, number>>((acc, r) => {
    acc[r.gpio] = (acc[r.gpio] ?? 0) + 1;
    return acc;
  }, {});
  const conflicts = rows.filter((r) => counts[r.gpio] > 1).length;

  return (
    <div className={styles.scrim} onMouseDown={() => setOverlay('hardware', false)} role="presentation">
      <div
        className={styles.modal}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Hardware configuration"
      >
        <div className={styles.head}>
          <Icon name="chip" size={13} />
          <span className={styles.title}>Hardware Configuration</span>
          <button
            type="button"
            className={styles.close}
            onClick={() => setOverlay('hardware', false)}
            aria-label="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M1 1l8 8M9 1L1 9" />
            </svg>
          </button>
        </div>

        <div className={styles.controls}>
          <label className={styles.label} htmlFor="board">
            Target board
          </label>
          <select
            id="board"
            className={styles.select}
            value={board}
            onChange={(e) => setBoard(e.target.value as BoardId)}
          >
            {BOARD_IDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {conflicts > 0 && (
            <span className={styles.conflict}>
              <Icon name="err" size={11} />
              {conflicts} rows share a GPIO pin
            </span>
          )}
        </div>

        <div className={styles.body}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>GPIO</th>
                <th className={styles.th}>Direction</th>
                <th className={styles.th}>IEC Address</th>
                <th className={styles.th}>Symbol</th>
                <th className={styles.th}>Comment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const dup = counts[r.gpio] > 1;
                return (
                  <tr key={i} className={dup ? `${styles.tr} ${styles.trBad}` : styles.tr}>
                    <td className={`${styles.td} ${styles.mono}`}>
                      {dup && <Icon name="err" size={10} />}
                      GPIO {r.gpio}
                    </td>
                    <td className={styles.td}>{r.direction}</td>
                    <td className={`${styles.td} ${styles.mono}`}>{r.address}</td>
                    <td className={styles.td}>{r.symbol}</td>
                    <td className={`${styles.td} ${styles.cmt}`}>{r.comment}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className={styles.note}>
            A pin bound here becomes a located variable — the program refers to the symbol, and only
            this table knows which pin it is wired to.
          </p>
        </div>
      </div>
    </div>
  );
}
