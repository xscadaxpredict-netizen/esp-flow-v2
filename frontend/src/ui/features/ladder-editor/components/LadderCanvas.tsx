import { useEffect, useMemo, useState } from 'react';
import type { Zone } from '../../../../core/ladder/legality';
import { elementShape, layoutLadder, zoneAt, type Hit } from '../../../../core/ladder/layout';
import { accepts, answerFor, ghostAt, previewLegality } from '../../../../core/ladder/preview';
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
  const setStatus = useUIStore((s) => s.setStatus);

  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [zone, setZone] = useState<Zone>('right');

  const online = mode === 'online';
  const layout = useMemo(
    () => layoutLadder({ networks, values, online, selection, showComments }),
    [networks, values, online, selection, showComments],
  );

  const armed = !!branchArm;

  /*
   * PLACEMENT PREVIEW.
   *
   * What the armed element is, and whether position or the branch command
   * decides its shape. Nothing is armed in online mode, because nothing can be
   * edited there.
   */
  const previewType = online ? null : (activeTool ?? branchArm?.type ?? null);
  const previewMode = activeTool ? 'tool' : 'branch';

  // Rebuilt when the tool or the ladder changes — never on a pointer move, which
  // only looks this table up. Keeping it apart from the layout memo is what
  // stops hovering from re-laying out the whole ladder.
  const preview = useMemo(
    () => (previewType ? previewLegality(networks, layout.hits, previewType, previewMode) : null),
    [networks, layout.hits, previewType, previewMode],
  );

  const hoveredHit = hoverKey ? layout.hits.find((h) => h.key === hoverKey) : undefined;
  const hoverAnswer = preview && hoveredHit ? answerFor(preview, hoveredHit, zone) : null;
  const refusal = hoverAnswer && !hoverAnswer.ok ? hoverAnswer.reason : null;

  // Pointing at a position that would refuse says why, before the click. An
  // allowed position leaves the status bar alone, so the last result survives
  // ordinary movement.
  useEffect(() => {
    if (refusal && useUIStore.getState().statusMsg !== refusal) setStatus(refusal);
  }, [refusal, setStatus]);

  // The ghost: the armed element, drawn faintly where it will go.
  const ghost =
    previewType && hoveredHit && hoverAnswer?.ok
      ? (() => {
          const at = ghostAt(hoveredHit, previewMode === 'branch' ? 'below' : zone, previewType);
          return { ...at, shape: elementShape(previewType, at.cx, at.cy) };
        })()
      : null;

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

            // Preview: does this position take the armed element at all, and is
            // the exact way it is being pointed at refused?
            const open = accepts(preview?.[hit.key]);
            const refusedHere = hovered && !!refusal;
            const cue = refusedHere ? 'var(--tx3)' : 'var(--acc)';

            const stroke = hovered && (activeTool || armed) ? cue : open ? 'var(--acc)' : 'none';
            const cursor = refusedHere ? styles.refused : hovered && willBranch ? styles.below : '';

            return (
              <g key={hit.key}>
                <rect
                  x={hit.x}
                  y={hit.y}
                  width={hit.w}
                  height={hit.h}
                  fill={hovered && !refusedHere ? 'var(--accs)' : 'transparent'}
                  stroke={stroke}
                  // 0.75 keeps an accepting outline at 3:1 against the canvas in both
                  // themes. At 0.45 it read about 2:1 and vanished into the grid lines.
                  strokeOpacity={hovered ? 1 : 0.75}
                  strokeDasharray="3 2"
                  className={`${styles.hit} ${cursor}`}
                  data-accepts={preview ? String(open) : undefined}
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
                    stroke={cue}
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
                    stroke={cue}
                    strokeWidth={2}
                  />
                )}
              </g>
            );
          })}

          {/* The ghost sits above the hit layer but never takes the click. */}
          {ghost && (
            <g className={styles.ghost} data-ghost aria-hidden="true">
              {ghost.shape.paths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke="var(--acc)"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              ))}
              {ghost.shape.letter && (
                <text
                  x={ghost.cx}
                  y={ghost.cy + 4}
                  fill="var(--acc)"
                  fontSize={11}
                  fontWeight="600"
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                >
                  {ghost.shape.letter}
                </text>
              )}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
