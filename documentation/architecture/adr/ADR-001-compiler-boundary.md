# ADR-001 — Compiler Boundary: Browser vs Python

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-08 |
| **Deciders** | ESP-Flow team |
| **Supersedes** | — |
| **Related** | [frontend_architecture.md](../frontend_architecture.md), [IEC 61131-3 Primer](../../reference/iec-61131-3-primer.md) |

---

## 1. Context

ESP-Flow needs compiler-grade logic in two runtimes:

- The **browser** (React/TypeScript) needs it for live editor feedback — squiggles, symbol autocomplete, cross-references, "this rung is incomplete".
- The **Django backend** (Python) needs it for the authoritative build — validation, AST construction, C++ generation, PlatformIO invocation.

Because the backend is Python and the frontend is TypeScript, these two cannot share an implementation. Left unmanaged, the same rules get written twice in two languages by the same team, and the two copies drift. The failure is not theoretical: the editor eventually reports a program clean that the backend refuses to compile, users stop trusting live diagnostics, and the feature becomes worse than useless because it actively misleads.

This ADR fixes the boundary so that no rule is ever implemented twice.

---

## 2. Decision

> **Python is the single source of truth for all language semantics. The browser owns only the editor model.**
>
> **No validation rule may be implemented in both runtimes.**

Two supporting rules make this workable in practice:

