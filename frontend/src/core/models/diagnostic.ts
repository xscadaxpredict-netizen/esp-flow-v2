/**
 * DIAGNOSTIC
 *
 * The shape defined by ADR-001. Structural diagnostics are computed here in the
 * browser; semantic ones arrive from the Python compiler over the WebSocket.
 * Both render through one path, and server diagnostics win where they overlap.
 *
 * See documentation/architecture/adr/ADR-001-compiler-boundary.md
 */

export type Severity = 'error' | 'warning' | 'info';

/** Which runtime produced this diagnostic. Each code has exactly one owner. */
export type DiagnosticOrigin = 'browser' | 'server';

export interface DiagnosticLocation {
  pouId?: string;
  networkId?: string;
  /** Network index as displayed to the user, 1-based. */
  network?: number;
  /** Path to the offending node within the network body. */
  path?: number[];
  symbol?: string;
  /** Structured Text only. */
  line?: number;
  column?: number;
}

export interface Diagnostic {
  /** Registry code, e.g. STR-0101 or SEM-0311. */
  code: string;
  severity: Severity;
  message: string;
  origin: DiagnosticOrigin;
  location: DiagnosticLocation;
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
};
