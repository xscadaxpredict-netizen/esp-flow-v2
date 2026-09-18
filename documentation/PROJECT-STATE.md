# ESP-Flow — Project State

**As of 2026-09-18, release 0.2.0.** Written as a handoff so a new session can continue without
re-deriving context. Read [CLAUDE.md](claude/context%20window%20memory/CLAUDE.md) first for the hard rules; this document
covers what exists, what was decided and why, what is verified, and what is still open.

---

## 1. Where the project stands

| Area | State |
|---|---|
| `frontend/` | **Editor shell complete and running.** All 12 regions; the ladder canvas places, branches and deletes by ISPSoft's rules and previews every placement before the click. Function blocks are switched off (§2). |
| `backend/` | **Empty directory.** Django project not started. |
| `firmware/` | **Empty directory.** No PlatformIO project, no C++ runtime. |
| `documentation/` | Primer, ADR-001, design handoffs, ladder rules, ISPSoft behaviour, frontend architecture. |

The whole repository is under git and pushed to `github.com/xscadaxpredict-netizen/esp-flow-v2`.
`main` is the only long-lived branch. Current release **0.2.0**, tagged `v0.2.0`; the previous
one is `v0.1.0`. Empty `backend/` and `firmware/` folders do not appear on GitHub until they
hold a file.

## 2. Decisions already made

Do not relitigate these without new information. Each was chosen deliberately.

| Decision | Choice | Reasoning |
|---|---|---|
| Execution model | **Transpile to C++, rebuild firmware with PlatformIO per download** | User chose this over an on-device bytecode VM after the trade-offs were laid out. Accepted cost: a 20–60 s edit→run loop and no online editing. Mitigation: the Compile panel shows real staged progress. |
| Compilation location | **Server-side (Django)** | Owns parsing, checks, codegen, toolchain. |
| Language priority | **LD first**, then ST, FBD, SFC/IL | |
| Frontend | React 18 + TS + Vite + Zustand + CSS Modules | |
| Backend | **Django + DRF + Channels** | User overrode a Node/TS suggestion. The platform is Django, so shared auth and one deployment story outweigh sharing compiler code across runtimes. ADR-001 is what makes that safe. |
| Backend scope | **Standalone — ESP-Flow owns its own backend** | Decided 2026-09-16. Project creation and configuration happen inside ESP-Flow. The launcher authenticates the user and opens the app; it is not a project owner and holds no ESP-Flow data. |
| Persistence | **None in the browser — wait for the backend** | Decided 2026-09-16. A browser-local stopgap would model a project twice and be thrown away. The project model is designed once, with the database. |
| Flashing | Server builds the `.bin`; **browser flashes over Web Serial** (esptool-js) | A server cannot reach the USB port on the engineer's desk. |
| Live monitoring | **WebSockets** (Django Channels), ~10 Hz | |
| Project format | Normalised Django models + JSON POU bodies; **PLCopen XML** import/export | |
| Targets | All ESP32 families; **Arduino framework first**, ESP-IDF later | |
| Styling | CSS custom properties + CSS Modules | The design is exact-pixel and radius-0. |
| Undesigned areas | Labelled empty states, nothing invented | |
| Minimum viewport | **980×640** | The README's stricter figure, over the Layout Guide's 1440×900. |
| Versioning | **One product version in lockstep**, root `VERSION` is the source of truth | Browser, Python compiler and ESP32 runtime must agree on diagnostic codes and generated C++; separate versions would need a compatibility table. `0.x` until compile-and-flash works. |
| Ladder canvas geometry | **ISPSoft wins over the prototype** | Decided 2026-09-12. Outputs sit where their logic ends; no right rail. The prototype still governs every other region. |
| Placement interaction | **Pointer position decides, as in ISPSoft** | Decided 2026-09-16. With a tool armed, a cell's lower band branches and either side inserts. The new element takes the armed tool's type. The toolbar branch command stays and overrides position. |
| Placement feedback | **Show legal positions before the click, and say why a refused one is refused** | Decided 2026-09-17. ISPSoft shows legal positions but refuses silently; we do both halves. The preview and the click ask the same function, so they cannot disagree. |
| Function blocks | **Switched off until redesigned** | Decided 2026-09-18, on the user's suggestion. The drawable block was a hard-coded TON that did not follow ISPSoft. Hidden, not deleted — `FUNCTION_BLOCKS_ENABLED` in `core/features.ts`. The redesign starts from a written proposal. |
| Git workflow | **Short-lived branch per change, a PR per branch, merged with "Create a merge commit"** | Adopted 2026-09-16. Dependent work is stacked (a branch from the branch it needs) and merged in order, retargeting each PR to `main` as the one below it lands. A fix belongs on the branch that introduced the bug, then is merged upward. Squash-merging a stack breaks it. |

