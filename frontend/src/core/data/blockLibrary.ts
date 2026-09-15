/**
 * THE BLOCK CATALOGUE
 *
 * Three groups, as designed. The standard library is the IEC 61131-3 set every
 * conforming system provides; the ESP-Flow library is what a microcontroller
 * target adds and a conventional PLC has no equivalent for; the user library is
 * function blocks declared in this project.
 */

export type LibraryGroupId = 'std' | 'esp' | 'user';

export interface LibraryItem {
  label: string;
  /** Contents summary for the standard groups, or 'FB' for a single block. */
  tag: string;
}

export interface LibraryGroup {
  id: LibraryGroupId;
  label: string;
  items: LibraryItem[];
}

const group = (id: LibraryGroupId, label: string, items: [string, string][]): LibraryGroup => ({
  id,
  label,
  items: items.map(([l, tag]) => ({ label: l, tag })),
});

export const LIBRARY: LibraryGroup[] = [
  group('std', 'Standard Library', [
    ['Timers', 'TON, TOF, TP'],
    ['Counters', 'CTU, CTD, CTUD'],
    ['Edge Detection', 'R_TRIG, F_TRIG'],
    ['Bistables', 'SR, RS'],
    ['Math', 'ADD, SUB, MUL, DIV'],
    ['Comparison', 'GT, GE, EQ, LE, LT'],
    ['Bit Operations', 'AND, OR, XOR, SHL'],
    ['Conversion', 'INT_TO_REAL, …'],
  ]),
  group('esp', 'ESP-Flow Library', [
    ['WiFi', 'FB'],
    ['MQTT Publish', 'FB'],
    ['MQTT Subscribe', 'FB'],
    ['Analog Read', 'FB'],
    ['PWM Output', 'FB'],
    ['I2C Read', 'FB'],
    ['NTP Time', 'FB'],
  ]),
  group('user', 'User Library', [
    ['MotorStarter', 'FB'],
    ['TankFill', 'FB'],
  ]),
];
