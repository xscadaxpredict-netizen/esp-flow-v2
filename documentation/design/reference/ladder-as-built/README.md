# The ladder canvas as built — release 0.2.0

**For the ladder canvas, the running app and `documentation/reference/rules/LD building.txt`
govern — not the design prototype.** The prototype's ladder (`ESP-Flow IDE.dc.html`) predates
the ISPSoft rules and is out of date: it lines every coil up in one column, draws a right power
rail, and shows a usable TON block. None of that is true any more.

These pictures are what the app draws today. Use them whenever a design artboard shows a ladder.

## How they were made

Rendered 2026-09-19 from the seed program by the app's own geometry code (`layout.ts`) and
preview code (`preview.ts`), with colours read from `ui/styles/tokens.css`. Not screenshots, so
they are exact and theme-accurate. Checked against the running app: the at-rest picture has the
same 33 wires, 31 glyphs, 41 labels and 3 junction dots, with an identical fingerprint of every
coordinate and label.

Fonts are named (IBM Plex Sans / Mono) but not embedded; a machine without them shows the
fallbacks.

| File | Shows |
|---|---|
| `01-at-rest-dark.svg` | The program as the app opens, StopButton selected |
| `02-at-rest-light.svg` | The same, light theme |
| `03-insert-preview-dark.svg` | NC contact armed, pointer on the **right half** of StopButton: dashed outlines on every position that accepts an NC, and its ghost on the column edge where it will be inserted |
| `04-branch-preview-dark.svg` | Coil armed, pointer on the **lower band** of the ConveyorMotor coil: the down-arrow and a ghost coil one row below, where the new output leg will appear |
| `05-refused-hover-dark.svg` | NO contact armed, pointer on the right of the coil: refused, so the outline is muted and there is no ghost |
| `06-insert-preview-light.svg` | Picture 03 in the light theme |
| `07-online-monitoring-dark.svg` | Monitoring: conducting paths green and heavier, dead ones dimmed, live values beside elements |

## What a still picture cannot show

**Cursors**

| Where the pointer is | Cursor |
|---|---|
| A cell, with no tool armed | pointer — a click selects |
| A cell's lower band (the bottom 24 of its 70 units), with a tool armed | `s-resize` — a click branches |
| A position that would refuse the armed tool | `not-allowed` |

**Status bar sentences** — every refusal says why, on hover as well as on click:

- *An output ends its line — nothing can follow it*
- *An output must reach the right rail — this branch rejoins and the rung carries on*
- *Branching an output needs another output — pick a coil*
- *An output cannot branch a contact — every leg must end the same way*
- *Function blocks are being redesigned to follow ISPSoft — not available yet*

**Behaviour**

- An allowed hover leaves the status bar alone, so the last result message survives.
- After a click the tool stays armed, and the outlines rebuild for the new ladder.
- Escape, or switching to online mode, clears every outline and ghost.
- The toolbar branch command previews every zone of a cell as a branch.

## What these pictures deliberately lack

- **Function blocks** — switched off; the seed's timer was removed. Their look is the subject of
  the function block proposal, and will replace the prototype's TON.
- **The IDE around the canvas** — for that, the prototype still governs.
