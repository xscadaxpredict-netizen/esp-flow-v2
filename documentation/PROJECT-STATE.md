# ESP-Flow — Project State

**As of 2026-09-16.** Written as a handoff so a new session can continue without re-deriving
context. Read [CLAUDE.md](claude/context%20window%20memory/CLAUDE.md) first for the hard rules; this document covers what
exists, what was decided and why, what is verified, and what is still open.

---

## 1. Where the project stands

| Area | State |
|---|---|
| `frontend/` | **Editor shell complete and running.** All 12 regions, ladder model live. |
| `backend/` | **Empty directory.** Django project not started. |
| `firmware/` | **Empty directory.** No PlatformIO project, no C++ runtime. |
| `documentation/` | Primer, ADR-001, design handoffs, ladder rules, frontend architecture. |

The whole repository — frontend, backend, firmware, documentation — is under git and pushed to
`github.com/xscadaxpredict-netizen/esp-flow-v2` on `main`. Current release **0.1.0**, tagged
`v0.1.0`. Empty `backend/` and `firmware/` folders do not appear on GitHub until they hold a file.

## 2. Decisions already made

Do not relitigate these without new information. Each was chosen deliberately.

| Decision | Choice | Reasoning |
|---|---|---|
| Execution model | **Transpile to C++, rebuild firmware with PlatformIO per download** | User chose this over an on-device bytecode VM after the trade-offs were laid out. Accepted cost: a 20–60 s edit→run loop and no online editing. Mitigation: the Compile panel shows real staged progress. |
| Compilation location | **Server-side (Django)** | Owns parsing, checks, codegen, toolchain. |
| Language priority | **LD first**, then ST, FBD, SFC/IL | |
| Frontend | React 18 + TS + Vite + Zustand + CSS Modules | |
| Backend | **Django + DRF + Channels** | User overrode a Node/TS suggestion. The platform is Django, so shared auth and one deployment story outweigh sharing compiler code across runtimes. ADR-001 is what makes that safe. |
| Flashing | Server builds the `.bin`; **browser flashes over Web Serial** (esptool-js) | A server cannot reach the USB port on the engineer's desk. |
| Live monitoring | **WebSockets** (Django Channels), ~10 Hz | |
| Project format | Normalised Django models + JSON POU bodies; **PLCopen XML** import/export | |
| Targets | All ESP32 families; **Arduino framework first**, ESP-IDF later | |
| Styling | CSS custom properties + CSS Modules | The design is exact-pixel and radius-0. |
| Undesigned areas | Labelled empty states, nothing invented | |
| Minimum viewport | **980×640** | The README's stricter figure, over the Layout Guide's 1440×900. |
| Versioning | **One product version in lockstep**, root `VERSION` is the source of truth | Browser, Python compiler and ESP32 runtime must agree on diagnostic codes and generated C++; separate versions would need a compatibility table. `0.x` until compile-and-flash works. |
| Ladder canvas geometry | **ISPSoft wins over the prototype** | Decided 2026-09-12. Outputs sit where their logic ends; no right rail. The prototype still governs every other region. |
| Backend scope | **Standalone — ESP-Flow owns its own backend** | Decided 2026-09-16. Project creation and configuration happen inside ESP-Flow. The launcher authenticates the user and opens the app; it is not a project owner and holds no ESP-Flow data. |
| Persistence | **None in the browser — wait for the backend** | Decided 2026-09-16. A browser-local stopgap would model a project twice and be thrown away. The project model is designed once, with the database. |

## 3. What the frontend contains

### Domain — `frontend/src/core/`

The valuable part. Framework-free and portable.

- `models/` — `ladderNode.ts` (element / series / parallel / `NodePath`), `network.ts`,
  `symbolDecl.ts` (IEC variable declarations), `diagnostic.ts` (ADR-001 shape),
  `selection.ts`, `board.ts`.
- `ladder/` — `builders.ts`, `span.ts` (intrinsic width/height), `shape.ts` (does a line end in
  an output), `path.ts` (`nodeAt`, clone, `pathOfElement`),
  `mutations.ts` (place, append, branch, delete with pruning, network ops, symbol binding),
  `evaluate.ts` (power flow: series AND, parallel OR), **`layout.ts`** (pure geometry →
  draw lists; canvas metrics `CW 116, CH 78, X0 76, RAIL_L 56, RIGHT_PAD 40, MINCOLS 6`).
- `rules/structural.ts` — the browser's only validation, `STR-` codes.
- `data/seed.ts` — the bottling-line example: 4 networks, 11 symbols, live values, compiler
  diagnostics, build stages, build log, cross-reference rows. **Delete this when the backend
  lands; do not extend it.**

### Application — `frontend/src/services/store/`

Four Zustand slices: `useLadderStore` (networks, selection, armed tool, branch arm, undo/redo
with a 50-step history), `useUIStore` (theme, mode, panel geometry, collapse flags, overlays,
status message), `useProjectStore` (tabs, tree expansion, symbols, board), `useCompileStore`
(build staging, log reveal, problems, filters).

`services/useCases/*` and `services/mappers/` are still scaffold stubs.

