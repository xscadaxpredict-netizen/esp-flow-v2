# ESP-Flow — UI Design Brief

The prompt below is written to be pasted into **Claude Design** to generate the editor shell as a multi-artboard canvas. It is self-contained: Claude Design starts with no knowledge of this project.

Revise this file rather than editing the prompt in place, so the brief and the design stay in sync.

---

## The prompt

```
Design the UI for ESP-Flow, a browser-based PLC programming IDE.

## What the product is

ESP-Flow lets industrial automation engineers write PLC programs for ESP32
microcontrollers using Ladder Diagram, the graphical relay-logic language defined
by the IEC 61131-3 standard. The user draws logic as rungs between two vertical
power rails, compiles it to C++ firmware, flashes it to a board over USB, and then
watches the program run live with values updating on the diagram.

The closest reference product is Delta Electronics' ISPSoft. Siemens TIA Portal
and CODESYS are the same category. Think professional engineering tool, not
consumer SaaS.

ESP-Flow is launched from an in-house platform app launcher that also hosts SCADA,
integration, and BI tools, so there is no login screen and no marketing surface —
the user arrives already authenticated, inside an already-open project.

## Who uses it

Automation engineers and controls technicians. They sit in this tool for six-hour
stretches. They are used to dense, information-rich industrial software and are
actively annoyed by whitespace that pushes content off screen. They work on
1920x1080 desktop monitors; 1440x900 is the minimum that must still be usable.
Many work in dim control rooms, so dark theme is not an afterthought.

## The nine-region layout

A classic IDE shell. Every region below must appear in the main artboard.

1. WINDOW TITLE BAR
   Shows the project name and the currently open program, e.g.
   "BottlingLine_v3 - [Prog0 : Ladder Diagram]". Slim. Include a compact
   app-launcher affordance on the left, since ESP-Flow runs inside a platform
   shell alongside sibling apps.

2. MENU BAR — exactly eight menus
   File, Edit, View, Compile, PLC, Tools, Window, Help.
   Show one menu open in a dedicated artboard (use the PLC menu, containing:
   Connect Device, Download to PLC, Upload from PLC, Run, Stop, Online Mode,
   Force Values, Clear PLC Memory, Device Info).

3. TOOLBARS — five distinct, visually separated groups on one or two rows
   a. Standard: New, Open, Save, Print, Undo, Redo, Cut, Copy, Paste, Find
   b. Ladder: insert normally-open contact, normally-closed contact, rising-edge
      contact, falling-edge contact, output coil, set coil, reset coil, function
      block, horizontal wire, vertical branch, insert network, delete network
   c. PLC / Online: Connect, Download, Upload, Run, Stop, Online Monitor, Force
   d. Compile: Compile, Rebuild All, Check Program, Previous Error, Next Error,
      Cross Reference
   e. View / Zoom: Zoom In, Zoom Out, Zoom to Fit, Toggle Grid, Toggle Comments,
      Toggle Panels
   Icons must be legible at 16px and readable in both themes. Group separators
   between toolbars. Show a tooltip on one button in an artboard.

4. PROJECT PANEL (left, dockable) — hierarchical tree
   Project root
     Hardware Configuration
     Network Configuration
     Global Symbols
     Programs
       Prog0 (Ladder)
       Prog1 (Structured Text)
     Function Blocks
       MotorStarter
       TankFill
     Tasks
       CyclicTask_10ms
       CyclicTask_500ms
     Device Monitor Tables
   Needs distinct icons per node type, expand/collapse, selection state, and a
   right-click context menu shown in one artboard.

5. WORK EDIT AREA (centre, the hero of this design) — tabbed
   Tabs across the top: "Prog0 [Ladder]", "MotorStarter [FB]",
   "Device Table 1", "Monitor Chart". Show a dirty-state indicator on one tab.
   The active tab is the ladder editor, which contains, stacked vertically:
     - A LOCAL SYMBOLS table, collapsible, columns:
       Class (VAR / VAR_INPUT / VAR_OUTPUT) | Identifier | Address | Data Type |
       Initial Value | Comment
       Populate with realistic rows: StartButton / %IX0.0 / BOOL,
       ConveyorMotor / %QX0.1 / BOOL, DelayTimer / (blank) / TON,
       CycleCount / (blank) / DINT.
     - The LADDER CANVAS below it. This is the most important element on screen.
       Draw it properly:
       * Left and right vertical power rails.
       * Numbered networks (rungs), each with an editable comment line above it.
       * Network 1: a seal-in circuit — StartButton normally-open contact in
         series with a StopButton normally-closed contact, driving a
         ConveyorMotor coil, with a ConveyorMotor contact in a parallel branch
         below StartButton feeding back into the same node.
       * Network 2: a contact feeding a TON timer function block drawn as a
         labelled box with IN and PT input pins on the left and Q and ET output
         pins on the right, its instance name "DelayTimer" above the box, with
         PT wired to the literal T#5s.
       * Each contact and coil shows its symbol name above it and its address
         below it, addresses in a monospace face.
       * One element rendered in a clear selected state.
       * A text cursor / insertion position indicator.
       Ladder symbols to render precisely:
         normally-open contact   --| |--
         normally-closed contact --|/|--
         rising-edge contact     --|P|--
         output coil             --( )--
         set coil                --(S)--
         reset coil              --(R)--
       These are drawn as clean vector line art, not icon-font approximations.

6. LIBRARY PANEL (right, dockable) — three collapsible groups
   - Standard Library: Timers (TON, TOF, TP), Counters (CTU, CTD, CTUD),
     Edge Detection (R_TRIG, F_TRIG), Bistables (SR, RS), Math, Comparison,
     Bit Operations, Conversion
   - ESP-Flow Library: WiFi, MQTT Publish, MQTT Subscribe, Analog Read, PWM
     Output, I2C Read, NTP Time
   - User Library: MotorStarter, TankFill
   Items are drag-and-drop sources onto the ladder canvas. Show one item mid-drag
   with a drop indicator on the canvas in a dedicated artboard.

7. PROPERTIES PANEL (right, below or tabbed with Library)
   Context-sensitive to the canvas selection. Show it editing a selected contact:
   Symbol (with autocomplete dropdown open showing matching symbols and their
   data types), Address, Data Type, Contact Type (NO / NC / rising / falling),
   Comment.

8. COMPILE MESSAGE PANEL (bottom, dockable) — tabbed
   - Compile: a streaming build log. Our builds genuinely take 20 to 60 seconds
     because we transpile to C++ and rebuild firmware, so this panel must make
     waiting tolerable: a determinate progress bar with named stages
     (Validating -> Generating C++ -> Compiling -> Linking -> Ready to flash),
     elapsed time, and scrolling compiler output. Design this as a real feature,
     not a log dump.
   - Problems: a filterable table — Severity | Code | Message | Location.
     Rows are clickable to jump to the offending element. Include a severity
     filter (Errors / Warnings / Info) and a source filter (Editor / Compiler).
     Realistic rows:
       Error   SEM-0207  Symbol 'Motor2' is not declared in any accessible scope.  Prog0 : Network 4
       Error   SEM-0311  Variable 'ConveyorMotor' is written by more than one coil. Prog0 : Network 7
       Warning STR-0101  Contact has no operand assigned.                           Prog0 : Network 2
   - Search Results: cross-reference output showing every use of a symbol,
     with read/write indicated.

9. STATUS BAR (bottom, single line)
   Left to right: edit mode (Overwrite / Insert), current network and cursor
   position (e.g. "Network 3, Row 2, Col 5"), connection state chip
   ("Connected - ESP32-S3 on COM4" with a status dot), PLC state (RUN / STOP),
   live scan time ("Scan: 2.4 ms"), and the compile state.

## Artboards to produce

1. Main editor, offline edit mode, full shell, dark theme — the master screen
2. Main editor, same layout, light theme
3. ONLINE MONITORING MODE — the same ladder program with live data:
   conducting current paths highlighted in green along the actual conductive
   route, non-conducting paths dimmed, live values shown beside every symbol,
   the timer block showing ET counting up, one forced variable marked
   distinctly, and the status bar showing RUN with a live scan time. This is the
   signature screen of the product and deserves the most care.
4. Compile panel mid-build: progress bar at "Compiling", elapsed 00:23, log
   streaming
5. Problems panel populated with the errors above, one row hovered
6. PLC menu open, with a toolbar tooltip visible
7. Project tree right-click context menu open on a Program node
8. Hardware Configuration modal: a table mapping ESP32 GPIO pins to IEC addresses
   — columns GPIO | Direction | IEC Address | Symbol | Comment — beside a simple
   ESP32-S3 board pinout graphic, with a board-selector dropdown listing
   ESP32, ESP32-S2, ESP32-S3, ESP32-C3, ESP32-C6, and one row flagged as a
   duplicate-pin conflict
9. Library panel with an item mid-drag over the canvas showing a drop indicator
10. A design system sheet: color tokens for both themes, type scale, spacing
    scale, icon set, all ladder symbols in every state (normal, selected,
    conducting, error, forced), panel chrome, table styling, form controls

## Visual direction

- Dense and professional. Compact rows, tight padding, small radii. Every pixel
  of vertical space belongs to the canvas. Toolbar rows around 28px, tree and
  table rows around 22-24px, UI text 12-13px.
- Neutral, desaturated chrome. Colour is a signal, not decoration, and must be
  reserved: green means conducting power flow, red means error or forced, amber
  means warning. If the interface itself is colourful, those signals stop
  reading — this is a safety-adjacent tool and that matters.
- Both themes fully specified, dark first. Dark must be a genuine dark palette,
  not grey-on-grey; light must be comfortable for a full working day.
- The ladder canvas gets a subtle grid and generous internal spacing even though
  the surrounding chrome is tight — the diagram is the document.
- Monospace for all addresses, values, and log output. Clean UI sans for
  everything else.
- Panels are dockable and resizable; show splitter handles.
- Meet WCAG AA contrast in both themes, including the green conducting state
  against the canvas background.

## Explicitly avoid

- Consumer SaaS styling: large rounded cards, hero headers, gradients, drop
  shadows for decoration, generous whitespace, pastel palettes
- Emoji or illustrative icons — this is a line-art icon set
- Hiding primary functions behind hamburger menus; engineers want visible tools
- Marketing surfaces of any kind. There is no landing page, no onboarding wizard,
  no login. The user arrives with a project already open.

## Improvements over the reference product

Delta's ISPSoft is the functional benchmark, but it looks like Windows software
from 2010. Modernise deliberately in these specific ways, without diluting the
density:

- A real dark theme
- A command palette (Ctrl+Shift+P) — show it open in an artboard
- Inline symbol autocomplete on the canvas, not only in the properties panel
- Diagnostic underlines directly on offending ladder elements, linked to the
  Problems panel
- A breadcrumb above the canvas: Project / Programs / Prog0 / Network 3
- The build-progress experience described in region 8
- Clear, always-visible device connection state
```

---

## Notes for implementation (not part of the prompt)

- The generated design is a visual target. It will be rebuilt in React + TypeScript
  + Tailwind v4 under `frontend/src/ui/`, following the feature slices already
  scaffolded there (`ladder-editor`, `block-library`, `properties-panel`,
  `hardware-config`, `compiler`, `monitoring`, `toolbar`).
- Ladder symbols render as SVG so they stay crisp at any zoom and can be styled by
  CSS class for the conducting / selected / error states.
- The Problems panel is the UI surface of the diagnostic model defined in
  [ADR-001](../architecture/adr/ADR-001-compiler-boundary.md); the `SEM-` and
  `STR-` codes in the prompt are drawn from that registry deliberately.
- Ask the design output for CSS custom properties as its colour tokens — they
  transfer directly into the Tailwind v4 theme layer.
