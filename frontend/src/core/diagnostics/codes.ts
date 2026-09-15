/**
 * DIAGNOSTIC CODE REGISTRY — frontend view.
 *
 * ADR-001 makes one registry the authority, owned by the Python backend at
 * `backend/compiler/diagnostics/registry.yaml`, with each code naming the runtime
 * allowed to emit it. This file is the generated view of that registry; until the
 * backend exists it is maintained by hand and holds only browser-owned codes.
 *
 * A `SEM-`, `TYP-`, `CFG-` or `GEN-` code must never be emitted from TypeScript.
 * CI enforces that once the registry lands.
 */

import type { DiagnosticOrigin, Severity } from '../models/diagnostic';

export interface DiagnosticDef {
  code: string;
  owner: DiagnosticOrigin;
  severity: Severity;
  /** Template; `{name}` placeholders are filled at emit time. */
  message: string;
}

export const STRUCTURAL: Record<string, DiagnosticDef> = {
  'STR-0101': {
    code: 'STR-0101',
    owner: 'browser',
    severity: 'warning',
    message: 'Contact has no operand assigned.',
  },
  'STR-0102': {
    code: 'STR-0102',
    owner: 'browser',
    severity: 'warning',
    message: 'Coil has no operand assigned.',
  },
  'STR-0103': {
    code: 'STR-0103',
    owner: 'browser',
    severity: 'error',
    message: 'An output must be the last element on its line.',
  },
  'STR-0104': {
    code: 'STR-0104',
    owner: 'browser',
    severity: 'error',
    message: 'Every branch of an output block must end in an output.',
  },
  'STR-0110': {
    code: 'STR-0110',
    owner: 'browser',
    severity: 'info',
    message: 'Network is empty.',
  },
  'STR-0111': {
    code: 'STR-0111',
    owner: 'browser',
    severity: 'warning',
    message: 'Network has logic but no output.',
  },
};

export const format = (template: string, vars: Record<string, string> = {}) =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);
