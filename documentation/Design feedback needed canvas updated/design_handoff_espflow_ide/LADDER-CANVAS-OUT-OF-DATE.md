# The ladder canvas in this prototype is out of date

**Added 2026-09-19.** Everything else in this handoff still governs the IDE. The ladder canvas
inside `ESP-Flow IDE.dc.html` does not.

Since this prototype was drawn, the ladder was rebuilt to follow Delta's ISPSoft — decided
2026-09-12: *where the prototype and ISPSoft disagree on ladder canvas geometry, ISPSoft wins.*
So the prototype's ladder shows things the app deliberately does not do:

| In this prototype | In the app |
|---|---|
| Every coil in one column at the right | Each coil sits where its own logic ends |
| A right power rail | No right rail |
| A TON block, usable | Function blocks switched off while they are redesigned |
| No feedback before a click | Legal positions outlined, a ghost of the element, refusals explained on hover |

**Do not change the app to match this canvas.** For the ladder, the authorities are:

- `documentation/reference/rules/LD building.txt` — the rules
- `documentation/reference/rules/ispsoft-behaviour.md` — what ISPSoft does, from its manual
- `documentation/design/reference/ladder-as-built/` — pictures of the ladder as built
