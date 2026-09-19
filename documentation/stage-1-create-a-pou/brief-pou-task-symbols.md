# Design brief — POUs, tasks and symbols

**Written 2026-09-19.** Requirements for the screens that let an engineer create programs and
function blocks, schedule them in tasks, and declare their symbols. None of these exist in the
design prototype yet. They are designed with `/design`, one stage at a time, before any code.

**How to use this file.** Run `/design`, name the stage, and point it at this file and at the three
existing canvases in §0.1. Each stage below lists what to draw. When a stage's canvas is agreed,
it goes into a new handoff folder under `documentation/` and becomes the authority for those
screens — the same standing the IDE prototype has under CLAUDE.md rule 1.

Where a requirement comes from Delta's ISPSoft manual, the section is cited (UM EN 2021-03-29).
ISPSoft is the reference for behaviour; the existing design system is the reference for looks.

---

## 0. Applies to every stage

### 0.1 The look comes from what already exists

All three live in `documentation/Design feedback needed canvas updated/design_handoff_espflow_ide/`:

| Canvas | Use it for |
|---|---|
| `ESP-Flow Design System.dc.html` | Colour tokens, type, and components. Buttons: primary, secondary, default, disabled. Inputs in four states: **default, focused, invalid, disabled**. Select, segmented control, panel title. |
| `ESP-Flow IDE.dc.html` | How new screens sit in the IDE: the project tree, the tab strip, the right-click menu, the **Hardware Configuration** modal. |
| `ESP-Flow Layout Guide.dc.html` | Region sizes and spacing. |

Reuse before inventing:

- **Dialogs** use the Hardware Configuration modal's frame: title bar, body, footer with
  **Cancel** and a primary action.
- **Right-click menus** use the existing tree menu's style. Today it offers, on a POU: Open, Open in
  New Tab, Compile Program, Set as Startup Program, Rename…, Delete, Cross Reference, Properties….
- **Tables** follow the existing Local Symbols table.
- **Invalid input** uses the design system's *invalid* state, with the reason written next to the
  field — never only a red border.

### 0.1a Except the ladder canvas

**For the ladder canvas, the running app and `documentation/reference/rules/LD building.txt`
govern — not the prototype.** Its ladder predates the ISPSoft rules: every coil in one aligned
column, a right power rail, a usable TON block. The app has none of those. It places each coil
where its own logic ends, draws no right rail, previews placements before the click, and has
function blocks switched off.

So any artboard that shows a ladder copies **`documentation/design/reference/ladder-as-built/`**
instead: pictures rendered by the app's own layout code, in both themes, including the placement
preview. Its README also lists the cursors and status sentences a still picture cannot show.

For everything around the canvas — dialogs, panels, tables, menus — the prototype and the design
system still govern.

### 0.2 Constraints

- **Minimum window 980×640.** Every dialog and panel fits; nothing needs horizontal scrolling.
- **Both themes.** Draw the main artboard of each stage in dark and in light.
- **Square corners everywhere**, as the design system has them.
- **IBM Plex Sans** for UI text; **IBM Plex Mono** for identifiers, addresses, data types,
  values and shortcuts.
- **Nothing pretends to work.** An option that is not available yet is shown and visibly marked
  ("not yet"), never silently missing and never clickable-but-dead.
- **Undesigned areas get a labelled empty state**, not invented content.
- **Keyboard.** Every dialog: focus lands in the first field, Enter confirms, Escape cancels.

### 0.3 Who decides what is valid

Under ADR-001 the Python compiler owns the rules for what a name, type or address may be; the
browser only shows the result. So the design must show **where** an error appears and **how it
reads**, but must not depend on specific rules being checked in the browser. The rules quoted
below are ISPSoft's, for realistic examples; ESP-Flow's final rules arrive from the backend.

### 0.4 Out of scope for these stages

- Function POUs (FC), SFC, and Structured Text editing
- POU passwords and permanent lock (ISPSoft §5.4.1 has them)
- Online editing
- Placing function blocks on the ladder canvas — that follows the function block proposal
- Saving — nothing persists until the backend exists; designs may assume it does

---

