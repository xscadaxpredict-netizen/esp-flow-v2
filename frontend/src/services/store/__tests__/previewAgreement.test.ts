import { beforeEach, describe, expect, it } from 'vitest';
import { el, par, ser } from '../../../core/ladder/builders';
import { layoutLadder, type Hit } from '../../../core/ladder/layout';
import type { Zone } from '../../../core/ladder/legality';
import { answerFor, previewLegality } from '../../../core/ladder/preview';
import type { ElementType, SeriesNode } from '../../../core/models/ladderNode';
import type { Network } from '../../../core/models/network';
import { useLadderStore } from '../useLadderStore';
import { useUIStore } from '../useUIStore';

/**
 * THE PREVIEW NEVER LIES.
 *
 * The canvas outlines the positions that will accept the armed element. If one
 * of those outlines leads to a refusal, or a position left dark would in fact
 * have taken the element, the preview is worse than having none.
 *
 * So this goes through every hit of a real layout, every zone the pointer can
 * produce on it, and clicks it for real through the store — then compares what
 * happened with what the preview said would happen. Same yes or no, and when it
 * is no, the same sentence.
 */

const TREES: { name: string; body: () => SeriesNode }[] = [
  { name: 'an empty rung', body: () => ser() },
  { name: 'a rung with no output', body: () => ser(el('no', 'A'), el('nc', 'B')) },
  { name: 'a finished rung', body: () => ser(el('no', 'A'), el('coil', 'M')) },
  {
    name: 'the seal-in latch',
    body: () =>
      ser(par(ser(el('no', 'Start')), ser(el('no', 'Motor'))), el('nc', 'Stop'), el('coil', 'Motor')),
  },
  {
    name: 'a bare parallel with no output',
    body: () => ser(par(ser(el('no', 'A')), ser(el('no', 'B')))),
  },
  {
    name: 'an output block with legs of different lengths',
    body: () =>
      ser(
        el('no', 'Run'),
        par(ser(el('no', 'Level'), el('coil', 'Fill')), ser(el('coil', 'Cycle'))),
      ),
  },
  {
    name: 'a function block in the line',
    body: () =>
      ser(el('no', 'A'), el('fb', 'T1', '', { fb: 'TON', pt: 'T#5s', span: 2 }), el('set', 'Q')),
  },
];

const TYPES: ElementType[] = ['no', 'nc', 'coil', 'set', 'fb'];

/** Every zone the pointer can actually produce on this hit — see zoneAt. */
const zonesOf = (hit: Hit): Zone[] =>
  hit.kind === 'slot' ? ['right'] : hit.branchable ? ['left', 'right', 'below'] : ['left', 'right'];

const store = () => useLadderStore.getState();

const reset = (networks: Network[]) =>
  useLadderStore.setState({
    networks,
    selection: null,
    past: [],
    future: [],
    activeTool: null,
    branchArm: null,
    hoverZone: 'right',
  });

const networksOf = (body: SeriesNode): Network[] => [{ id: 'net1', comment: '', body }];

beforeEach(() => reset(networksOf(ser())));

describe.each(TREES)('on $name', ({ body }) => {
  it.each(TYPES)('the preview matches a real click for every position, with %s armed', (type) => {
    const networks = networksOf(body());
    const { hits } = layoutLadder({ networks, values: {}, online: false, selection: null });
    const table = previewLegality(networks, hits, type);

    let checked = 0;
    for (const hit of hits) {
      for (const zone of zonesOf(hit)) {
        const said = answerFor(table, hit, zone);
        expect(said, `no answer for ${hit.key} ${zone}`).not.toBeNull();

        reset(networksOf(body()));
        useLadderStore.setState({ activeTool: type, hoverZone: zone });
        store().cellClick(hit.n, hit.kind, hit.path ?? []);

        const changed = store().past.length === 1;
        expect(changed, `${type} at ${hit.key} ${zone}`).toBe(said!.ok);
        if (!said!.ok) expect(useUIStore.getState().statusMsg).toBe(said!.reason);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('matches for an armed branch too, whichever zone is pointed at', () => {
    for (const type of ['no', 'coil'] as ElementType[]) {
      const networks = networksOf(body());
      const { hits } = layoutLadder({ networks, values: {}, online: false, selection: null });
      const table = previewLegality(networks, hits, type, 'branch');

      for (const hit of hits) {
        for (const zone of zonesOf(hit)) {
          const said = answerFor(table, hit, zone);

          reset(networksOf(body()));
          useLadderStore.setState({ branchArm: { type }, hoverZone: zone });
          store().cellClick(hit.n, hit.kind, hit.path ?? []);

          const changed = store().past.length === 1;
          // A slot has no answer in branch mode, and the store refuses there.
          expect(changed, `branch ${type} at ${hit.key} ${zone}`).toBe(said?.ok ?? false);
          if (said && !said.ok) expect(useUIStore.getState().statusMsg).toBe(said.reason);
        }
      }
    }
  });
});

describe('the comparison has teeth', () => {
  it('sees both accepted and refused positions across these trees', () => {
    let yes = 0;
    let no = 0;
    for (const { body } of TREES) {
      const networks = networksOf(body());
      const { hits } = layoutLadder({ networks, values: {}, online: false, selection: null });
      for (const type of TYPES) {
        const table = previewLegality(networks, hits, type);
        for (const hit of hits) {
          for (const zone of zonesOf(hit)) {
            if (answerFor(table, hit, zone)?.ok) yes += 1;
            else no += 1;
          }
        }
      }
    }
    expect(yes).toBeGreaterThan(20);
    expect(no).toBeGreaterThan(20);
  });
});