## 3. What the frontend contains

### Domain — `frontend/src/core/`

The valuable part. Framework-free and portable.

- `models/` — `ladderNode.ts` (element / series / parallel / `NodePath`), `network.ts`,
  `symbolDecl.ts` (IEC variable declarations), `diagnostic.ts` (ADR-001 shape),
  `selection.ts`, `board.ts`.
- `ladder/`
  - `builders.ts` — `el`, `ser`, `par`, `newElement`, and `spanOf` (how wide a new element is).
  - `span.ts` — intrinsic width and height.
  - `shape.ts` — does a line end in an output (`terminates`), may it (`canTerminate`).
  - `path.ts` — `nodeAt`, cloning, `pathOfElement`.
  - **`legality.ts`** — the one answer to "may this go here?". `verdict(body, intent, type)`
    returns ok or the status-bar sentence, for inserting, appending, branching and converting.
    Mutations and the canvas preview both ask it; rules 6 and 7 are written nowhere else.
  - `mutations.ts` — resolve, ask `verdict`, edit a copy: place, append, branch, delete with
    pruning, network ops, symbol binding.
  - `evaluate.ts` — power flow: series AND, parallel OR.
  - **`layout.ts`** — pure geometry → draw lists. Also `zoneAt` (which band of a cell the
    pointer is in) and `elementShape` (glyph paths, shared by real elements and ghosts). Hits
    carry their column edges and centre line. Metrics `CW 116, CH 78, X0 76, RAIL_L 56,
    RIGHT_PAD 40, MINCOLS 6`; a cell is 70 tall and its branch band is the lower 24.
  - **`preview.ts`** — `previewLegality` builds a table of every hit × zone → verdict;
    `answerFor`, `accepts`, `ghostAt`. Mirrors the store's click routing exactly.
- `features.ts` — feature switches. Only `FUNCTION_BLOCKS_ENABLED`, currently false.
- `rules/structural.ts` — the browser's only validation, `STR-` codes.
- `data/seed.ts` — the bottling-line example: 4 networks, 10 symbols, live values, compiler
  diagnostics, build stages, build log, cross-reference rows. **Delete this when the backend
  lands; do not extend it.** Network 2 held a TON until function blocks were switched off.

### Application — `frontend/src/services/store/`

Four Zustand slices: `useLadderStore` (networks, selection, armed tool, branch arm, pointer
zone, undo/redo with a 50-step history), `useUIStore` (theme, mode, panel geometry, collapse
flags, overlays, status message), `useProjectStore` (tabs, tree expansion, symbols, board),
`useCompileStore` (build staging, log reveal, problems, filters).

The ladder store holds **one** list of networks for the whole project — there is no per-POU
ladder. That is why function block tabs cannot open an editor yet (§7).

`services/useCases/*` and `services/mappers/` are still scaffold stubs.

### Presentation — `frontend/src/ui/`

Twelve region slices matching the design: `title-bar`, `menu-bar`, `toolbar`, `project-tree`,
`editor-tabs`, `breadcrumb`, `symbols-table`, `ladder-editor`, `block-library`,
`properties-panel`, `message-panel`, `status-bar`, plus `command-palette` and
`hardware-config` overlays.

Work-area order, which the README gets wrong: **tab strip → breadcrumb → Local Symbols →
6px gripped splitter → ladder canvas**.

`LadderCanvas` keeps two memos: the layout, rebuilt when the ladder changes, and the preview
table, rebuilt when the ladder or the armed tool changes. A pointer move only looks the table
up.

