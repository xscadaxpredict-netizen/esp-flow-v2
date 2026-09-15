import type { Diagnostic } from '../models/diagnostic';
import type { LadderNode, NodePath, SeriesNode } from '../models/ladderNode';
import { isCoil } from '../models/ladderNode';
import type { Network } from '../models/network';
import { STRUCTURAL } from '../diagnostics/codes';
import { terminates } from '../ladder/shape';

/**
 * STRUCTURAL RULES — the browser's entire share of validation.
 *
 * ADR-001 §4.1: these are answerable from the editor model alone, with no
 * knowledge of IEC semantics. Anything that needs to know what a type means or
 * what a symbol refers to belongs to the Python compiler and arrives over the
 * WebSocket. Do not add symbol resolution, type checking, or double-coil
 * detection here — those have `SEM-` codes and a different owner.
 */

const emit = (code: keyof typeof STRUCTURAL, network: number, path?: NodePath): Diagnostic => {
  const def = STRUCTURAL[code];
  return {
    code: def.code,
    severity: def.severity,
    message: def.message,
    origin: 'browser',
    location: { network, path },
  };
};

/** Walk every node in a network body, reporting its path. */
const walk = (node: LadderNode, path: NodePath, visit: (n: LadderNode, p: NodePath) => void) => {
  visit(node, path);
  if (node.t === 'el') return;
  node.kids.forEach((kid, i) => walk(kid, path.concat(i), visit));
};

export function checkNetwork(net: Network, index: number): Diagnostic[] {
  const out: Diagnostic[] = [];
  const body: SeriesNode = net.body;
  const n = index + 1;

  if (body.kids.length === 0) {
    out.push(emit('STR-0110', n));
    return out;
  }

  let sawCoil = false;

  walk(body, [], (node, path) => {
    if (node.t === 'el') {
      if (isCoil(node.type)) {
        sawCoil = true;
        if (!node.sym) out.push(emit('STR-0102', n, path));
      } else if (node.type !== 'fb' && !node.sym) {
        out.push(emit('STR-0101', n, path));
      }
      return;
    }

    if (node.t === 'ser') {
      // Rule 6: nothing may follow an output.
      node.kids.slice(0, -1).forEach((kid, i) => {
        if (terminates(kid)) out.push(emit('STR-0103', n, path.concat(i)));
      });
      return;
    }

    // Rule 7: a block may not mix legs that terminate with legs that rejoin.
    if (node.kids.some(terminates) && !node.kids.every(terminates)) {
      out.push(emit('STR-0104', n, path));
    }
  });

  if (!sawCoil) out.push(emit('STR-0111', n));

  return out;
}

export const checkProgram = (networks: Network[]): Diagnostic[] =>
  networks.flatMap((net, i) => checkNetwork(net, i));
