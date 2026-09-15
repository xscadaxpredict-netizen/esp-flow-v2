import type { Diagnostic } from '../models/diagnostic';
import type { Network } from '../models/network';
import type { SymbolDecl } from '../models/symbolDecl';
import type { ValueMap } from '../ladder/evaluate';
import { el, par, ser } from '../ladder/builders';
import { generateUid } from '../utils';

/**
 * SEED DATA
 *
 * A worked bottling-line example, carried over from the design prototype so the
 * editor opens onto real logic rather than a blank canvas.
 *
 * Everything here is a stand-in for something the toolchain will later provide:
 * symbols come from the project, values from the device over the WebSocket,
 * problems and the build log from the Python compiler. When the backend lands,
 * this file is deleted, not extended.
 */

const net = (comment: string, body: Network['body']): Network => ({
  id: generateUid('net'),
  comment,
  body,
});

export const SEED_NETWORKS: Network[] = [
  // Seal-in latch: Start energises the motor, the motor's own contact holds it.
  net(
    '// Network 1 — conveyor start / stop seal-in (latch)',
    ser(
      par(ser(el('no', 'StartButton', '%IX0.0')), ser(el('no', 'ConveyorMotor', '%QX0.1'))),
      el('nc', 'StopButton', '%IX0.1'),
      el('coil', 'ConveyorMotor', '%QX0.1'),
    ),
  ),
  net(
    '// Network 2 — 5 s dwell before drum release',
    ser(
      el('no', 'ConveyorMotor', '%QX0.1'),
      el('fb', 'DelayTimer', '', { fb: 'TON', pt: 'T#5s', span: 2 }),
      el('set', 'DrumRelease', '%QX0.2'),
    ),
  ),
  // Rule 7: one condition splits into two outputs with conditions of their own.
  net(
    '// Network 3 — one condition, two outputs with conditions of their own',
    ser(
      el('no', 'ConveyorMotor', '%QX0.1'),
      par(
        // Two legs of different lengths, so the outputs land in different
        // columns — rule 6, and the reason outputs left the aligned column.
        ser(
          el('no', 'LevelSwitch', '%IX0.5'),
          el('nc', 'StopButton', '%IX0.1'),
          el('coil', 'FillValve', '%QX0.3'),
        ),
        ser(el('p', 'ResetBtn', '%IX0.3', { forced: true }), el('reset', 'CycleRun', '%MX0.0')),
      ),
    ),
  ),
  net('// Network 4 — TODO interlock with upstream filler', ser(el('no', 'Motor2', '', { err: true }))),
];

export const SEED_SYMBOLS: SymbolDecl[] = (
  [
    ['VAR_INPUT', 'StartButton', '%IX0.0', 'BOOL', 'FALSE', 'Line start pushbutton (NO)'],
    ['VAR_INPUT', 'StopButton', '%IX0.1', 'BOOL', 'TRUE', 'E-stop line, fail-safe NC'],
    ['VAR_INPUT', 'ResetBtn', '%IX0.3', 'BOOL', 'FALSE', 'Operator reset pushbutton'],
    ['VAR_INPUT', 'LevelSwitch', '%IX0.5', 'BOOL', 'FALSE', 'Tank level float switch'],
    ['VAR_OUTPUT', 'ConveyorMotor', '%QX0.1', 'BOOL', 'FALSE', 'Main conveyor contactor'],
    ['VAR_OUTPUT', 'DrumRelease', '%QX0.2', 'BOOL', 'FALSE', 'Drum release solenoid'],
    ['VAR_OUTPUT', 'FillValve', '%QX0.3', 'BOOL', 'FALSE', 'Fill valve'],
    ['VAR', 'CycleRun', '%MX0.0', 'BOOL', 'FALSE', 'Cycle latch'],
    ['VAR', 'DelayTimer', '', 'TON', '', 'Dwell before drum release'],
    ['VAR', 'CycleCount', '', 'DINT', '0', 'Completed bottles this shift'],
    ['VAR', 'MotorCurrent', '%IW3', 'INT', '0', 'CT clamp, 0–10 V'],
  ] as const
).map(([cls, name, addr, type, init, cmt]) => ({
  cls: cls as SymbolDecl['cls'],
  name,
  addr,
  type,
  init,
  cmt,
}));

export const SYMBOLS_BY_NAME: Record<string, SymbolDecl> = Object.fromEntries(
  SEED_SYMBOLS.map((d) => [d.name, d]),
);

/** Live values as the device would report them during monitoring. */
export const SEED_VALUES: ValueMap = {
  StartButton: 1,
  StopButton: 0,
  ConveyorMotor: 1,
  DrumRelease: 0,
  ResetBtn: 0,
  LevelSwitch: 1,
  FillValve: 0,
  CycleRun: 0,
  Motor2: 0,
};

