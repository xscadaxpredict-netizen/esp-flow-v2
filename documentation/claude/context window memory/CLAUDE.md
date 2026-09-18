# ESP-Flow

A browser-based **IEC 61131-3 Ladder Diagram IDE for ESP32**, modelled on Delta's ISPSoft.
The user writes ladder logic, it transpiles to C++, PlatformIO builds firmware, the browser
flashes it over Web Serial, and the running controller is monitored live.

ESP-Flow is **not standalone**. It launches from an in-house platform app launcher alongside
FUXA (SCADA), Process Integrator, and BI. The user arrives already authenticated with a
project open — there is no login screen and no marketing surface.

New to the domain? Read [documentation/reference/iec-61131-3-primer.md](documentation/reference/iec-61131-3-primer.md)
first. It explains scan cycles, POUs, variables vs. symbols vs. devices, and tasks from zero.

Current state, what is built, and open questions:
**[documentation/PROJECT-STATE.md](documentation/PROJECT-STATE.md)** — read this before starting work.

This file is **not** at the project root on purpose. It is injected into every session by the
`SessionStart` hook in `.claude/settings.json`, which runs `.claude/hooks/load-project-context.mjs`.
Moving it to the root would duplicate it; renaming or relocating it means editing that script.

---

## Hard rules

### 1. The design prototype governs, never its README

The authoritative UI reference is the **latest** handoff folder under `documentation/`.
As of 2026-09-10 that is:

```
documentation/Design feedback needed canvas updated/design_handoff_espflow_ide/
```

`ESP-Flow IDE.dc.html` is the authority. **Its README contradicts it in places and has already
caused two rounds of rework.** Read the data structures in the prototype, not the prose:

| Question | Read this in `ESP-Flow IDE.dc.html` |
|---|---|
| Toolbar groups, buttons, order, shortcuts | the `G` array and `toolRows` |
| Menu contents | `MITEMS` |
| Project tree nodes | `TR` |
| Theme tokens | `DARK` / `LIGHT` objects |
| Icon paths | the `ICON` map |
| Region order and sizing | the markup itself |

Known README errors: it places Local Symbols *below* the canvas (the prototype puts it above,
directly under the breadcrumb) and describes toolbar groupings that differ from `G`.

The user drops a **new folder per design revision**. Always check for a newer one and `diff`
it against the previous before assuming anything.

### 2. ADR-001 — the compiler boundary

Full text: [documentation/architecture/adr/ADR-001-compiler-boundary.md](documentation/architecture/adr/ADR-001-compiler-boundary.md)

> **Python owns all language semantics. The browser owns only the editor model.
> No validation rule is implemented in both runtimes.**

The test: *does answering this require knowing what a type means, what a symbol refers to, or
what the program does?* Yes → Python. No → browser.

- **Browser may do**: missing operand, empty network, output-less network, duplicate GPIO,
  grid/branch integrity. Codes are prefixed `STR-`.
- **Browser must never do**: type inference, symbol resolution, AST construction, double-coil
  detection, ST parsing. Those are `SEM-` / `TYP-` / `CFG-` / `GEN-` and belong to Python.
- **Share data, not code.** Identifier regexes, board pin lists, keyword lists are *published*
  by the backend and applied by the browser. A hardcoded ESP32 pin array in TypeScript is a
  review rejection.

`core/rules/structural.ts` and `core/diagnostics/codes.ts` hold the browser's entire share —
six `STR-` codes, two of them the shape rules that keep an output at the end of its line.

### 3. The ladder model is a series/parallel tree, never a grid

Specified in [documentation/reference/rules/LD building.txt](documentation/reference/rules/LD%20building.txt)
and implemented in `frontend/src/core/ladder/`.

- **Series** node: children left→right, logical AND. **Parallel** node: levels top→bottom,
  logical OR; every level is itself a series. **Elements** are leaves.
- **Width is intrinsic** — series sums children, parallel takes the max. Never stored, never
  bookkept (`span.ts`).
- **A branch spans exactly its parent.** If the clicked element is the whole line inside a
  block, the child joins that block as a new level and inherits its width, rather than nesting
  a narrower parallel (`mutations.ts`, `branchAt`).
- **Widening is a side effect.** Inserting into a level recomputes max width; other levels'
  filler wires stretch automatically.
- **Deletion runs the rules backwards** — remove, drop an emptied level, then collapse a
  parallel left with one level into its parent series (`mutations.ts`, `deleteAt`).
- **Outputs live in the tree.** A coil is an element that ends its line — nothing is drawn to
  its right and there is no right rail (rule 6). Several outputs are a block whose every leg
  terminates (rule 7). A coil is drawn where its own logic ends, not in a shared column —
  **ISPSoft wins over the prototype on ladder canvas geometry**, decided 2026-09-12. A coil may
  only be placed where power can reach the end of the rung (`canTerminate` in `shape.ts`).
