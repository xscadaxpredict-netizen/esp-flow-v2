import { BUILD_LOG, BUILD_STAGES, SEED_XREF, XREF_SUBJECT } from '../../../../core/data/seed';
import { SEVERITY_LABEL, type Severity } from '../../../../core/models/diagnostic';
import {
  matchesFilters,
  useCompileStore,
  type BottomTab,
  type SeverityFilter,
  type SourceFilter,
} from '../../../../services/store/useCompileStore';
import { useUIStore } from '../../../../services/store/useUIStore';
import { Icon, type IconName } from '../../../shared/icons/Icon';
import styles from './MessagePanel.module.css';

const SEV_ICON: Record<Severity, IconName> = { error: 'err', warning: 'warn', info: 'info' };
const SEV_CLASS: Record<Severity, string> = {
  error: styles.sevError,
  warning: styles.sevWarning,
  info: styles.sevInfo,
};

const SEV_FILTERS: SeverityFilter[] = ['All', 'Errors', 'Warnings', 'Info'];
const SRC_FILTERS: SourceFilter[] = ['All', 'Editor', 'Compiler'];

const mmss = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/** Log lines colour themselves from their content, so a warning stands out. */
const logClass = (text: string) =>
  /warning/i.test(text) ? styles.logWarn : /finished|ready/.test(text) ? styles.logOk : styles.logLine;

/* ────────────────────────────────────────────────────────────────
   Compile — a two-column split: staged progress beside the log
   ──────────────────────────────────────────────────────────────── */

