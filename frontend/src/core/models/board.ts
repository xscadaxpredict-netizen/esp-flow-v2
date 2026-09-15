/**
 * BOARD PROFILE
 *
 * Which pins a target exposes and which direction they can take. Per ADR-001
 * this is *data*, published by the backend rather than encoded as a rule in
 * TypeScript — the browser applies the profile, it does not know the rule.
 * Until the Django backend exists these profiles are seeded locally.
 */

export type PinDirection = 'input' | 'output' | 'both' | 'reserved';

export interface PinDef {
  gpio: number;
  direction: PinDirection;
  /** Why a pin is unavailable, e.g. 'strapping pin', 'flash'. */
  note?: string;
}

export interface BoardProfile {
  id: string;
  label: string;
  pins: PinDef[];
}

/** One row of the hardware configuration table: a pin bound to an IEC address. */
export interface PinAssignment {
  gpio: number;
  direction: Exclude<PinDirection, 'reserved'>;
  /** IEC direct address, e.g. %IX0.0 */
  address: string;
  symbol: string;
  comment: string;
}

export const BOARD_IDS = ['ESP32', 'ESP32-S2', 'ESP32-S3', 'ESP32-C3', 'ESP32-C6'] as const;
export type BoardId = (typeof BOARD_IDS)[number];