Shared: `Panel`, `Splitter` (with optional dotted grip), `Tooltip` + `tooltipProps`,
`EmptyState`, `ContextMenu`, `Icon` + `paths.ts` (~50 icons), `useSplitter`,
`useKeyboardShortcuts`.

### Infrastructure — `frontend/src/io/`

All four folders (`api`, `websocket`, `storage`, `config`) are **empty stubs**. Board profiles
and diagnostics are seeded locally and move behind these adapters when Django exists.

### Tests

**248 cases** in 15 files, Vitest. `core/ladder/`, `core/rules/`, and the store: undo, pointer
routing, the function block switch, and `previewAgreement.test.ts` — every hit × every zone ×
five element types on seven trees, clicked for real through the store and compared with what the
preview promised. The legality, preview, preview-agreement and function-block-switch tests, and
the branch-leg test in `pointer.test.ts`, were each checked by breaking the code they guard and
watching them fail; `zones.test.ts` and the rest of `pointer.test.ts` have not been.

## 4. What has been verified, and how

Typecheck, lint and production build are clean. Beyond that, driven in a real browser.

### Before 0.2.0

- **Placement** — arming a tool and clicking a slot appends; a contact after an output is
  refused with the rule 6 sentence.
- **Branch spans its parent** — branching from an element that is the whole line inside a block
  adds a level to that block instead of nesting a narrower parallel.
- **Widening is a side effect** — inserting beside that element widened the block and stretched
  every other level's filler wire.
- **Pruning deletion** — removing an emptied level dropped it; removing the second level
  collapsed the parallel back into the parent series, leaving a flat rung.
- **Slot resolution** — built the genuine collision (block as last child), confirmed one hit
  region at the shared position, and confirmed the element landed in the root series after the
  block.
- **Online monitoring** — conducting path green with heavier strokes, dead paths dimmed, live
  values beside elements, forced variable in red, editing disabled.
- **980×640 floor** — rows total exactly 640 (title 26, menu 24, toolbar 57, middle 357,
  splitter 4, dock 150, status 22); columns 238 / 438 / 296; no horizontal overflow.
- **Message panel** — all three tabs and both panel states.
- **Outputs inside the rung** (2026-09-12) — two outputs in one rung draw in different columns,
  with one opening node and no rejoin node. A coil selects like any element. Branching a coil
  adds a second output leg. In monitor mode two legs of one rung showed different states. A
  rung with no output says so.
- **Coil spacing, and no right rail** (2026-09-12) — wires stop at a coil's outer arc (32 from
  centre, not 16). The right rail is gone, matching ISPSoft.
- **Rule 7 at placement** (2026-09-12) — a coil on a leg of a block that rejoins is refused.
  The structural checker now feeds the Problems panel live.
- **Selection after a delete** — lands on the left neighbour, or a trailing slot with a caret.
- **Edge contacts drawn dead** — confirmed through wire colour tokens.

### For 0.2.0 (2026-09-16 to 09-18)

- **Legality extraction** — no behaviour change: the 124 earlier tests passed untouched, and in
  the app the rule 6 and rule 7 refusals and an ordinary insert behaved as before.
- **Pointer zones** — lower band gives `s-resize` and the down-arrow, the upper halves the side
  line. Branching below a contact that is a whole block line added a level (rule 3 holds). A
  contact below a coil is refused; a coil below a coil branches.
- **Zoom** — zones read correctly at **150%** and **60%**, including the points that only pass
  if the pointer offset is converted to a fraction of the cell rather than compared in pixels.
- **Preview** — with a coil armed, outlines only on existing outputs and the unfinished rung.
  Ghosts land on the column edge for an insert, one row down for a branch, centred in a slot.
  Refused hovers give the sentence and `not-allowed`; allowed hovers leave the status bar alone.
  The tool stays armed after a click and the outlines rebuild; Escape and online mode clear
  them. The toolbar branch command previews every zone as a branch.
- **Undo and delete with a tool armed** — the preview table tracks the tree through both.
- **Contrast** — preview outlines and ghosts measured **3.71:1** (dark) and **3.40:1** (light)
  against the canvas, after raising them from ~2:1.
