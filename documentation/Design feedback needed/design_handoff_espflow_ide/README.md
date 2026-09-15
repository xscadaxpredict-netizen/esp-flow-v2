# Handoff: ESP-Flow — Browser-based PLC IDE for ESP32

## Overview
ESP-Flow is a desktop-class IDE for programming ESP32 microcontrollers with IEC 61131-3
Ladder Diagram (LD) logic. It targets the functional depth of Delta ISPSoft / Siemens TIA
Portal but in the browser, with a modern dark/light theme, a live symbol table, compile
diagnostics, and online monitoring of a running controller.

The bundle contains three HTML design references plus one shared runtime file.

## About the Design Files
**The files in this bundle are design references created in HTML.** They are prototypes that
demonstrate the intended look, layout, and interaction model — they are *not* production code
to copy into a shipping app.

The task is to **recreate these designs in the target codebase's existing environment**
(React, Vue, Svelte, Electron, Tauri, etc.) using that codebase's established patterns,
component library, state management, and styling approach. If no codebase exists yet, choose
the most appropriate framework for a data-dense, canvas-driven desktop-style editor and
implement the designs there.

Notes on the prototype's construction that should NOT be carried over:
- All styling is written as inline styles with a JS theme-token object. In production, use the
  codebase's normal styling layer (CSS modules, Tailwind, styled-components, design tokens).
- The whole IDE lives in one component class. In production, decompose per region
  (menu bar, toolbar, project tree, ladder canvas, symbol table, bottom dock, status bar).
- The ladder canvas is drawn with absolutely-positioned divs and inline SVG. That approach is
  fine and intentional (it keeps rungs DOM-inspectable and hit-testable), but a production
  build may prefer a dedicated canvas/SVG renderer if rung counts get large.

## Fidelity
**High-fidelity.** Colors, typography, spacing, iconography, and interaction behavior are all
final. Recreate the UI to match, using the target codebase's libraries. The ladder-logic model
(series/parallel tree, branch spanning, power-flow evaluation) is also final and should be
ported as real domain logic, not re-invented.

## Screens / Views

### 1. Main IDE — `ESP-Flow IDE.dc.html`
**Purpose:** The single working surface. The engineer writes ladder logic, declares symbols,
compiles, downloads to the board, and monitors it live.

**Design canvas:** 1920×1080, but the layout is fully responsive and must stay usable down to
**980×640**. Every region has a minimum size; nothing may disappear or produce a horizontal
scrollbar at the floor size.

**Layout — 3 rows over a 3-column middle band:**

```
┌──────────────────────────────────────────────────────────┐
│ menu bar            24px tall, full width                │
├──────────────────────────────────────────────────────────┤
│ toolbar             two rows of icon buttons             │
├───────────┬──────────────────────────────┬───────────────┤
│ project   │ editor tab strip             │ library       │
│ tree      ├──────────────────────────────┤ (collapsible) │
│           │ ladder canvas   (flex: 1)    ├───────────────┤
│ 238px     │  gutter + rungs              │ properties    │
│ resizable ├──────────────────────────────┤ (collapsible) │
│           │ local symbols table  65px    │ 296px resiz.  │
├───────────┴──────────────────────────────┴───────────────┤
│ bottom dock  150px, tabs: Compile / Problems / XRef      │
├──────────────────────────────────────────────────────────┤
│ status bar          22px                                 │
└──────────────────────────────────────────────────────────┘
```

Region details:
- **Menu bar** — 24px. File, Edit, View, Compile, PLC, Tools, Window, Help. Dropdown panels are
  214px min-width, 22px rows, icon + label + right-aligned shortcut. A "Command palette
  Ctrl+Shift+P" pill sits right-aligned in the bar.
- **Toolbar** — two rows. Row 1: file/edit/clipboard/search. Row 2: ladder element placement
  tools (NO contact, NC contact, coil, set/reset coil, function block, branch, vertical link),
  compile/download/monitor. Buttons are square icon buttons; the active placement tool is
  shown selected (accent background + accent left/bottom marker).
- **Project tree** — left panel, default 238px, drag-resizable, min 96px. Hierarchy:
  Device → Programs (Main, Prog1) → Function Blocks → Global Symbols → Tasks. Right-click
  opens a context menu (New POU, Rename, Delete, Properties).
- **Editor tab strip** — tabs for open POUs, each with a close affordance and a dirty dot.
- **Ladder canvas** — the core. Left gutter shows rung numbers and comment markers. Rungs are
  drawn between a left and right power rail. Optional dot grid background (View → Grid).
- **Local Symbols table** — docked below the canvas, default 65px, drag-resizable via a
  splitter, collapsible. Columns: Name, Address, Data Type, Initial, Comment.
- **Library panel** — right column, top. Categorized list of instructions/function blocks,
  drag-to-canvas.