> **Rule A — Share data, not code.** Where a rule reduces to data (a regex, a numeric range, a board's pin list, a reserved-word list), Python **publishes the data** and the browser applies it. The browser never re-encodes the rule's logic. Publishing data is not duplication; a second `if` statement is.

> **Rule B — Every diagnostic has exactly one owner.** Diagnostics are identified by a code drawn from a single registry that names the owning runtime. A code emitted from the wrong runtime is a build failure, not a code-review opinion.

---

## 3. The decision test

For any proposed validation, ask:

> **Does answering this question require knowing what a type means, what a symbol refers to, or what the program does?**

- **Yes → Python.** No exceptions.
- **No → browser.**

Worked examples:

| Question | Requires language knowledge? | Owner |
|---|---|---|
| "Does this contact have an operand assigned?" | No — the field is null or it isn't | Browser |
| "Is this operand's type `BOOL`?" | Yes — needs the symbol table and type system | Python |
| "Does this rung have an output?" | No — count the coils in the model | Browser |
| "Is this variable written by two coils?" | Yes — needs symbol resolution across POUs | Python |
| "Is GPIO 26 mapped twice in this table?" | No — duplicate detection over rows | Browser |
| "Is GPIO 26 valid on an ESP32-S3?" | Data lookup, not logic | Browser, using a **server-published board profile** |
| "Is `2Motor` a legal identifier?" | Data lookup (regex + keyword list) | Browser, using a **server-published pattern** |
| "Is `Motor` already declared in an outer scope?" | Yes — scope resolution | Python |

---

## 4. Allocation

### 4.1 Browser owns — structural rules

Answerable from the editor model alone, with zero knowledge of IEC semantics.

| Rule | Description |
|---|---|
| Incomplete element | A contact or coil with no operand assigned yet |
| Empty network | A network containing no elements |
| Output-less network | A network with logic but no coil or output block |
| Dangling branch | A vertical link that does not rejoin the power flow |
| Grid integrity | Element outside grid bounds; multi-cell block overlapping another |
| Unreachable cell | An element with no conductive path from the left rail |
| Duplicate POU name | String uniqueness within the project tree |
| Duplicate pin assignment | The same GPIO mapped to two addresses in the hardware table |
| Invalid pin for board | Checked against the **server-published board profile** |
| Identifier syntax | Checked against the **server-published identifier pattern and keyword list** |
| Unsaved-changes state | Pure UI concern |

### 4.2 Python owns — semantic rules

| Category | Rules |
|---|---|
| **Symbols** | Undefined symbol; unused symbol; scope resolution and shadowing; duplicate declaration; identifier legality against IEC rules and reserved words |
| **Types** | Operand type vs element requirement (a contact needs `BOOL`); assignment compatibility; implicit-conversion legality; literal range checks |
| **Function blocks** | Instance must be declared in the variable table; input/output pin name and type matching; dotted access validity; `EN`/`ENO` handling |
| **Ladder semantics** | Double coil (within a POU and across POUs sharing a task); write-before-read ordering hazards; feedback path detection |
| **Addressing** | `%I`/`%Q`/`%M` address validity; overlap of located variables; range vs the configured hardware; `RETAIN` memory budget |
| **POU rules** | Call-rule violations (a `FUNCTION` calling a `FUNCTION_BLOCK`); recursion detection |
| **Tasks** | Every `PROGRAM` bound to a task; interval sanity; priority conflicts; estimated scan time vs interval |
| **Structured Text** | Lexing, parsing, and all semantic analysis |
| **SFC** | Exactly one initial step; step reachability; transition condition must be `BOOL`; action qualifier legality |
| **Cross-reference** | The authoritative "where is this symbol used" index |
| **Codegen** | AST construction, constant folding, C++ emission, PlatformIO orchestration |
| **Interchange** | PLCopen XML import validation and export |

### 4.3 Exclusive artifacts

| Artifact | Runtime | Note |
|---|---|---|
| Editor model (`Network`, `GridCell`, `Instruction`) | TypeScript | The visual representation being edited |
| Editor-model manipulation (place, delete, branch, move) | TypeScript | |
| Type system | Python | **No TypeScript type-inference code, ever** |
| Symbol table resolution | Python | TS may hold a *cached copy* of the resolved table for display and autocomplete; it may not compute one |
| AST / IR | Python | TS never builds an AST |
| C++ generation | Python | |

> **Note on `frontend/src/core/`.** This folder stays. It holds the *domain model of the editor* — what a network is, what a contact is, how the grid is shaped — plus structural rules from §4.1. That is not the compiler. The ban is specific: no type inference, no symbol resolution, no AST construction in TypeScript.

---

## 5. The diagnostic contract

### 5.1 One registry, one owner per code

A single registry file is the authority:

```
backend/compiler/diagnostics/registry.yaml
```

```yaml
- code: STR-0101
  owner: browser
  severity: warning
  message: "Contact has no operand assigned."

- code: SEM-0207
  owner: server
  severity: error
  message: "Symbol '{symbol}' is not declared in any accessible scope."

- code: SEM-0311
  owner: server
  severity: error
  message: "Variable '{symbol}' is written by more than one coil."
```

Prefixes: `STR-` structural, `SEM-` semantic, `TYP-` type, `CFG-` configuration/hardware, `GEN-` codegen.

A build step generates the TypeScript view:

```
frontend/src/core/diagnostics/codes.generated.ts
```

Because a code exists exactly once and names its owner, duplication becomes mechanically detectable rather than a matter of vigilance.

### 5.2 Diagnostic shape

Identical from both runtimes, so the UI renders them through one path:

```ts
interface Diagnostic {
  code: string;                       // registry code
  severity: 'error' | 'warning' | 'info';
  message: string;                    // interpolated from the registry template
  origin: 'browser' | 'server';
  location: {
    pouId?: string;
    networkId?: string;
    row?: number;
    col?: number | 'coil';
    symbol?: string;
    line?: number;                    // ST only
    column?: number;                  // ST only
  };
}
```

### 5.3 Transport and precedence

- Structural diagnostics are computed locally on every edit and render immediately.
- Semantic validation is requested over the existing WebSocket, debounced **300 ms**, carrying a request id. Superseded requests are cancelled; late responses are discarded.
- The UI merges both sets. **Server diagnostics always win** where they overlap.
- The Build action is gated **only** by the server result. The browser never blocks a build on its own opinion, and never claims a program is valid.
- If the socket is down, the UI shows structural diagnostics with an explicit "semantic checks unavailable — not connected" indicator. It must never present that state as "no errors".

---

## 6. Enforcement

1. **Registry ownership test (CI).** Scan TypeScript sources for emitted diagnostic codes; fail the build if any has `owner: server`. Do the same in reverse for Python. This is the primary mechanical guard.
2. **Generated-file freshness (CI).** Regenerate `codes.generated.ts` and fail if it differs from the committed copy.
3. **Import boundary.** `frontend/src/core/rules/` may not import anything outside `core/models` and `core/diagnostics`. Enforced by an ESLint import rule.
4. **Review checklist.** Every PR touching validation answers: *does this TypeScript change require knowing what a type or symbol means?* If yes, it is in the wrong runtime.
5. **Board profiles and patterns are fetched, never hardcoded.** A literal ESP32 pin list or IEC keyword array in TypeScript is a review rejection under Rule A.

---

## 7. Consequences

**Positive**

- One implementation of every semantic rule; drift is structurally impossible rather than merely discouraged.
- The build result and the editor's opinion can never contradict each other, because only one of them is authoritative.
- Adding ST, FBD, and SFC later means writing one front-end each, in Python, with no TypeScript counterpart.
- The browser stays thin and fast; structural checks need no round trip.

**Negative**

- Semantic feedback carries ~300 ms of debounce plus network latency. Acceptable for squiggles; it would not be acceptable for character-by-character autocomplete, so the resolved symbol table is cached client-side for that purpose.
- Offline editing gives structural checks only.
- A code-generation step (registry → TypeScript) is now part of the build.

**Accepted trade-off**

Sharing the compiler across runtimes was the main argument for a Node backend. We chose Django because ESP-Flow ships inside a Django platform alongside FUXA, Process Integrator, and BI — shared auth, one project entity, one deployment story. This ADR is what makes that choice safe.

---

## 8. Amendment

This boundary changes only by a superseding ADR. If a future requirement genuinely demands semantic analysis in the browser — an offline mode, say — the answer is to compile the Python front-end to WebAssembly and reuse it, **not** to reimplement it in TypeScript.