- **Slot resolution: shallowest path wins.** Trailing slots collide when a block is the last
  child of its parent. Sort candidates by path length ascending before the hit dedupe, so the
  click means "after the block", not "inside its first level" (`layout.ts`).

**Function blocks are switched off** — `FUNCTION_BLOCKS_ENABLED` in `core/features.ts`, since 2026-09-18.
The drawable block was a hard-coded TON that did not follow ISPSoft. The element type, its layout
and its tests remain; only creation is closed. Do not re-enable piecemeal — the redesign starts
from a written proposal, as outputs-in-the-rung did.

`core/ladder/layout.ts` is **pure geometry** — it takes networks and returns draw lists, emits
colours as `var(--token)` strings, and imports nothing from React. Keep it that way: it is what
makes the canvas component thin and the branching rules testable.

### 4. Layer names on disk are deliberate — do not "correct" them

`documentation/architecture/frontend_architecture.md` uses Clean Architecture's standard names;
the folders use the documented alternatives (see `documentation/architecture/layers names.png`):

| On disk | Means | Rule |
|---|---|---|
| `core/` | domain | Zero framework imports. Pure TypeScript. |
| `services/` | application | Zustand slices + use cases. |
| `ui/` | presentation | React, CSS Modules. |
| `io/` | infrastructure | HTTP, WebSocket, storage. Currently all stubs. |

Dependencies point **inward only**. `services/` must not import from `ui/`.

---

## Stack

React 18 + TypeScript + Vite. Zustand for state. **CSS custom properties + CSS Modules** for
styling. No CSS framework.

Deliberately removed — do not reintroduce without a reason:

| Package | Why removed |
|---|---|
| `tailwindcss`, `@tailwindcss/vite` | Never wired into `vite.config.ts`. The design is exact-pixel and radius-0; utilities would be arbitrary values throughout. |
| `@xyflow/react` | The canvas is hand-drawn SVG from `layout.ts`. Nothing used it. Reconsider only if FBD needs a node editor. |
| `lucide-react` | The design ships its own 16×16 line-art icon set, transcribed into `ui/shared/icons/paths.ts`. |

Backend will be **Django + DRF + Channels**, with Celery for PlatformIO builds. Not started.

## Conventions

- **No literal colours in components.** Every colour comes from a token in
  `ui/styles/tokens.css`. Dark is default on `:root`; light is `:root[data-theme="light"]`.
- **Radius 0 everywhere**, with one deliberate exception: toolbar buttons are 24px square with
  a 2px radius, as the design specifies.
- **Fonts**: IBM Plex Sans for UI, IBM Plex Mono for addresses, values, shortcuts, log output.
- **One command dispatcher.** Every menu item, toolbar button and palette entry routes through
  `runCommand(id)` in `ui/features/menu-bar/commands.ts`, so a command behaves identically
  wherever invoked. Adding a button means adding a case — an unhandled id falls through to a
  message naming it.
- **Status messages must be honest.** Anything needing the backend or a device says so plainly.
  Never let a control look functional when it is not. Two rounds of user-reported bugs were
  exactly this class of defect.
- **Feature slices**: `ui/features/<region>/components/` plus a barrel. One slice per region.
- **Overlay keys go on `window`**, not on element `onKeyDown` — see the command palette.
- **One version for the whole product, in lockstep.** The root `VERSION` file is the source of
  truth; `frontend/package.json` (and later `backend/pyproject.toml` and a firmware build flag)
  mirror it. Browser, compiler and ESP32 runtime must agree, so they never version separately.
  A release bumps `VERSION` and every manifest, adds a `CHANGELOG.md` section, and gets an
  annotated `vX.Y.Z` tag. Stay on `0.x` until a ladder program compiles and flashes.

## Commands

```bash
cd frontend && npm run dev        # Vite dev server on :5173
cd frontend && npm run typecheck  # tsc --noEmit
cd frontend && npm run lint       # eslint, expected 0 problems
cd frontend && npm run build      # tsc -b && vite build
cd frontend && npm test           # vitest run, 124 tests
```

`.claude/launch.json` defines the `esp-flow-frontend` preview server for the Browser pane.

**All five must be clean before reporting work done.** The suite covers `core/ladder/` and the
undo stack, and every case cites the rule it protects. It does not cover React, CSS or how
anything looks — those still need the browser.

## Verification expectations

The user builds this as a serious product and has caught real defects in delivered work.
Do not report a UI change as done on a typecheck alone:

1. Drive the running app in the browser and confirm the behaviour.
2. For ladder changes, exercise the rules: place, branch, insert beside a branch to widen it,
   delete to collapse a one-level parallel.
3. Check both themes and both modes (`edit` / `online`).
4. Resize to **980×640** — every region must remain present with no horizontal scrollbar.
5. Compare side by side with the prototype: open `ESP-Flow IDE.dc.html` directly in a browser.

Note: the Browser pane sometimes returns **stale screenshot frames**. When a screenshot
contradicts expectations, verify through the DOM with `javascript_tool` before concluding
anything is broken.