- **980×640** — unchanged: no overflow, every region present, preview live.
- **Function blocks off** — no block in the seed; the toolbar button, F9 on its own and F9 with
  NC armed all give the sentence (NC stays armed); library items neither drag nor highlight;
  the MotorStarter tab shows its empty state.
- **`main` after the merges** — byte-identical to the verified stage 4 commit; all checks pass.

**Light theme** — seen for the first time on 2026-09-17 in screenshots, and the rest of the IDE
looked right in it. Only the preview was measured; a human look over the whole palette is still
worth doing.

**Unreproduced:** a `Prog0` editor tab disappeared once during early testing, most likely a
stale reference in test driving. Not proven clean.

## 5. Corrections already made — the pattern to avoid

Three rounds of user-reported defects shared one root cause: **building from the handoff
README's prose instead of the prototype's data structures.**

1. **Round one** — a toolbar with an invented "horizontal wire" tool, a missing "Delete
   element" button, and Local Symbols docked below the canvas. Also wrong: toolbar row
   assignment, P/N/S/R variant overlays absent, button size, group separators, menu contents
   padded with inventions, and a dot grid where the design uses a 16px line grid.
2. **Round two** — commands dispatched with no handler, so buttons silently reported "not
   implemented". Found by auditing every dispatched id against the handled cases. That audit is
   worth re-running after any config change:

   ```bash
   grep -ohE "cmd: '[a-z.]+'" src/ui/features/toolbar/toolbarConfig.ts | sed "s/cmd: //" | tr -d "'" | sort -u
   grep -ohE "case '[a-z.]+'" src/ui/features/menu-bar/commands.ts | sed "s/case //" | tr -d "'" | sort -u
   ```

3. **Round three** — the message panel: Compile was stacked instead of a two-column split,
   Problems had five columns instead of four, Search Results had the wrong columns entirely,
   tab badges and build summary were missing, and the collapsed rail did not exist.

The lesson is in CLAUDE.md rule 1. Read the prototype.

A fourth round was caught **before** merge rather than reported: the pre-merge checks for 0.2.0
found a malformed block from branching with the FB tool, preview outlines too faint in both
themes, and an ambiguous function block ghost — all passing 237 tests at the time. The same
checks also surfaced two controls that pretended to work (a library drag with no drop handler,
and function block tabs that edited Prog0). **Tests do not see the React layer. Drive zoom,
both themes, every tool and 980×640 before calling UI work done.**

## 6. Deliberate divergences from the design

Each is a considered choice, not an oversight. Revisit if the user disagrees.

- **F4 / Shift+F4 conflict.** The design assigns these to both the edge contacts (LADDER) and
  error navigation (COMPILE). The contacts keep them, because F2–F9 form one continuous
  placement run; the error buttons now advertise no shortcut. **The user has not ruled on this.**
- **SVG `<text>` instead of overlaid divs.** One SVG element scales with zoom and keeps layout
  pure.
- **Ladder geometry follows ISPSoft, not the prototype.** A coil is drawn where its own logic
  ends rather than in one aligned column. The prototype still governs every other region.
- **Refusals explain themselves.** ISPSoft refuses silently; we give a sentence, on hover as
  well as on click.
- **Function blocks hidden.** The toolbar button, F9 and the library remain visible but explain
  that blocks are being redesigned. Function block tabs show an empty state.
- **View → Comments and View → Panels actually work.** The prototype only flashes a message.
- **Undo/redo implemented.** The design's status text references Ctrl+Z, so it was made real.

## 7. Gaps, in priority order

1. **Nothing persists — deliberately.** A page reload throws away whatever was drawn.
   `io/storage/` stays an empty stub until the backend's project model exists. **Do not add a
   browser-local save.**
2. **Function blocks** — switched off. The redesign needs: interfaces (pins) for standard, XP
   library and user-defined blocks in one format; En/Eno carrying the rung; a height that grows
   with the pins and counts in the layout (a block in a branch currently overlaps the row below,
   and its preset label is clipped in column 0); instances declared in the symbol table; an
   operand per pin. User-defined blocks also need **per-POU networks**, which belong with the
   project model. See §8 for what is waiting on the user.