- **Properties panel** — right column, bottom. Edits the selected element. Name field has
  pattern-matching autocomplete against Local Symbols; **Address and Data Type are read-only
  mirrors of the symbol declaration** — one source of truth.
- **Bottom dock** — 150px, collapsible. Tabs: Compile (build log, staged progress), Problems
  (severity + source filters, "N of M shown"), Cross Reference.
- **Status bar** — 22px. Board name, connection state, cursor rung/column, active tool, and a
  contextual placement message.

**Modals / overlays:**
- **Command palette** (Ctrl+Shift+P) — 600px wide, top-anchored 90px from top, scrim
  `rgba(0,0,0,.42)`. Rows 28px, icon + label + group + shortcut; first row preselected with an
  accent 2px left border and `selbg` background.
- **Hardware Configuration** modal — board selector dropdown, pin assignment table.
- **App launcher** popover.
- **Tooltips** on toolbar buttons.

### 2. Design System — `ESP-Flow Design System.dc.html`
Token reference, type and spacing scales, 54 line-art icons (16×16 viewBox, 1.4–1.5 stroke,
`fill: none`, `currentColor`), every ladder symbol rendered in six states, and chrome / table /
form-control specimens for both themes. Use this as the source of truth when building the
component library in the target codebase.

### 3. Layout Guide — `ESP-Flow Layout Guide.dc.html`
Documentation artboard: the editor annotated with 12 numbered regions and one-line callouts,
plus fuller per-region descriptions on a second page. Useful for onboarding a developer to the
region names used throughout this README.

## The Ladder Model (port this as real domain logic)

This is the most important non-visual part of the handoff.

**A rung is a series/parallel tree, not a flat array.** Each network (rung) has a root *series*
node. A series node holds an ordered list of children evaluated left→right (logical AND). A
*parallel* node ("branch block") holds a list of levels, each itself a series node, evaluated
top→bottom (logical OR). Elements (contacts, coils, function blocks) are leaves.

Rules that fall out of this and must be preserved:
- **Branch spans are derived from structure, never bookkept.** A new branch always wraps exactly
  its parent node. A parallel block's rendered width is the max width of its levels.
- **Inserting into a level widens the block automatically** — no manual span updates anywhere.
- **Insert-in-series pushes subsequent elements right**; the rung grows.
- **Delete closes the gap**, and a parallel block with a single remaining level collapses back
  into its parent series node.
- **Evaluation:** `series = AND(children)`, `parallel = OR(levels)`, evaluated left to right from
  the left power rail. The conducting path is the set of nodes reached with power = true; this
  drives the online-monitoring highlight.

**Coils terminate a rung** and sit flush against the right power rail regardless of rung width.

## Interactions & Behavior
- **Tool selection** — click a toolbar element tool to arm it; the status bar reports the
  placement context ("Click a rung position to place a NO contact"). Escape disarms.
- **Placement** — clicking a valid insertion slot on a rung inserts at that position.
- **Branching** — Ctrl+B (or the branch tool) arms branch mode; the next click creates a
  parallel level around the targeted node.
- **Deletion** — Delete / Backspace removes the selected element and closes the gap.
- **Insert network** — Ctrl+I adds a rung below the current one.
- **Selection** — clicking an element selects it; the Properties panel binds to it.
- **Autocomplete** — typing in the Properties Name field filters Local Symbols by substring
  match; picking a result fills Address and Data Type read-only.
- **Panel resizing** — left, right, bottom, and the symbol table all drag-resize with splitters,
  each clamped to a minimum. Library and Properties collapse independently.
- **Theme toggle** — dark ⇄ light, swapping the whole token object.
- **Modes** — `edit` and `online`. Online mode disables editing affordances and turns on live
  value display and conducting-path highlighting.
- **Compile** — staged progress in the bottom dock with an elapsed-seconds counter and a
  growing log; ends in a summary line ("0 errors · 1 warning · 248 KB").
- **Keyboard:** Ctrl+Shift+P palette, Ctrl+B branch, Ctrl+I insert network, Delete/Backspace
  delete, Escape cancel, F8 download, Ctrl+M toggle monitor, F11 compile, F12 check, F4 next
  error, Ctrl+G grid, Ctrl+0 zoom to fit.

Transitions are deliberately minimal — this is an engineering tool. Hover feedback is an
instant background change; no easing longer than ~120ms anywhere.

## State Management
Top-level state in the prototype (port to whatever store the codebase uses):

