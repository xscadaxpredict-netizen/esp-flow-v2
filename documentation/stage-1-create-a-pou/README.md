# Handoff — Stage 1: Create a POU

Agreed design for adding a Program or Function Block to an ESP-Flow project, and editing an
existing POU's properties. Authority for these screens, per brief `brief-pou-task-symbols.md`
§Stage 1 (included in this folder).

## About the design file
`ESP-Flow Stage 1 POU.dc.html` is a **design reference** — an HTML canvas holding nine
artboards side by side. It is not production code. Recreate these screens in the target
codebase using its own framework, component library and styling layer. The prototype is written
with inline styles and CSS custom properties purely so it renders standalone; do not carry that
approach over.

Open the file in a browser. Each artboard carries a visible id badge (1a…1i).

## Fidelity
**High.** Colours, type, sizes, states, copy and error wording are final. The ladder pictures
inside the IDE frames are the **as-built** renders (`assets/ladder-*.svg`) — the IDE prototype's
ladder is out of date and must not be used as reference.

## The artboards

| id | Screen | Notes |
|---|---|---|
| 1a | Project tree with **Programs** right-clicked | The folder context menu. Does not exist today. |
| 1b | New Program dialog, empty, focus in Name | Suggested default `Prog2`, Create disabled |
| 1c | **Main artboard (dark)** — dialog filled and valid over the full IDE | 980×640 |
| 1d | Invalid name — disallowed characters | |
| 1e | Invalid name — already in use | |
| 1f | New Function Block dialog | No Task, no Active |
| 1g | Program Properties — Language locked | |
| 1h | After OK — POU in the tree, open in its tab | Empty ladder + empty symbol table |
| 1i | **Main artboard (light)** — same state as 1c | 980×640 |

## Frames and sizing
- Every IDE frame is exactly **980×640** — the minimum supported window. Nothing scrolls
  horizontally at that size.
- IDE regions in these artboards: menu bar 24px · toolbar 44px (two rows) · left tree 206px ·
  right panel 212px · editor tab strip 24px · breadcrumb 20px · local symbols 96px ·
  bottom dock collapsed to a 22px tab bar · status bar 22px.
- Dialogs are **440px wide**, height driven by content, centred horizontally and pinned 88px
  from the top of the window. Scrim `rgba(0,0,0,.42)`.
- **Square corners everywhere.** No radius on any element.

## Dialog frame
Taken unchanged from the Hardware Configuration modal:
- Title bar 28px, `--head` background, 1px `--bord` bottom border. Title `600 11.5px` IBM Plex
  Sans; a mono sub-label beside it giving the context path (`BottlingLine_v3 · Programs`);
  a ✕ at the right.
- Body: 14px padding, fields in an 11px-gap column. Each field is a
  `92px | 1fr` grid — label left, control plus its message right.
- Footer: 1px `--bord` top border, 12/14px padding, keyboard hint on the left
  ("Enter confirms · Esc cancels"), then **Cancel** (secondary), then the primary action.
- Buttons 24px tall, 14px horizontal padding.

## The context menu (artboard 1a)
Right-clicking the **Programs** folder opens, in this order:

1. **New Program…**
2. — separator —
3. **Task Property…**
4. — separator —
5. **Export Program…** — marked *not yet*
6. **Import Program…** — marked *not yet*

Menu panel: 216px wide, `--panel2` background, 1px `--bord2` border,
`0 10px 26px var(--shadow)`, rows 22px, 9px horizontal padding, 11.5px IBM Plex Sans. The
hovered/armed row takes `--accs`. An unavailable row is `--dead` text with a right-aligned
`not yet` tag in 9.5px IBM Plex Mono, `--amber` — **shown, never hidden, never clickable-dead.**

The right-clicked tree node stays visibly targeted while the menu is open: `--selbg` fill and a
1px dashed `--acc` outline.

Right-clicking **Function Blocks** uses the same menu with **New Function Block…** in place of
New Program… (Task Property does not apply to a folder of blocks).

## Fields

| Field | Program | Function block | Behaviour |
|---|---|---|---|
| Name | ✓ | ✓ | Required. Pre-filled with a suggestion (`Prog2`, `FB1`), selected, focused. Mono. |
| Language | ✓ | ✓ | Segmented control. **LD** selected; ST, FBD, IL present and marked *not yet*. Fixed after creation. |
| Task | ✓ | — | Select. May be left empty — see Decisions. |
| Active | ✓ | — | Checkbox, ticked by default. Unticked = kept but skipped when compiling. |
| Comment | ✓ | ✓ | Optional free text, 46px tall. |

The kind of POU is fixed by where the dialog was opened and is stated in the title. It is not
switchable inside the dialog.

## Input states
All four design-system states appear in the artboards:

- **default** — `--input` background, 1px `--bord2` border
- **focused** — 1px `--acc` border plus a 2px `--accs` outer ring (1b, 1c Name)
- **invalid** — 1px `--red` border plus a 2px `rgba(240,101,92,.16)` ring (1d, 1e)
- **disabled / locked** — `--panel` background, `--dead` text, 65% opacity (1g Language)

Inputs are 22px tall, 7px horizontal padding, values in IBM Plex Mono 11.5px.

## Errors — written, never a red border alone
Every message sits **directly under its field**, in the same grid column as the control, 10.5px
IBM Plex Sans. A valid or neutral message is `--tx3`; an error is `--red`, prefixed with a ⚠ and
laid out as a 5px-gap flex row so the text block aligns under itself, not under the glyph.

The message slot is **always occupied** — when the field is fine it carries the rule, so the
dialog never changes height as the user types and the constraint is legible before failure.