## Stage 1 — Create a POU

**Purpose.** Add a new program or function block to the project, and edit an existing one's
properties.

### Where it starts

| Entry point | Exists today? |
|---|---|
| Right-click **Programs** in the tree → **New Program…** | **No** — folder nodes have no menu yet. ISPSoft works this way (§5.4.1). |
| Right-click **Function Blocks** → **New Function Block…** | **No** — as above |
| Right-click a POU → **Properties…** | Yes, in the prototype's tree menu |
| Command palette → "New Program" / "New Function Block" | The palette exists; the commands do not |

### Fields

| Field | Program | Function block | Behaviour |
|---|---|---|---|
| **Name** | ✓ | ✓ | Required. Suggested default, e.g. `Prog2`, `FB1`. ISPSoft's rules for realism: at most 30 characters; no spaces or special characters (`* # ? \ % @`); underscores allowed but not doubled and not at the end — `POU_1` is legal, `POU__1` and `POU_1_` are not. A name already in use is refused. |
| **Language** | ✓ | ✓ | Ladder (LD) selectable. Structured Text, Function Block Diagram, Instruction List shown and marked *not yet*. **Cannot be changed after creation** (ISPSoft §5.4.1 (4)) — locked in the Properties variant. |
| **Task** | ✓ | — | Which task runs the program. A function block has no task: it is called, never scheduled. |
| **Active** | ✓ | — | Unticked skips the program when compiling, without deleting it — for testing (ISPSoft §5.4.2). |
| **Comment** | ✓ | ✓ | Optional, free text. |

### Behaviour

- The kind (program or function block) is fixed by where the dialog was opened. Show it in the
  title; it does not need to be switchable.
- The primary button stays disabled until the name is valid; the reason is always visible.
- **After OK:** the POU appears in the tree under its folder — and, for a program, under its task —
  and opens in a new editor tab (ISPSoft §5.4.1 (3)).
- A new function block opens in the same work area as a program: tab strip → breadcrumb → symbol
  table → ladder. Its symbol table is the one designed in stage 3c.

### Artboards to draw

1. The tree with **Programs** right-clicked, showing **New Program…**
2. New Program dialog, empty, focus in Name
3. The same, filled in and valid
4. The same, with an invalid name and its message — one for a bad character, one for a duplicate
5. New Function Block dialog (no Task, no Active)
6. Properties of an existing program — Language locked, and visibly why
7. After OK: the new POU in the tree and open in its tab
8. Artboard 3 in the light theme

### Open questions to settle while designing

- Is a program without a task allowed? If so, how does the tree show that it will never run?
- Does **Rename…** (already in the tree menu) reuse this dialog, or rename in place in the tree?

---

## Stage 2 — Task Manager

**Purpose.** Decide what runs, how often, and in what order.

### Where it starts

- Right-click **Tasks** in the tree → **Task Manager…**
- Double-click a task in the tree, e.g. `CyclicTask_10ms`, opens the manager with it selected

### What a task has (ISPSoft §5.5.1)

| Field | Notes |
|---|---|
| **Name** | e.g. `CyclicTask_10ms` |
| **Type** | **Freewheeling** (runs again as soon as it finishes), **Cyclic** (every N ms), **Triggered by event** |
| **Interval** | Cyclic only, in ms |
| **Event** | Event only. On an ESP32 this naturally means a **GPIO pin** and an **edge** (rising / falling) |
| **Priority** | ISPSoft offers 1 (highest) to 24 on its newer series |
| **Watchdog** | The longest a single run may take before the controller treats it as a fault |
| **Active** | Whether the task runs at start-up |

Limits — how many tasks, the shortest interval, which pins can trigger — depend on the board, and
arrive from the backend's board profile (ADR-001: share data, not code). Show them as hints
("minimum 1 ms on ESP32-S3"), not as fixed numbers in the layout.

### Assigning programs (ISPSoft §5.5.2, §5.5.3)

- Two lists: **Unassigned POUs** and **Assigned POUs**, with buttons to move a program across
- **Order** within a task, with move up / move down — programs run top to bottom, so order is
  behaviour, not tidiness
- **Active** per assigned program