3. **Canvas redraws everything on every pointer zone change.** Measured ~100 ms per change at
   40 rungs (≈4,200 SVG elements, development build, hidden pane). Not the preview — it costs
   the same with nothing armed. Fix: render the static drawing in its own memoised component so
   hovering only redraws the hit layer and ghost. Do before function blocks make it heavier.
4. **No CI.** Nothing runs the checks on GitHub; a PR can be merged red. A workflow running
   typecheck, lint, tests and build on every PR was proposed and is awaiting the user's yes.
5. **Test coverage stops short of the React layer.** Everything visual rests on driving the
   browser.
6. **Backend does not exist.** No Django project, no diagnostic registry, no codegen.
7. **Firmware does not exist.** No PlatformIO project, no C++ IEC runtime.
8. **Undesigned surfaces** — Structured Text editor, Monitor Chart, a fully specified Hardware
   Configuration modal, and now the function block editor. Labelled empty states.
9. **Diagnostic registry not generated.** ADR-001 specifies
   `backend/compiler/diagnostics/registry.yaml` as the single authority with a generated
   `codes.generated.ts`. `core/diagnostics/codes.ts` is a hand-written stand-in.
10. **No MPS bifurcation tool.** Deferred 2026-09-12. The output block produces what MPS
    produces; ISPSoft's separate tool is missing. The preview it would need already exists.
11. **Leftover scaffold barrels** exporting nothing: `ui/features/compiler/components/index.ts`,
    `ui/features/monitoring/components/index.ts`, and several `components/index.ts` stubs.
12. **Two handoff folders** differing by one line. `Design feedback needed/` is superseded by
    `Design feedback needed canvas updated/`.

## 8. Open questions

### Blocking the backend

1. ~~Standalone, or an app inside a platform backend?~~ **Answered 2026-09-16: standalone.**
2. **How does auth arrive from the launcher?** A JWT or session cookie that ESP-Flow's DRF
   validates, or does ESP-Flow authenticate independently?
3. ~~Does ESP-Flow's data hang off a platform-level project entity?~~ **Answered 2026-09-16: no.**
4. **Database** — SQLite to start, or Postgres/MySQL from day one? (`soft-plc web ide.md`
   mentions MySQL.)
5. **Where do PlatformIO builds run** — same host as Django, or a separate worker? Decides
   whether Celery comes in immediately.

### Blocking the function block proposal

6. **Evidence from ISPSoft**, requested 2026-09-18: the symbol table of `DFB_CompPower` (how pins
   are declared), a TON placed on a rung (does the rung enter En or IN?), and a block inside a
   parallel branch (how the rows below move).
7. **En/Eno** — follow ISPSoft (power in through En, out through Eno) or the other IEC tradition
   (rung into a timer's IN, continuing from Q)? The standing rule says ISPSoft; confirm, since it
   changes how a timer reads.

### Smaller

8. **CI** — add the GitHub Actions workflow (§7.4)?
9. Should the title bar carry an app-launcher affordance, or does the platform shell wrap
   ESP-Flow in its own header?
10. Delete the superseded handoff folder?
11. The F4 / Shift+F4 ruling in §6.

## 9. Suggested next steps

In order:

1. **CI**, if the user agrees — small, and protects every PR after it.
2. **Function block proposal** — a written design, agreed before code, as outputs-in-the-rung
   was. Needs §8.6. Covers the strategy already discussed: one interface format for standard, XP
   library and user blocks; the canvas draws any block from its interface; library interfaces
   published by the backend as data; user blocks wait for per-POU networks.
3. **Canvas redraw performance** (§7.3) — before function blocks land.
4. **Function blocks, phases 1–2** — draw any library block from its interface, instances and
   operands. Frontend only.

Then the bigger fork:

- **Backend** — needs §8.2, §8.4, §8.5. Order: Django skeleton → diagnostic registry +
  generator → project/POU models (with per-POU networks) → PLCopen XML → codegen → PlatformIO.
- **Firmware** — the C++ IEC runtime (process image, four-phase scan cycle, standard function
  blocks) needs none of the open answers and could start now.
