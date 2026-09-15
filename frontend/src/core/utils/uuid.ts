/**
 * Generates a prefixed unique identifier.
 * 
 * Uses crypto.randomUUID() (available in all modern browsers)
 * and takes only the first 8 characters for readability.
 * 
 * Examples:
 *   generateUid('net')  → "net_a3f1b2c8"
 *   generateUid('inst') → "inst_7d4e9f01"
 *   generateUid('coil') → "coil_b8c2a5d3"
 */
export function generateUid(prefix: string): string {
  const short = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  return `${prefix}_${short}`;
}