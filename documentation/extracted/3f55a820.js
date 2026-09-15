/* ESP Flow — ladder rung editor. Columns are series positions (AND), rows are parallel branches (OR),
   the last column is the coil column pinned to the right power rail. */
const { useState, useCallback } = React;

const C = {
  ground: '#1d2d3d', rail: '#94bce3', wire: '#5c7f9f', cell: '#26394d',
  text: '#eef6ff', muted: '#9ebbd8', accent: '#94bce3', line: '#416180'
};
const KIND_COLOR = { contact: '#94bce3', coil: '#d6ebff', timer: '#bdd8f2', data: '#9ebbd8' };

let seq = 0;
const emptyRung = (n, cols) => ({
  id: 'N' + String(n * 10).padStart(3, '0'),
  label: '',
  rows: [Array(cols).fill(null)],
  coils: [null]
});

function Glyph({ cell, size = 26 }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} fill="none"
      stroke={KIND_COLOR[cell.kind] || C.accent} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      <path d={cell.d} />
    </svg>
  );
}

function Cell({ cell, selected, onDrop, onClick, coil, cellW, cellH }) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { setOver(false); onDrop(e); }}
      onClick={onClick}
      style={{
        position: 'relative', width: cellW, height: cellH, flex: 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: cell ? 'pointer' : 'copy',
        background: over ? 'rgba(148,188,227,.14)' : 'transparent',
        outline: selected ? '1px solid ' + C.accent : over ? '1px dashed ' + C.accent : '1px solid transparent',
        outlineOffset: -1
      }}>
      <span style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: C.wire }}></span>
      {cell ? (
        <span style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, background: C.ground, padding: '0 7px' }}>
          <span style={{ fontSize: 10, letterSpacing: '.04em', color: C.muted, fontFamily: 'ui-monospace,Menlo,monospace' }}>{cell.tag}</span>
          <Glyph cell={cell} size={coil ? 28 : 26} />
        </span>
      ) : null}
    </div>
  );
}

function Rung({ rung, index, cols, selected, onDropCell, onSelect, onBranch, onDelete, showComments, cellW, cellH }) {
  const railH = rung.rows.length * cellH;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 0 6px 2px' }}>
        <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11, color: C.accent, letterSpacing: '.06em' }}>{rung.id}</span>
        {showComments ? (
          <input
            value={rung.label} placeholder="rung comment"
            onChange={(e) => onSelect(null, { renameRung: index, value: e.target.value })}
            style={{
              flex: 1, background: 'transparent', border: 0, outline: 'none', padding: 0,
              color: C.muted, fontSize: 12, fontFamily: 'Barlow, system-ui, sans-serif'
            }} />
        ) : <span style={{ flex: 1 }}></span>}
        <button onClick={() => onBranch(index)} style={btnStyle}>+ branch</button>
        <button onClick={() => onDelete(index)} style={btnStyle}>delete</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <span style={{ width: 2, background: C.rail, height: railH, flex: 'none' }}></span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rung.rows.map((row, r) => (
            <div key={r} style={{ display: 'flex', height: cellH }}>
              {row.map((cell, c) => (
                <Cell key={c} cell={cell} cellW={cellW} cellH={cellH}
                  selected={selected && selected.rung === index && selected.row === r && selected.col === c}
                  onDrop={(e) => onDropCell(e, index, r, c, false)}
                  onClick={() => cell && onSelect({ rung: index, row: r, col: c, ...cell })} />
              ))}
              <span style={{ width: 22, flex: 'none', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: C.wire }}></span>
              </span>
              <Cell cell={rung.coils[r]} coil cellW={cellW} cellH={cellH}
                selected={selected && selected.rung === index && selected.row === r && selected.col === 'coil'}
                onDrop={(e) => onDropCell(e, index, r, null, true)}
                onClick={() => rung.coils[r] && onSelect({ rung: index, row: r, col: 'coil', ...rung.coils[r] })} />
            </div>
          ))}
        </div>
        <span style={{ width: 2, background: C.rail, height: railH, flex: 'none' }}></span>
      </div>
    </div>
  );
}

const btnStyle = {
  background: 'transparent', border: '1px solid ' + C.line, color: C.muted,
  font: 'inherit', fontSize: 11, padding: '2px 8px', cursor: 'pointer', borderRadius: 0, whiteSpace: 'nowrap'
};

function LadderCanvas({ onSelect, columns, showComments, compactRows }) {
  const cols = Math.max(4, Math.min(12, parseInt(columns, 10) || 7));
  const cellW = 88;
  const cellH = compactRows ? 48 : 60;
  const [rungs, setRungs] = useState(() => [emptyRung(0, cols)]);
  const [selected, setSelected] = useState(null);

  const select = useCallback((sel, cmd) => {
    if (cmd && cmd.renameRung !== undefined) {
      setRungs((rs) => rs.map((r, i) => (i === cmd.renameRung ? { ...r, label: cmd.value } : r)));
      return;
    }
    setSelected(sel);
    onSelect && onSelect(sel);
  }, [onSelect]);

  const onDropCell = useCallback((e, rungIdx, row, col, isCoil) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/espflow');
    if (!raw) return;
    const item = JSON.parse(raw);
    if (isCoil !== (item.kind === 'coil')) return; // coils only on the rail, logic only in the columns
    seq += 1;
    const cell = { ...item, tag: item.tagPrefix + String(seq), uid: 'c' + seq };
    setRungs((rs) => rs.map((r, i) => {
      if (i !== rungIdx) return r;
      if (isCoil) { const coils = r.coils.slice(); coils[row] = cell; return { ...r, coils }; }
      const rows = r.rows.map((rw, ri) => (ri === row ? rw.map((cv, ci) => (ci === col ? cell : cv)) : rw));
      return { ...r, rows };
    }));
    select({ rung: rungIdx, row, col: isCoil ? 'coil' : col, ...cell });
  }, [select]);

  const addBranch = (i) => setRungs((rs) => rs.map((r, ri) => (ri === i ? { ...r, rows: r.rows.concat([Array(cols).fill(null)]), coils: r.coils.concat([null]) } : r)));
  const delRung = (i) => setRungs((rs) => (rs.length === 1 ? [emptyRung(0, cols)] : rs.filter((_, ri) => ri !== i)));
  const addRung = () => setRungs((rs) => rs.concat([emptyRung(rs.length, cols)]));

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) select(null); }}
      style={{ width: '100%', height: '100%', overflow: 'auto', background: C.ground, padding: '28px 32px 60px', fontFamily: 'Barlow, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 30, width: 'fit-content' }}>
        {rungs.map((r, i) => (
          <Rung key={r.id + i} rung={r} index={i} cols={cols} selected={selected} cellW={cellW} cellH={cellH}
            showComments={showComments !== false}
            onDropCell={onDropCell} onSelect={select} onBranch={addBranch} onDelete={delRung} />
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={addRung} style={{ ...btnStyle, fontSize: 12, padding: '6px 14px', color: C.text, borderColor: C.rail }}>+ Add rung</button>
          <span style={{ fontSize: 11, color: C.muted }}>Series = AND · parallel branch = OR · coils sit on the right rail</span>
        </div>
      </div>
    </div>
  );
}

if (typeof module !== 'undefined') module.exports = { LadderCanvas };
window.LadderCanvas = LadderCanvas;
