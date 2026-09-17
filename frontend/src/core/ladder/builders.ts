import type {
  ElementType,
  LadderElement,
  ParallelNode,
  SeriesChild,
  SeriesNode,
} from '../models/ladderNode';
import type { Network } from '../models/network';
import { generateUid } from '../utils';

/** Create an element leaf. */
export const el = (
  type: ElementType,
  sym = '',
  addr = '',
  extra: Partial<LadderElement> = {},
): LadderElement => ({ t: 'el', id: generateUid('el'), type, sym, addr, ...extra });

/** Create a series node — children evaluated left to right, AND. */
export const ser = (...kids: SeriesChild[]): SeriesNode => ({ t: 'ser', kids });

/** Create a parallel node — levels evaluated top to bottom, OR. */
export const par = (...levels: SeriesNode[]): ParallelNode => ({ t: 'par', kids: levels });

/**
 * A freshly placed element. Function blocks arrive as a TON instance because
 * that is the overwhelmingly common case; the type is changed in Properties.
 */
/** Cells a new element of this type occupies. A function block is two wide. */
export const spanOf = (type: ElementType): number => (type === 'fb' ? 2 : 1);

export const newElement = (type: ElementType, netIndex: number): LadderElement =>
  type === 'fb'
    ? el('fb', `Timer${netIndex + 1}`, '', { fb: 'TON', pt: 'T#5s', span: spanOf('fb') })
    : el(type);

/** An empty network, ready for its first element. */
export const newNetwork = (index: number): Network => ({
  id: generateUid('net'),
  comment: `// Network ${index + 1} — new network`,
  body: ser(),
});
