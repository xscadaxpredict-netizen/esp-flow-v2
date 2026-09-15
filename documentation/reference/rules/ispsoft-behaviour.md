# What ISPSoft actually does

Source: Delta's own *ISPSoft User Manual* (EN, 2021-03-29), chapter 10 "Ladder Diagram",
read from the PDF at `C:\Users\VRDDHI\Downloads\`. Corroborated against a 78-second screen
recording of ISPSoft supplied 2026-09-12.

This is the reference for anything the design prototype does not cover, under the standing
decision that ISPSoft wins on ladder canvas geometry.

---

## 1. What the manual states

**Networks.** "A ladder diagram consists of networks. Every network is an independent program
... there is no mark which is used to connect two networks." A blank network is inserted when
the editor opens. A new network goes under the selected one, or above it with the other button.

**Inserting a contact** (10.2.1.1). One tool. Where you point decides the shape:

> "The mouse cursor appears as a contact when the mouse cursor is at the right side of a
> contact, at the left side of a contact, or at the bottom of a contact."

Right and left insert in series. **Bottom connects in parallel.** Pointing near a line inserts
into that line; pointing near a framed group connects to the whole group in series or parallel.

**Inserting a coil** (10.2.1.2). Position is again relative to what is already there, but the
reference points are the *outputs*, not the contacts:

> "If the mouse cursor is at the top of a coil ... a coil will be put above the coil ... If the
> mouse cursor is at the bottom of a coil ... a coil will be put under ... If the mouse cursor is
> near the line in a network, a coil will put above all the output devices in the network."

And, for an empty rung: "If users want to insert a coil in a network where there is no output
device, the mouse cursor must be near the line selected."

**Add MPS** (10.2.1.3). A **separate tool** from the contact tool. It creates a bifurcation
point, and may be applied to a line, a coil, a comparison or an applied instruction.

> "Some positions cannot add MPS, so when users click add MPS icon, the diagram will show the
> position to insert MPS."

**Creating multiple outputs** (10.2.7). The build order is stated outright:

> "If users want to create multiple outputs, they have to insert a coil or an applied instruction
> first."

Then the multiple-output tool is used near the existing output.

**Selection** (10.1.3). "Input devices and output devices can not be in the same frame." Inputs
and outputs are distinct regions of a network, not one undifferentiated row of elements.

## 2. What this confirms about our rules

**Rule 7's build order was right.** The manual says an output must exist before more outputs can
be added. That is exactly the order our placement check forces: place the first coil, branch it,
then grow each leg leftward. The order that felt natural — branch a contact, then drop a coil on
the new leg — has no legal intermediate state in ISPSoft either.

**Rule 7's refusal was right.** ISPSoft has *two* branch mechanisms, not one. A contact placed at
the bottom of another contact is a parallel connection, and it rejoins. MPS is a different tool
entirely and produces a bifurcation. You cannot turn the first into the second by adding a coil,
which is precisely the move the editor now refuses.

**Rule 6 holds.** Coils are positioned relative to other outputs, never between contacts.

**Nothing may sit to the right of an output.** Consistent throughout the chapter, the recording,
and confirmed by hand in ISPSoft.

## 3. Where we differ from ISPSoft

**One tool versus two, and a mode versus a position.** ISPSoft has a contact tool where the
pointer's position decides series or parallel, plus a separate MPS tool for bifurcation. We have
a placement tool plus an armed branch command. Ours is a mode; theirs is a position. Neither is
wrong, but theirs needs no arming step, and it is worth considering.

**Prevention versus refusal.** When a position will not take an MPS, ISPSoft *shows the positions
that will*. We let the click happen and then explain why nothing did. Theirs is the better
interaction and would suit our hit-region model well: the canvas already knows every legal
position before the click.

**The right rail — resolved, not a difference any more.** Chapter 10 says nothing about power
rails, and the recording shows none. We drew one, following the design prototype. Removed
2026-09-12 on the user's instruction, along with the wire that ran from each coil to it.

## 4. Confirmed in ISPSoft itself

Two behaviours were tried in ISPSoft by the user on 2026-09-12 and screenshotted.

**A coil cannot be added to a leg of a branch that rejoins.** The rung was a single contact with
a second contact connected below it in parallel, and no output anywhere. ISPSoft would not place
a coil beside the contact on the lower leg. This is the case reported the same day and the one
our placement check now refuses. We match.

**A contact cannot be placed to the right of a coil.** ISPSoft simply does nothing.

One deliberate difference in both cases: ISPSoft refuses **silently**, and we refuse with a
sentence in the status bar saying why. We keep ours. A control that appears to do nothing is the
exact defect class this project has already been bitten by three times.

A third screenshot shows a deeply nested bifurcation tree, which is the evidence to build from
when MPS is implemented. Worth noting from it: bifurcations nest, a branch point can feed both a
contacts-then-coil path and a bare coil, coils land in whatever column their own branch length
puts them, and two coils sharing one condition stack in a single column.

## 5. Still open

1. Can every leg of a bifurcation carry its own contacts, or only some?

The right-rail question is closed. Decided 2026-09-12: no right rail, matching what the
recording and screenshots show. Removed the same day.

## 6. Deferred

The MPS bifurcation tool itself. Decided 2026-09-12: get the basic placement rules right first,
then add it. Our output block already covers what MPS produces structurally; what is missing is
ISPSoft's separate tool for creating one, and its habit of showing the legal positions before
the click rather than explaining after it.
