import { useMemo, useState } from 'react';
import { isContact, type ContactType, type CoilType } from '../../../../core/models/ladderNode';
import { elementAt } from '../../../../core/ladder/path';
import { useLadderStore } from '../../../../services/store/useLadderStore';
import { useProjectStore } from '../../../../services/store/useProjectStore';
import { useUIStore } from '../../../../services/store/useUIStore';
import { Panel, PanelBody, PanelHeader } from '../../../shared/components/Panel';
import styles from './PropertiesPanel.module.css';

const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: 'no', label: 'Normally open' },
  { value: 'nc', label: 'Normally closed' },
  { value: 'p', label: 'Rising edge' },
  { value: 'n', label: 'Falling edge' },
];

const COIL_TYPES: { value: CoilType; label: string }[] = [
  { value: 'coil', label: 'Output' },
  { value: 'set', label: 'Set (latch)' },
  { value: 'reset', label: 'Reset (unlatch)' },
];

/**
 * Properties for the current selection.
 *
 * Address and Data Type are read-only mirrors of the symbol declaration — one
 * source of truth. Editing them here would let an element disagree with the
 * symbol table, which is exactly the class of bug the declaration prevents.
 */
export function PropertiesPanel() {
  const propsOpen = useUIStore((s) => s.propsOpen);
  const toggle = useUIStore((s) => s.toggle);
  const mode = useUIStore((s) => s.mode);
  const symbols = useProjectStore((s) => s.symbols);
  const { networks, selection, bindSymbol, setElementType } = useLadderStore();

  const [query, setQuery] = useState<string | null>(null);
  const [acOpen, setAcOpen] = useState(false);

  const element = useMemo(() => {
    if (!selection) return null;
    const net = networks[selection.n];
    if (!net) return null;
    if (!selection.path) return null;
    return elementAt(net.body, selection.path);
  }, [networks, selection]);

  const decl = element ? symbols.find((s) => s.name === element.sym) : undefined;
  const nameValue = query ?? element?.sym ?? '';

  const matches = useMemo(() => {
    const q = nameValue.toLowerCase();
    return symbols.filter((s) => !q || s.name.toLowerCase().includes(q)).slice(0, 8);
  }, [symbols, nameValue]);

  const readonly = mode === 'online';

  return (
    <Panel>
      <PanelHeader
        title="PROPERTIES"
        collapsed={!propsOpen}
        onToggle={() => toggle('propsOpen')}
        tag={element ? undefined : 'no selection'}
      />

      {propsOpen && (
        <PanelBody className={styles.body}>
          {!element ? (
            <p className={styles.empty}>Select an element on the canvas to edit its properties.</p>
          ) : (
            <>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="prop-symbol">
                  Symbol
                </label>
                <div className={styles.acWrap}>
                  <input
                    id="prop-symbol"
                    className={styles.input}
                    value={nameValue}
                    disabled={readonly}
                    placeholder="Pick a declared symbol"
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setAcOpen(true);
                    }}
                    onFocus={() => setAcOpen(true)}
                    onBlur={() => window.setTimeout(() => setAcOpen(false), 120)}
                  />
                  {acOpen && matches.length > 0 && (
                    <div className={styles.ac}>
                      {matches.map((m) => (
                        <button
                          key={m.name}
                          type="button"
                          className={styles.acRow}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            bindSymbol(m.name, m.addr);
                            setQuery(null);
                            setAcOpen(false);
                          }}
                        >
                          <span className={styles.acName}>{m.name}</span>
                          <span className={styles.acAddr}>{m.addr || '—'}</span>
                          <span className={styles.acType}>{m.type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Address</span>
                <output className={styles.readonly}>{decl?.addr || element.addr || '—'}</output>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Data Type</span>
                <output className={styles.readonly}>{decl?.type || (element.type === 'fb' ? element.fb : 'BOOL')}</output>
              </div>

              <p className={styles.note}>Address and data type follow the symbol declaration.</p>

              {element.type !== 'fb' && (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="prop-type">
                    {isContact(element.type) ? 'Contact Type' : 'Coil Mode'}
                  </label>
                  <select
                    id="prop-type"
                    className={styles.input}
                    value={element.type}
                    disabled={readonly}
                    onChange={(e) => setElementType(e.target.value as ContactType | CoilType)}
                  >
                    {(isContact(element.type) ? CONTACT_TYPES : COIL_TYPES).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {element.type === 'fb' && (
                <>
                  <div className={styles.field}>
                    <span className={styles.label}>Block Type</span>
                    <output className={styles.readonly}>{element.fb ?? 'TON'}</output>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.label}>Preset (PT)</span>
                    <output className={styles.readonly}>{element.pt ?? '—'}</output>
                  </div>
                  <p className={styles.note}>
                    This instance is a variable in the symbol table — change its type there.
                  </p>
                </>
              )}

              <div className={styles.field}>
                <span className={styles.label}>Comment</span>
                <output className={styles.readonly}>{decl?.cmt || '—'}</output>
              </div>

              {readonly && <p className={styles.note}>Editing is disabled in online monitor mode.</p>}
            </>
          )}
        </PanelBody>
      )}
    </Panel>
  );
}