/**
 * Compiler diagnostics. Note the origin: these are `server` codes rendered as
 * data. Nothing in the browser computes them — see ADR-001.
 */
export const SEED_PROBLEMS: Diagnostic[] = [
  {
    code: 'SEM-0207',
    severity: 'error',
    message: "Symbol 'Motor2' is not declared in any accessible scope.",
    origin: 'server',
    location: { pouId: 'Prog0', network: 4, symbol: 'Motor2' },
  },
  {
    code: 'SEM-0311',
    severity: 'error',
    message: "Variable 'ConveyorMotor' is written by more than one coil.",
    origin: 'server',
    location: { pouId: 'Prog0', network: 7, symbol: 'ConveyorMotor' },
  },
  {
    code: 'STR-0101',
    severity: 'warning',
    message: 'Contact has no operand assigned.',
    origin: 'browser',
    location: { pouId: 'Prog0', network: 2 },
  },
];

export interface BuildStage {
  label: string;
  t: string;
}

/**
 * Transpiling to C++ and rebuilding firmware genuinely takes half a minute, so
 * the wait is staged and named rather than hidden behind a spinner.
 */
export const BUILD_STAGES: BuildStage[] = [
  { label: 'Validating', t: '1.4 s' },
  { label: 'Generating C++', t: '2.1 s' },
  { label: 'Compiling', t: '19.6 s' },
  { label: 'Linking', t: '5.2 s' },
  { label: 'Ready to flash', t: '' },
];

/** [stageIndex, line] — the log reveals progressively as stages complete. */
export const BUILD_LOG: [number, string][] = [
  [0, 'esp-flow 2.4.1  target ESP32-S3  toolchain xtensa-esp32s3 12.2'],
  [0, 'validate: BottlingLine_v3 / Prog0 — 4 networks, 12 elements'],
  [0, 'validate: 4 local symbols, 18 global symbols resolved'],
  [1, 'codegen: Prog0 -> build/prog0.cpp'],
  [1, 'codegen: MotorStarter -> build/fb_motorstarter.cpp'],
  [1, 'codegen: scan task CyclicTask_10ms, cycle 10 ms'],
  [1, 'codegen: 386 lines emitted, 0 unsupported constructs'],
  [2, 'xtensa-esp32s3-elf-g++ -Os -c build/prog0.cpp'],
  [2, 'xtensa-esp32s3-elf-g++ -Os -c build/fb_motorstarter.cpp'],
  [2, 'xtensa-esp32s3-elf-g++ -Os -c runtime/iec_runtime.cpp'],
  [2, 'esp-idf: building component esp_flow_rt  (4/7)'],
  [2, 'esp-idf: building component driver  (5/7)'],
  [3, 'xtensa-esp32s3-elf-g++ -o build/firmware.elf'],
  [3, 'esptool: firmware.bin  248 KB  (4 MB flash, 6% used)'],
  [4, 'build finished in 28.3 s — 0 errors, 1 warning'],
  [4, 'ready to flash: ESP32-S3 on COM4'],
];

/** Autocomplete candidates beyond the declared set, for the Properties picker. */
export const EXTRA_SYMBOLS: SymbolDecl[] = [
  { cls: 'VAR_OUTPUT', name: 'Motor2Run', addr: '%QX0.4', type: 'BOOL', init: 'FALSE', cmt: '' },
  { cls: 'VAR_INPUT', name: 'MotorFault', addr: '%IX1.2', type: 'BOOL', init: 'FALSE', cmt: '' },
];

/** One use of a symbol, as the cross-reference index reports it. */
export interface XrefRow {
  sym: string;
  /** R reads the variable, W writes it. */
  access: 'R' | 'W';
  element: string;
  loc: string;
}

/** The symbol the Search Results tab is currently reporting on. */
export const XREF_SUBJECT = { sym: 'ConveyorMotor', addr: '%QX0.1', type: 'BOOL' };

export const SEED_XREF: XrefRow[] = [
  { sym: 'ConveyorMotor', access: 'W', element: 'Output coil  --( )--', loc: 'Prog0 : Network 1' },
  { sym: 'ConveyorMotor', access: 'R', element: 'NO contact  --| |--', loc: 'Prog0 : Network 1' },
  { sym: 'ConveyorMotor', access: 'R', element: 'NO contact  --| |--', loc: 'Prog0 : Network 2' },
  { sym: 'ConveyorMotor', access: 'R', element: 'MotorStarter.Run', loc: 'MotorStarter : Network 3' },
  { sym: 'ConveyorMotor', access: 'W', element: 'Set coil  --(S)--', loc: 'Prog0 : Network 7' },
];