### Presentation — `frontend/src/ui/`

Twelve region slices matching the design: `title-bar`, `menu-bar`, `toolbar`, `project-tree`,
`editor-tabs`, `breadcrumb`, `symbols-table`, `ladder-editor`, `block-library`,
`properties-panel`, `message-panel`, `status-bar`, plus `command-palette` and
`hardware-config` overlays.

Work-area order, which the README gets wrong: **tab strip → breadcrumb → Local Symbols →
6px gripped splitter → ladder canvas**.

Shared: `Panel`, `Splitter` (with optional dotted grip), `Tooltip` + `tooltipProps`,
`EmptyState`, `ContextMenu`, `Icon` + `paths.ts` (~50 icons), `useSplitter`,
`useKeyboardShortcuts`.

### Infrastructure — `frontend/src/io/`

All four folders (`api`, `websocket`, `storage`, `config`) are **empty stubs**. Board profiles
and diagnostics are seeded locally and move behind these adapters when Django exists.

## 4. What has been verified, and how

Typecheck, lint and production build are clean. Beyond that, driven in a real browser:

- **Placement** — arming a tool and clicking a slot appends; clicking the output column is
  refused with "a contact cannot go in the output column".
- **Branch spans its parent** — branching from an element that is the whole line inside a block
  adds a level to that block instead of nesting a narrower parallel.
- **Widening is a side effect** — inserting beside that element widened the block and stretched
  every other level's filler wire.
- **Pruning deletion** — removing an emptied level dropped it; removing the second level
  collapsed the parallel back into the parent series, leaving a flat rung.
- **Slot resolution** — built the genuine collision (block as last child), confirmed one hit
  region at the shared position, and confirmed the element landed in the root series after the
  block. Row-0 hits went `84, 200, 782` → `84, 200, 316, 782`; row-1 kept no filler slot.
- **Online monitoring** — conducting path green with heavier strokes, dead paths dimmed, live
  values beside elements, forced variable in red, editing disabled.
- **980×640 floor** — rows total exactly 640 (title 26, menu 24, toolbar 57, middle 357,
  splitter 4, dock 150, status 22); columns 238 / 438 / 296; no horizontal overflow.
- **Message panel** — all three tabs and both panel states.
- **Outputs inside the rung** (2026-09-12) — the seeded rung with two outputs draws its coils in
  different columns, each running on to the right rail, with one opening node and no rejoin
  node. Clicking a coil selects it as an ordinary element and Properties shows it. Placing a
  contact after a coil is refused with the rule-6 sentence. Branching a coil adds a second
  output leg. In monitor mode the fill-valve leg was green and the edge-contact leg dead, in
  the same rung. A rung with no output says so and runs an open wire to the rail.
- **980x640 after the output change** — no horizontal overflow, every region still present.
- **Coil spacing and the right rail** (2026-09-12) — reported as outputs looking overlapped on
  branch legs. Measured in the running canvas: a coil is two arcs bulging out to 32 from its
  centre, and the wire feeding it stopped at 16, so it was drawn straight through the glyph.
  Wires now stop at 32, confirmed in the DOM. The right rail was removed on request, matching
  ISPSoft. Both are pinned by tests.
- **Rule 7 enforced at placement** (2026-09-12) — reported from a screenshot: a coil could be
  dropped into one leg of a block that rejoins, stranding an output mid-rung. Arming a coil and
  clicking a contact in such a leg is now refused in the running app. Found alongside it: the
  structural checker had never been wired to the Problems panel, so nothing warned either. The
  panel now shows a live browser diagnostic beside the seeded compiler ones.
- **Selection after a delete** — reads back from the canvas selection handles. Deleting the
  middle of a three-contact row landed on the contact to its left (x 84, not the old last-item
  x 200); deleting a contact whose left neighbour is a block, the only contact in a rung, a
  level that collapsed its block, and a rung's only output all landed on a trailing slot with a
  caret, where the old code left the ring nowhere.
- **Edge contacts drawn dead** — with the edge symbol temporarily raised to 1 in the seed, the
  rung's output wire stayed `var(--dead)` while a normal-contact rung beside it stayed
  `var(--green)`. Seed value reverted afterwards.

**Verified only through the DOM, not visually:** the light theme. The Browser pane returned
stale frames; token values and `data-theme` were confirmed correct and persisted via
`localStorage`, but the palette has never been eyeballed. Worth a human look.

**Unreproduced:** during testing a `Prog0` editor tab disappeared once. With freshly resolved
element references neither candidate action removed a tab, so it was most likely a stale
reference in test driving rather than an app defect. Not proven clean.

## 5. Corrections already made — the pattern to avoid

Three rounds of user-reported defects, all the same root cause: **building from the handoff
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

## 6. Deliberate divergences from the design

Each is a considered choice, not an oversight. Revisit if the user disagrees.

- **F4 / Shift+F4 conflict.** The design assigns these to both the edge contacts (LADDER) and
  error navigation (COMPILE). The contacts keep them, because F2–F9 form one continuous
  placement run; the error buttons now advertise no shortcut. **The user has not ruled on this.**