function CompileTab() {
  const { building, stage, elapsed, logN, startBuild, stopBuild } = useCompileStore();

  const done = !building && stage >= BUILD_STAGES.length - 1;
  const pct = building ? Math.min(96, (elapsed / 30) * 100) : done ? 100 : 0;
  const title = building ? BUILD_STAGES[stage].label : done ? 'Ready to flash' : 'Idle';
  const step = building ? `step ${stage + 1} of ${BUILD_STAGES.length}` : done ? '5 of 5' : '';
  const visible = BUILD_LOG.slice(0, logN);
  const tail = building ? BUILD_LOG[Math.min(BUILD_LOG.length - 1, logN)][1] : '';

  return (
    <div className={styles.compile}>
      <div className={styles.progressCol}>
        <div className={styles.progressHead}>
          <span className={styles.stageTitle}>{title}</span>
          <span className={styles.stageStep}>{step}</span>
          <span className={styles.spacer} />
          <span className={styles.elapsed}>{mmss(elapsed)}</span>
        </div>

        <div className={styles.track}>
          <div
            className={building ? styles.fill : `${styles.fill} ${styles.fillDone}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className={styles.stages}>
          {BUILD_STAGES.map((s, i) => {
            const complete = i < stage || done;
            const active = building && i === stage;
            return (
              <div
                key={s.label}
                className={`${styles.stage} ${active ? styles.stageActive : complete ? styles.stageDone : ''}`}
              >
                <span className={styles.stageIcon}>
                  <Icon name={complete ? 'tickc' : active ? 'spin' : 'dot'} size={11} strokeWidth={1.6} />
                </span>
                <span className={styles.stageLabel}>{s.label}</span>
                <span className={styles.stageTime}>{complete ? s.t : active ? 'running' : ''}</span>
              </div>
            );
          })}
        </div>

        <span className={styles.spacer} />

        <div className={styles.buildRow}>
          <button type="button" className={styles.buildBtn} onClick={startBuild} disabled={building}>
            {building ? 'Building…' : 'Compile (F11)'}
          </button>
          <button type="button" className={styles.cancelBtn} onClick={stopBuild} disabled={!building}>
            Cancel
          </button>
        </div>
      </div>

      <div className={styles.log}>
        {visible.map(([stg, line], i) => (
          <div key={i} className={logClass(line)}>
            <span className={styles.logTime}>{`00:${String(stg * 6 + (i % 10)).padStart(2, '0')}`}</span>
            <span>{line}</span>
          </div>
        ))}
        {building && (
          <div className={styles.logLine}>
            <span className={styles.logTime}>{mmss(elapsed)}</span>
            <span className={styles.spinner} />
            <span>{tail}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Problems — Severity | Code | Message | Location
   ──────────────────────────────────────────────────────────────── */

function ProblemsTab() {
  const { problems, sevFilter, srcFilter, setSevFilter, setSrcFilter, hoveredProblem, setHoveredProblem } =
    useCompileStore();
  const setStatus = useUIStore((s) => s.setStatus);

  const shown = problems.filter((p) => matchesFilters(p, sevFilter, srcFilter));

  return (
    <div className={styles.tabBody}>
      <div className={styles.filters}>
        <span className={styles.filterLabel}>Severity</span>
        {SEV_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={f === sevFilter ? `${styles.chip} ${styles.chipOn}` : styles.chip}
            onClick={() => setSevFilter(f)}
          >
            {f}
          </button>
        ))}

        <span className={styles.filterDivider} />

        <span className={styles.filterLabel}>Source</span>
        {SRC_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={f === srcFilter ? `${styles.chip} ${styles.chipOn}` : styles.chip}
            onClick={() => setSrcFilter(f)}
          >
            {f}
          </button>
        ))}

        <span className={styles.spacer} />
        <span className={styles.count}>
          {shown.length} of {problems.length} shown
        </span>
      </div>

      <div className={`${styles.probHead} ${styles.probGrid}`}>
        <div className={styles.hCell}>Severity</div>
        <div className={styles.hCell}>Code</div>
        <div className={styles.hCell}>Message</div>
        <div className={styles.hCellLast}>Location</div>
      </div>

      <div className={styles.rows}>
        {shown.map((p, i) => (
          <div
            key={`${p.code}-${i}`}
            className={`${styles.probRow} ${styles.probGrid} ${hoveredProblem === i ? styles.rowHover : ''}`}
            onMouseEnter={() => setHoveredProblem(i)}
            onMouseLeave={() => setHoveredProblem(-1)}
            onClick={() => setStatus(`${p.code} — ${p.message}`)}
          >
            <div className={`${styles.cell} ${SEV_CLASS[p.severity]}`}>
              <Icon name={SEV_ICON[p.severity]} size={11} strokeWidth={1.5} />
              <span className={styles.sevLabel}>{SEVERITY_LABEL[p.severity]}</span>
            </div>
            <div className={`${styles.cell} ${styles.mono}`}>{p.code}</div>
            <div className={`${styles.cell} ${styles.ellipsis}`}>{p.message}</div>
            <div className={`${styles.cell} ${styles.mono}`}>
              <span>
                {p.location.pouId ?? 'Prog0'} : Network {p.location.network ?? '—'}
              </span>
              {/* The jump chevron appears only on the hovered row. */}
              <svg
                className={styles.jump}
                width="10"
                height="10"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                opacity={hoveredProblem === i ? 1 : 0}
              >
                <path d="M6 4l5 4-5 4" />
              </svg>
            </div>
          </div>
        ))}
        {shown.length === 0 && <div className={styles.none}>Nothing matches these filters.</div>}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Search Results — Symbol | Access | Element | Location
   ──────────────────────────────────────────────────────────────── */

function SearchTab() {
  return (
    <div className={styles.tabBody}>
      <div className={styles.xrefHead}>
        <span>Cross reference</span>
        <span className={styles.xrefSym}>{XREF_SUBJECT.sym}</span>
        <span className={styles.xrefMeta}>
          {XREF_SUBJECT.addr} · {XREF_SUBJECT.type} · {SEED_XREF.length} references
        </span>
      </div>

      <div className={`${styles.probHead} ${styles.xrefGrid}`}>
        <div className={styles.hCell}>Symbol</div>
        <div className={styles.hCell}>Access</div>
        <div className={styles.hCell}>Element</div>
        <div className={styles.hCellLast}>Location</div>
      </div>

      <div className={styles.rows}>
        {SEED_XREF.map((x, i) => (
          <div
            key={i}
            className={`${styles.xrefRow} ${styles.xrefGrid} ${i % 2 ? styles.zebra : ''}`}
          >
            <div className={`${styles.cell} ${styles.monoSym}`}>{x.sym}</div>
            <div className={styles.cell}>
              <span className={x.access === 'W' ? styles.accessW : styles.accessR}>{x.access}</span>
            </div>
            <div className={`${styles.cell} ${styles.ellipsis}`}>{x.element}</div>
            <div className={`${styles.cell} ${styles.mono}`}>{x.loc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Shell
   ──────────────────────────────────────────────────────────────── */

export function MessagePanel() {
  const { bottomTab, setBottomTab, problems, building } = useCompileStore();
  const toggle = useUIStore((s) => s.toggle);

  const errors = problems.filter((p) => p.severity === 'error').length;
  const warnings = problems.filter((p) => p.severity === 'warning').length;

  const tabs: { id: BottomTab; label: string; badge: string }[] = [
    { id: 'compile', label: 'Compile', badge: '' },
    { id: 'problems', label: 'Problems', badge: `${errors} · ${warnings}` },
    { id: 'xref', label: 'Search Results', badge: String(SEED_XREF.length) },
  ];

  const summary = building ? 'building firmware…' : '0 errors · 1 warning · 248 KB';

  return (
    <div className={styles.panel}>
      <div className={styles.tabs} role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === bottomTab ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => setBottomTab(t.id)}
            role="tab"
            aria-selected={t.id === bottomTab}
          >
            <span>{t.label}</span>
            {t.badge && (
              <span className={t.id === 'problems' ? styles.badgeProblems : styles.badge}>{t.badge}</span>
            )}
          </button>
        ))}

        <span className={styles.spacer} />

        <div className={styles.tabsRight}>
          <span className={styles.summary}>{summary}</span>
          <button
            type="button"
            className={styles.hide}
            onClick={() => toggle('bottomHidden')}
            title="Hide panel"
            aria-label="Hide message panel"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      </div>

      {bottomTab === 'compile' && <CompileTab />}
      {bottomTab === 'problems' && <ProblemsTab />}
      {bottomTab === 'xref' && <SearchTab />}
    </div>
  );
}

/**
 * The collapsed rail. Hiding the panel must leave a way back that does not
 * require finding a menu item — this strip carries the error counts and
 * restores the panel on click.
 */
export function MessagePanelCollapsed() {
  const toggle = useUIStore((s) => s.toggle);
  const problems = useCompileStore((s) => s.problems);
  const errors = problems.filter((p) => p.severity === 'error').length;
  const warnings = problems.filter((p) => p.severity === 'warning').length;

  return (
    <button type="button" className={styles.collapsed} onClick={() => toggle('bottomHidden')}>
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 10l4-4 4 4" />
      </svg>
      <span>Compile · Problems · Search Results</span>
      <span className={styles.sevError}>
        {errors} error{errors === 1 ? '' : 's'}
      </span>
      <span className={styles.sevWarning}>
        {warnings} warning{warnings === 1 ? '' : 's'}
      </span>
      <span className={styles.spacer} />
      <span>show panel</span>
    </button>
  );
}