```
theme          'dark' | 'light'
mode           'edit' | 'online'
openMenu       menu id | null
tab            active editor tab index
bottomTab      'compile' | 'problems' | 'xref'
leftW          238   right/left panel widths (px)
rightW         296
bottomH        150
symOpen        boolean      symH  65
activeTool     element tool id | null
branchArm      armed branch target | null
selection      selected node id | null
networks       the rung trees (see Ladder Model)
symbols        local symbol declarations
tip / ctx / palette / hw / launcher / boardOpen    overlay flags
board          'ESP32-S3'
drag / dropOn  drag-and-drop from Library
acOpen / acProp / symQuery                          autocomplete
building / stage / elapsed / logN                   compile progress
problems, sev, src                                  diagnostics + filters
```

Data fetching: none in the prototype. In production, the symbol table, compile results, and
online values all come from the toolchain/device bridge — expect a websocket or serial
transport for online monitoring, polled or pushed at ~10Hz for value updates.

## Design Tokens

Two complete themes. Every color in the UI comes from one of these keys.

### Dark
```
bg      #0e1114     app background
panel   #171b21     panel surfaces
panel2  #1d222a     raised surfaces, menus, modals
head    #131720     panel headers
bord    #2a313a     hairline borders
bord2   #3d4650     stronger borders
tx      #dde3ea     primary text
tx2     #9aa5b1     secondary text
tx3     #6e7882     tertiary / shortcuts
acc     #4b90d6     accent
accs    rgba(75,144,214,.18)   accent soft fill
selbg   #1b3350     selected row background
canv    #0b0e12     ladder canvas
grid    #191f27     canvas dot grid
gutter  #0e1216     rung-number gutter
input   #0b0e12     form input background
log     #090c0f     build log background
fbfill  #151b22     function-block body fill
green   #3fd67f     ok / conducting
red     #f0655c     error
amber   #e0a83c     warning
cmt     #6f9a80     comments
ink     #8e99a4     ladder line work
dead    #454e58     non-conducting / disabled
lab     #dde3ea     symbol label
addr    #9aa5b1     symbol address
shadow  rgba(0,0,0,.55)
```

### Light
```
bg      #e5e8ec     panel   #f3f4f7     panel2  #fbfbfd     head    #e9ebef
bord    #ccd2d9     bord2   #a9b1ba
tx      #1b2126     tx2     #525c66     tx3     #7c858f
acc     #1a68b8     accs    rgba(26,104,184,.14)          selbg   #cadff6
canv    #fcfcfb     grid    #e7eaed     gutter  #eef0f3
input   #ffffff     log     #f8f9fa     fbfill  #ffffff
green   #0f7a41     red     #c0342a     amber   #8f5c05     cmt     #3f7a58
ink     #414b55     dead    #aab2ba
lab     #1b2126     addr    #525c66     shadow  rgba(0,0,0,.22)
```

### Typography
- UI: **IBM Plex Sans** — 11.5px/1 for menu and body rows, 11px for panel headers, 10px for
  status bar and meta.
- Code, addresses, shortcuts, log output: **IBM Plex Mono** — 10–11px.
- Weights: 400 throughout; 500/600 only for panel headers and active tabs.
- Everything is small and tight on purpose — this is a dense engineering tool, not a web page.

### Spacing
4px base. Common values: 3, 6, 7, 8, 9, 11px paddings; `gap` 6–9px in rows.

### Sizing
menu bar 24px · status bar 22px · menu row 22px · palette row 28px · toolbar button ~17–22px
square · panel header ~22px · table row ~20px.

### Borders & shadows
- Radius: **0 everywhere.** Square corners are part of the identity.
- Borders: 1px `bord`, or 1px `bord2` on raised surfaces.
- Menu shadow `0 10px 26px <shadow>`; modal shadow `0 18px 48px rgba(0,0,0,.6)`.

## Assets
No external images. All 54 icons are inline SVG paths defined in a single `ICON` map inside the
IDE file (and catalogued in the Design System file): 16×16 viewBox, `fill: none`,
`stroke: currentColor`, stroke-width 1.4–1.5. Copy the path data directly into the target
codebase's icon component. Fonts are IBM Plex Sans and IBM Plex Mono (Google Fonts, OFL).

## Files
- `ESP-Flow IDE.dc.html` — the main clickable editor prototype (all regions, all interactions)
- `ESP-Flow Design System.dc.html` — tokens, scales, icon set, ladder symbol states, specimens
- `ESP-Flow Layout Guide.dc.html` — annotated region map for documentation
- `support.js` — shared runtime for the prototype format; **not part of the design**, included
  only so the HTML files open and run locally in a browser

Open any `.dc.html` file directly in a browser to interact with it.

## Known gaps in the prototype
These were scoped out and are not designed yet — flag them before implementing:
- Prog1 / Structured Text editor tab content, and the Monitor Chart tab
- Online monitoring visual highlighting (the model evaluates power flow correctly; the canvas
  does not yet paint the conducting path)
- Hardware Configuration modal is present but partially specified