- **SVG `<text>` instead of overlaid divs.** The prototype positions canvas labels as absolutely
  placed HTML over the SVG. One SVG element scales with zoom and keeps layout pure.
- **Ladder geometry follows ISPSoft, not the prototype.** Ruled 2026-09-12 when outputs moved
  into the tree: a coil is drawn where its own logic ends rather than in one aligned column, so
  every rung's output moved left. The prototype still governs every other region.
- **Function-block power flow.** The prototype's `passes` returns false for both edge contacts
  and function blocks. Edge contacts no longer diverge — as of 2026-09-12 they are drawn dead,
  matching the prototype, because only the device can tell a firing scan from a held one. A
  function block still evaluates from the symbol value, since a block instance has a reported
  output where an edge contact has no symbol of its own.
- **View → Comments and View → Panels actually work.** The prototype only flashes a message.
- **Undo/redo implemented.** The design's status text references Ctrl+Z, so it was made real.

## 7. Gaps, in priority order

1. **Nothing persists — deliberately.** Networks come from the seed data every time the app
   loads, so a page reload throws away whatever was drawn. `io/storage/` stays an empty stub.
   Decided 2026-09-16: persistence waits for the backend, where the project model is designed
   once and saved to the database. **Do not add a browser-local save.**
2. **Test coverage stops at the domain layer.** Vitest landed 2026-09-12 and now holds 124 cases
   over `core/ladder/`, `core/rules/`, the undo stack and the live structural diagnostics, each citing the rule it protects. Their
   bite was checked by breaking rule 1 and rule 5 on purpose and confirming the right tests
   failed. Nothing covers `services/useCases/`, the React layer, or anything about how the
   editor looks — those still rest entirely on driving the browser.
3. **Backend does not exist.** No Django project, no diagnostic registry, no codegen.
4. **Firmware does not exist.** No PlatformIO project, no C++ IEC runtime (`TON`, `CTU`,
   scan cycle, process image, retentive memory).
5. **Undesigned surfaces** — Structured Text editor, Monitor Chart, and a fully specified
   Hardware Configuration modal. Currently labelled empty states.
6. **Diagnostic registry not generated.** ADR-001 specifies
   `backend/compiler/diagnostics/registry.yaml` as the single authority with a generated
   `codes.generated.ts` and a CI check that no `SEM-` code is emitted from TypeScript.
   `core/diagnostics/codes.ts` is a hand-written stand-in.
7. **No MPS bifurcation tool.** Deferred 2026-09-12. The output block already produces what MPS
   produces; missing is ISPSoft's separate tool and its habit of showing legal positions before
   the click. See `reference/rules/ispsoft-behaviour.md`.
8. **Leftover scaffold barrels** exporting nothing: `ui/features/compiler/components/index.ts`
   (superseded by `message-panel`), `ui/features/monitoring/components/index.ts`, and several
   `components/index.ts` stubs inside slices that now export from the slice barrel.
9. **Two handoff folders** differing by one line. `Design feedback needed/` is superseded by
   `Design feedback needed canvas updated/`. Someone will read the wrong one.

## 8. Open questions the user has not answered

These block backend work. They were asked and are still outstanding.

1. ~~Standalone Django project, or an app inside a platform backend?~~ **Answered 2026-09-16:
   standalone.** ESP-Flow has its own backend, and projects are created and configured inside the
   app, so the Django model roots are ESP-Flow's own.
2. **How does auth arrive from the launcher?** Still open, and now the only launcher contract
   that matters. The launcher logs the user in and opens the app — does it hand over a JWT or a
   session cookie that ESP-Flow's DRF validates, or does ESP-Flow authenticate independently?
3. ~~Does ESP-Flow's data hang off a platform-level project entity?~~ **Answered 2026-09-16: no.**
   The project entity belongs to ESP-Flow.
4. **Database** — SQLite to start, or Postgres/MySQL from day one? (`soft-plc web ide.md`
   mentions MySQL.)
5. **Where do PlatformIO builds run** — same host as Django, or a separate worker? Decides
   whether Celery comes in immediately.

Smaller, also open:

6. Should the title bar carry an app-launcher affordance, or does the platform shell already
   wrap ESP-Flow in its own header? Currently ESP-Flow draws one, which may be duplicated.
7. Delete the superseded handoff folder?
8. The F4 / Shift+F4 ruling in §6.

## 9. Suggested next steps

If continuing the frontend: outputs inside the rung are built (rules 6 and 7), so the canvas
matches ISPSoft on placement. Persistence is settled (§7.1), leaving two, taken as one piece of
work: show legal positions before a click rather than refusing after it, and let pointer position
decide series or parallel so branching needs no arming step. MPS comes after those.

If moving to the backend: the scope question is settled — a standalone Django project owning its
own projects. Auth (§8.2), the database choice (§8.4) and where PlatformIO builds run (§8.5) are
still needed. The order is Django project skeleton → diagnostic registry + generator →
project/POU models → PLCopen XML → codegen → PlatformIO orchestration.

If moving to firmware: the C++ IEC runtime library is independent of the open questions and
could start now — process image, four-phase scan cycle, and the standard function blocks from
the primer's §3.5.
