import { useMemo, useState } from 'react';
import type { Zone } from '../../../../core/ladder/legality';
import { layoutLadder, zoneAt, type Hit } from '../../../../core/ladder/layout';
import { useLadderStore } from '../../../../services/store/useLadderStore';
import { useUIStore } from '../../../../services/store/useUIStore';
import styles from './LadderCanvas.module.css';

/**
 * The ladder canvas — the document itself.
 *
 * All geometry comes from `core/ladder/layout`, which is pure. This component
 * renders the draw lists and turns clicks on the hit rects into store actions.
 * Nothing here knows how a branch is shaped; that lives in the domain layer.
 */
export function LadderCanvas() {
  const { networks, selection, values, branchArm, activeTool, cellClick, setHoverZone, addNetwork } =
    useLadderStore();
  const mode = useUIStore((s) => s.mode);
  const showGrid = useUIStore((s) => s.showGrid);
  const showComments = useUIStore((s) => s.showComments);
  const zoom = useUIStore((s) => s.zoom);

  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [zone, setZone] = useState<Zone>('right');

  const online = mode === 'online';
  const layout = useMemo(
    () => layoutLadder({ networks, values, online, selection, showComments }),
    [networks, values, online, selection, showComments],
  );

  const armed = !!branchArm;

  /**
   * The pointer's position inside a cell is what decides the shape, so it is
   * tracked as it moves rather than read at the click.
   *
   * The rect is drawn in SVG units and displayed at the zoom scale, so the
   * offset is converted back to a fraction before `zoneAt` sees it. Pixels
   * would give the wrong band at any zoom but 100%.
   */
  const onHitMove = (hit: Hit) => (e: React.MouseEvent) => {
    if (!hit.insertable && !hit.branchable) return;
    const box = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const next = zoneAt(
      hit,
      ((e.clientX - box.left) / box.width) * hit.w,
      ((e.clientY - box.top) / box.height) * hit.h,
    );
    if (next !== zone) {
      setZone(next);
      setHoverZone(next);
    }
  };

  return (
    <div className={`${styles.canvas} ${showGrid ? styles.grid : ''}`}>
      <div className={styles.zoomWrap} style={{ transform: `scale(${zoom})` }}>
        <svg
          className={styles.svg}
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
          aria-label="Ladder diagram"
        >
          {layout.plates.map((p, i) => (
            <rect
              key={`p${i}`}
              x={p.x}
              y={p.y}
              width={p.w}
              height={p.h}
              fill={p.fill}
              stroke={p.stroke}
              strokeDasharray={p.dash}
            />
          ))}

          {layout.wires.map((w, i) => (
            <line
              key={`w${i}`}
              x1={w.x1}
              y1={w.y1}
              x2={w.x2}
              y2={w.y2}
              stroke={w.stroke}
              strokeWidth={w.sw}
              strokeLinecap="square"
            />
          ))}

          {layout.dots.map((d, i) => (
            <circle key={`d${i}`} cx={d.cx} cy={d.cy} r={3.2} fill={d.fill} />
          ))}

          {layout.glyphs.map((g, i) => (
            <path
              key={`g${i}`}
              d={g.d}
              fill="none"
              stroke={g.stroke}
              strokeWidth={g.sw}
              strokeLinecap="round"
            />
          ))}

          {layout.labels.map((l, i) => (
            <text
              key={`l${i}`}
              x={l.x}
              y={l.y}
              fill={l.fill}
              fontSize={l.fs}
              fontWeight={l.fw}
              fontStyle={l.italic ? 'italic' : undefined}
              textAnchor={l.anchor}
              fontFamily={l.mono ? 'var(--font-mono)' : 'var(--font-ui)'}
            >
              {l.text}
            </text>
          ))}

          {/* Selection ring with corner handles, drawn above the line work. */}
          {layout.selectionRing && (
            <g className={styles.ring}>
              <rect
                x={layout.selectionRing.x}
                y={layout.selectionRing.y}
                width={layout.selectionRing.w}
                height={layout.selectionRing.h}
                fill="none"
                stroke="var(--acc)"
                strokeWidth={1.2}
                strokeDasharray="3 2"
              />
              {[
                [layout.selectionRing.x, layout.selectionRing.y],
                [layout.selectionRing.x + layout.selectionRing.w, layout.selectionRing.y],
                [layout.selectionRing.x, layout.selectionRing.y + layout.selectionRing.h],
                [
                  layout.selectionRing.x + layout.selectionRing.w,
                  layout.selectionRing.y + layout.selectionRing.h,
                ],
              ].map(([hx, hy], i) => (
                <rect key={i} x={hx - 2.5} y={hy - 2.5} width={5} height={5} fill="var(--acc)" />
              ))}
            </g>
          )}

          {layout.caret && (
            <line
              className={styles.caret}
              x1={layout.caret.x}
              y1={layout.caret.y1}
              x2={layout.caret.x}
              y2={layout.caret.y2}
              stroke="var(--acc)"
              strokeWidth={1.6}
            />
          )}

          {/* Insert-network affordance at the foot of the canvas. */}
          <rect
            x={layout.insertButton.x}
            y={layout.insertButton.y}
            width={layout.insertButton.w}
            height={layout.insertButton.h}
            fill="var(--accs)"
            stroke="var(--acc)"
            className={styles.insertBtn}
            onClick={addNetwork}
          />

          {/* Hit layer last so it sits above everything and takes the clicks. */}
          {layout.hits.map((hit) => {
            const hovered = hoverKey === hit.key;
            // What this click would do, which is the pointer's position unless a
            // branch is armed from the toolbar — that overrides position.
            const willBranch = hit.branchable && (armed || (!!activeTool && zone === 'below'));
            const willInsert = hovered && !!activeTool && !willBranch && hit.insertable;

            return (
              <g key={hit.key}>
                <rect
                  x={hit.x}
                  y={hit.y}
                  width={hit.w}
                  height={hit.h}
                  fill={hovered ? 'var(--accs)' : 'transparent'}
                  stroke={hovered && (activeTool || armed) ? 'var(--acc)' : 'none'}
                  strokeDasharray="3 2"
                  className={`${styles.hit} ${hovered && willBranch ? styles.below : ''}`}
                  onMouseEnter={() => setHoverKey(hit.key)}
                  onMouseLeave={() => setHoverKey((k) => (k === hit.key ? null : k))}
                  onMouseMove={onHitMove(hit)}
                  onClick={() =>
                    cellClick(hit.n, hit.kind, hit.path ?? [])
                  }
                />
                {/* Pointing below an element attaches a new level under it. */}
                {hovered && willBranch && (
                  <path
                    d={`M${hit.x + hit.w / 2} ${hit.y + hit.h - 6}v10 M${hit.x + hit.w / 2 - 7} ${hit.y + hit.h + 4}l7 7 7-7`}
                    fill="none"
                    stroke="var(--acc)"
                    strokeWidth={1.6}
                  />
                )}
                {/* Pointing at either side inserts there, in series. */}
                {willInsert && (
                  <line
                    x1={zone === 'left' ? hit.x + 2 : hit.x + hit.w - 2}
                    y1={hit.y + 6}
                    x2={zone === 'left' ? hit.x + 2 : hit.x + hit.w - 2}
                    y2={hit.y + hit.h - 6}
                    stroke="var(--acc)"
                    strokeWidth={2}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