Exact copy:

- Neutral (empty/suggested): "Suggested. At most 30 characters, no spaces or `* # ? \ % @`;
  single underscores, not at the end."
- Valid: "Valid. 30 characters or fewer, no spaces or `* # ? \ % @`, single underscores."
- Bad character: "Not allowed: a space and `*`. Use letters, digits and single underscores —
  `Motor_1` is valid."
- Duplicate: "A POU called `Prog1` already exists under Programs. Names are unique across the
  project."
- Language: "ST, FBD and IL are *not yet* available. Language cannot be changed after the POU
  is created."
- Language, locked (1g): "Locked — a POU's language is fixed when it is created, because its
  body cannot be translated. Create a new POU to use another language."
- Task: "A program with no task is kept but never runs; the tree marks it `unscheduled`."
- Rename (1g Name): "Renaming updates every reference on the ladder and in the cross
  reference."

## Validation ownership
Per ADR-001 the Python compiler owns what a name may be; the browser renders the verdict. The
rules quoted above are ISPSoft's, used for realistic examples only — **do not hard-code them in
the front end.** What this design fixes is *where* a message appears and *how* it reads. Wire
the field to whatever the backend returns; until a backend exists, a stub validator is fine as
long as the message surface is the one drawn here.

The primary button is disabled while the name is invalid.

## Keyboard
Focus lands in the first field (Name) with its suggested value selected. Enter confirms if the
primary action is enabled; Escape cancels. Tab moves label-order down the field list, then to
Cancel, then the primary button.

## After OK (artboard 1h)
- The POU appears in the tree under its folder, selected, with `LD · new` in the meta slot.
- A program also appears **nested under its task** in the Tasks branch.
- It opens in a new editor tab, which becomes active (2px `--acc` top border).
- The breadcrumb reads `BottlingLine_v3 / Programs / FillControl · LD · CyclicTask_10ms · Active`.
- The ladder is **empty with a labelled empty state**: "No networks yet" / "A new POU starts
  empty." / a `+ Insert network (Ctrl+I)` affordance.
- The symbol table is empty with its own line: "No symbols declared — + New symbol", and the
  panel header count reads `FillControl · 0 declared`.
- Status bar: "FillControl created · opened in a new tab".

## Decisions taken on the brief's open questions

**A program with no task is allowed.** Leaving Task empty keeps the POU compilable but
unscheduled. The tree writes `unscheduled` in `--amber` in the meta slot that otherwise carries
`LD`, and the program appears under no task in the Tasks branch. The hint under the Task field
states this before the engineer commits.

**Rename… reuses this dialog**, in its Properties form (1g), focus in Name — not in-place tree
editing. Same validation, same written reasons, one place where a name is judged. In-place
editing would need its own error surface inside a 20px tree row.

**Deferred:** the actual validity rules (backend, per ADR-001).

## Design tokens
Both themes, as CSS custom properties. Every colour in the artboards comes from these.

### Dark
```
--bg #0e1114   --panel #171b21  --panel2 #1d222a  --head #131720
--bord #2a313a --bord2 #3d4650
--tx #dde3ea   --tx2 #9aa5b1    --tx3 #6e7882
--acc #4b90d6  --accs rgba(75,144,214,.18)  --selbg #1b3350
--canv #0b0e12 --input #0b0e12  --gutter #0e1216
--red #f0655c  --green #3fd67f  --amber #e0a83c  --cmt #6f9a80
--ink #8e99a4  --dead #454e58   --shadow rgba(0,0,0,.55)
```

### Light
```
--bg #e5e8ec   --panel #f3f4f7  --panel2 #fbfbfd  --head #e9ebef
--bord #ccd2d9 --bord2 #a9b1ba
--tx #1b2126   --tx2 #525c66    --tx3 #7c858f
--acc #1a68b8  --accs rgba(26,104,184,.14)  --selbg #cadff6
--canv #fcfcfb --input #ffffff  --gutter #eef0f3
--red #c0342a  --green #0f7a41  --amber #8f5c05  --cmt #3f7a58
--ink #414b55  --dead #aab2ba   --shadow rgba(0,0,0,.22)
```

Primary button text is `#fff` on `--acc` in both themes.

## Typography
- **IBM Plex Sans** — UI text. 11.5px dialog body and menu rows, 11px panel/tab text, 10.5px
  field messages and table cells, 10px status bar. Weight 400; 500 for active tabs and primary
  buttons; 600 for panel headers and dialog titles.
- **IBM Plex Mono** — identifiers, addresses, data types, values, shortcuts, the `not yet` tag,
  the context sub-label. 11.5px in inputs, 10–10.5px elsewhere.
- Panel header labels are uppercase with `.04em` letter-spacing.

## Assets
- `assets/ladder-dark.svg`, `assets/ladder-light.svg` — the as-built ladder renders shown inside
  the IDE frames. In the artboards they are placed at natural size (856×688) and scaled 0.6 in
  a clipped container. In production the real canvas renders here; these are reference pictures
  only.
- No other images. Icons are inline SVG, 16×16 viewBox, `fill:none`, `stroke:currentColor`,
  1.4 stroke width — the same set catalogued in the ESP-Flow Design System canvas.

## Prerequisite for building
From the brief: **every POU needs its own ladder.** The application currently holds one list of
networks for the whole project, which is why function-block tabs show an empty state. Stage 1
cannot be built until each POU owns its networks. In memory is enough — persistence waits for
the backend.

## Not in this stage
Task Manager (stage 2), symbol editing (stage 3), Function POUs, SFC, Structured Text editing,
POU passwords, online editing, placing function blocks on the ladder, and saving.
