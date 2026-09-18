/**
 * FEATURE SWITCHES
 *
 * A switch hides a feature that exists in the model but is not ready to be
 * used. Hiding is deliberate, not deletion: the code, its rules and its tests
 * all stay, so the work resumes from where it stopped by flipping one value.
 */

/**
 * Function blocks — switched off 2026-09-18.
 *
 * The block the canvas can draw today is a hard-coded TON. It takes power into
 * its IN pin where ISPSoft uses En and Eno, overlaps the row below it inside a
 * branch, and has no pin list, no instance and no operands. ISPSoft's model —
 * any block drawn from its declared pins, with En and Eno carrying the rung — is
 * being designed first. Until it lands, the editor offers no way to create one.
 *
 * The element type, its layout, its legality and their tests are untouched.
 */
export const FUNCTION_BLOCKS_ENABLED = false;

/** What the editor says wherever a function block would have been offered. */
export const FUNCTION_BLOCKS_UNAVAILABLE =
  'Function blocks are being redesigned to follow ISPSoft — not available yet';
