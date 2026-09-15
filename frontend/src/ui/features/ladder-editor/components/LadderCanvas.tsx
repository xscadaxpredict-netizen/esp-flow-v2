import { useMemo, useState } from 'react';
import { layoutLadder, type Hit } from '../../../../core/ladder/layout';
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
  const { networks, selection, values, branchArm, activeTool, cellClick, setHoverSide, addNetwork } =
    useLadderStore();
  const mode = useUIStore((s) => s.mode);
  const showGrid = useUIStore((s) => s.showGrid);
  const showComments = useUIStore((s) => s.showComments);
  const zoom = useUIStore((s) => s.zoom);

  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [hoverSideLocal, setHoverSideLocal] = useState<'left' | 'right'>('right');

  const online = mode === 'online';
  const layout = useMemo(
    () => layoutLadder({ networks, values, online, selection, showComments }),
    [networks, values, online, selection, showComments],
  );

  const armed = !!branchArm;

  const onHitMove = (hit: Hit) => (e: React.MouseEvent) => {
    if (!hit.insertable) return;
    const box = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const side = e.clientX - box.left < box.width / 2 ? 'left' : 'right';
    if (side !== hoverSideLocal) {
      setHoverSideLocal(side);
      setHoverSide(side);
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
            return (
              <g key={hit.key}>
                <rect
                  x={hit.x}
                  y={hit.y}
                  width={hit.w}
                  height={hit.h}
                  fill={hovered ? (armed && hit.branchable ? 'var(--accs)' : 'var(--accs)') : 'transparent'}
                  stroke={hovered && (activeTool || armed) ? 'var(--acc)' : 'none'}
                  strokeDasharray="3 2"
                  className={styles.hit}
                  onMouseEnter={() => setHoverKey(hit.key)}
                  onMouseLeave={() => setHoverKey((k) => (k === hit.key ? null : k))}
                  onMouseMove={onHitMove(hit)}
                  onClick={() =>
                    cellClick(hit.n, hit.kind, hit.path ?? [])
                  }
                />
                {/* When a branch is armed, show where the new level will attach. */}
                {hovered && armed && hit.branchable && (
                  <path
                    d={`M${hit.x + hit.w / 2} ${hit.y + hit.h - 6}v10 M${hit.x + hit.w / 2 - 7} ${hit.y + hit.h + 4}l7 7 7-7`}
                    fill="none"
                    stroke="var(--acc)"
                    strokeWidth={1.6}
                  />
                )}
                {/* When a tool is armed, show which side the element will land on. */}
                {hovered && !!activeTool && hit.insertable && (
                  <line
                    x1={hoverSideLocal === 'left' ? hit.x + 2 : hit.x + hit.w - 2}
                    y1={hit.y + 6}
                    x2={hoverSideLocal === 'left' ? hit.x + 2 : hit.x + hit.w - 2}
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