ISPSoft's older series allow a program in only one task; its newer ones allow several. Recommend
**one task per program** for ESP-Flow, and design for that.

### Artboards to draw

1. The manager with two tasks, a cyclic one selected
2. An event task selected, showing the pin and edge choice
3. Assigning a program: one in Unassigned, being moved across
4. Reordering assigned programs
5. No tasks yet — labelled empty state with the way to add one
6. Validation: interval below the board minimum; two tasks with one name
7. Artboard 1 in the light theme

### Open questions

- A panel inside the IDE, or a modal like Hardware Configuration? ISPSoft uses a window.
- Should the project tree show each task's programs beneath it, as ISPSoft's does?

---

## Stage 3 — Symbols

### 3a. Local symbols — edit, not just read

The Local Symbols table under the breadcrumb exists but is read-only. Its columns stay:
**Class · Identifier · Address · Data Type · Initial · Comment**. Its header already shows the
POU name, a declared count, and **+ New symbol**.

To design:

- **Adding** a row from **+ New symbol**, with focus in Identifier
- **Editing** a cell in place; Class and Data Type as pickers
- **Deleting** a row, including one still used on the ladder — say where it is used before it goes
- **Errors inline**, in the invalid state, e.g. a duplicate identifier or an address used twice
- **Which classes are offered depends on the POU**: a program offers `VAR` and `VAR_EXTERNAL`; a
  function block offers `VAR`, `VAR_INPUT`, `VAR_OUTPUT`, `VAR_IN_OUT`, `VAR_TEMP`
  (the model already has all seven classes)
- **Data types** are a list from the backend. For realism: `BOOL`, `INT`, `DINT`, `REAL`, `TIME`,
  `WORD`, `STRING`, plus function block types such as `TON` for declaring an instance

### 3b. Global symbols — the Symbol Manager

Opened from **Tools → Symbol Manager** or the **Global Symbols** node in the tree. Today that menu
item only enlarges the Local Symbols panel and says global symbols arrive with the backend. The
design replaces that with a full editor tab, same columns, class `VAR_GLOBAL`.

For addresses such as `%QX0.1`, show which **ESP32 pin** that resolves to, taken from the hardware
configuration. An engineer wiring a board thinks in pins, not in `%QX` addresses.

### 3c. A function block's interface

A function block's symbol table **is** its interface: `VAR_INPUT` symbols become pins on the
block's left, `VAR_OUTPUT` on its right, `VAR` stays private (ISPSoft §7.2.2, §7.2.3).

Design the function block's symbol table with a **live preview of the block beside it**, so
declaring an input visibly adds a pin. Use ISPSoft's drawing as the starting point:

- instance name above the box, block name in the header
- top row **En → Eno**
- one pin per row, inputs left and outputs right, in declaration order
- fixed width; long pin names shortened with `~`, as ISPSoft does (`CompM~`)
- height grows with the number of pins

The preview is **illustrative until the function block proposal is agreed** — in particular
whether En and Eno carry the rung (PROJECT-STATE §8.7). Mark it as such on the artboard.

### Artboards to draw

1. Local symbols of a program: reading
2. Adding a new symbol
3. Editing a row, with the Data Type picker open
4. A row with an error
5. Deleting a symbol still used on the ladder
6. Symbol Manager (global symbols) with addresses resolved to pins
7. A function block's symbol table with its live block preview
8. Empty states: a POU with no symbols; a project with no globals
9. Artboard 1 in the light theme

---

## Accepting a stage's design

A stage is ready to build when its canvas:

- [ ] draws every artboard listed for it
- [ ] fits in 980×640 and exists in both themes where asked
- [ ] shows every error with a written reason
- [ ] marks everything unavailable instead of hiding it
- [ ] reuses the design system's components and states, adding new ones only where none fit
- [ ] answers, or explicitly defers, that stage's open questions

## What building these will need

Designing does not wait on this, but building does: **every POU needs its own ladder.** Today the
application holds one list of networks for the whole project, which is why function block tabs
show an empty state. Stage 1 cannot be built until each POU owns its networks — in memory is
enough, since saving waits for the backend anyway.
