# Proposal — outputs inside the rung

**Status: IMPLEMENTED 2026-09-12.** Option A was built as written. The rules now live in `LD building.txt` as rules 6 and 7; this document is kept as the reasoning behind them.

**Originally raised as: proposed, nothing built.** Raised 2026-09-12 from an ISPSoft screenshot showing a
rung whose two branch legs each end in their own coil. Revised the same day after the user
corrected an assumption about where a coil may sit.

This document explains the limit we have hit, why it exists, what it would take to lift it,
and the decisions that are yours rather than mine. Read it before any code is written.

---

## 1. What we can draw today

Two outputs that turn on together. They share one condition: does the whole rung conduct?

```
|---[M0]---[Start]---+---( Motor )---|
                     |
                     +---( Lamp )----|
```

Both coils hang off the end of the whole line. Both see the same power.

## 2. What we cannot draw

The rung splits, and each leg runs through its own contacts to its own coil.

```
|---[M0]---[X1]---+---[X2]---[X3]---( Motor )---|
                  |
                  +---[X4]----------( M1 )------|
```

Motor turns on when M0, X1, X2 and X3 are all true.
M1 turns on when M0, X1 and X4 are true.

Two outputs, **two different conditions**. That is the thing we cannot express. Sharing a
condition and differing in one are both legitimate and both need to work.

## 3. The rule from the standard

A coil terminates its line at the right power rail. **Nothing may be placed to the right of a
coil** — no contacts, no function blocks, no second coil in series. A coil is always the last
element of the line it sits on.

Today's model enforces this for free, because outputs are held in a list that the logic tree
cannot reach. Any design that puts coils into the tree has to enforce it deliberately.

This constraint is a gift. It removes the hardest cases before they arise, and it is why this
change is smaller than it first looked.

## 4. The idea

**An output block: a branch whose every leg ends in a coil, sitting last in the rung.**

The legs do not rejoin each other. Each one runs to the right rail through its own coil. That
is not a dangling branch — every leg still reaches the rail, just separately rather than
merging first.

The pleasing part is that today's feature becomes a special case of the new one:

```
one output            same condition              different conditions
ser(M0, coil)         ser(M0, par(               ser(M0, X1, par(
                        ser(coil Motor),           ser(X2, X3, coil Motor),
                        ser(coil Lamp)))           ser(X4, coil M1)))
```

Three shapes, one rule. Stacked coils are an output block whose legs hold nothing but their
coils. A single coil needs no block at all — it is simply the last element of the rung.

Worth knowing: the data model already permits a coil inside a line. A coil is a kind of
element, and a line may hold elements. The shape is not the obstacle. The behaviour around it
is.

**An output block may follow an ordinary one.** A second ISPSoft screenshot shows a rung where
several levels rejoin at a shared node in the usual way, and the outputs then fan out from that
node, each through its own contacts to its own coil. The tree already expresses that ordering
with no new concept: a line holding contacts, then a rejoining block, then an output block
last. Nesting an output block inside a level of a rejoining block is what stays forbidden,
since a leg that terminates cannot also rejoin.

## 5. Three ways to model it

**Option A — coils move into the tree, and the separate list goes away.**
One representation of an output, everywhere. Matches the standard and PLCopen, which is the
interchange format we have committed to. Biggest change, because everything that addresses an
output by its position in that list has to be reworked.

**Option B — keep the list, and also allow coils in the tree.**
Smaller change. Rejected. It gives two different ways to write down the same rung, which is
precisely what this codebase avoids elsewhere: the reason a line may not hold another line is
that one rung must have exactly one correct representation.

**Option C — keep the list, and have each entry record which node feeds it.**
Rejected. It stores a relationship that the tree can express structurally, which breaks the
rule that nothing about shape is ever bookkept.

**Recommendation: Option A.**

## 6. What actually changes

**The model.** A network loses its coil list and keeps only its body. An output becomes an
element at the end of a line.

**A new structural rule.** A coil must be the last element of its line, and a line that holds a
coil may not also hold a branch after it. This is browser-owned under ADR-001: it asks only
about the shape of the drawing, never what anything means. It earns a `STR-` code.

**Power flow.** Flow along a line is the AND of its elements. A coil must not take part in that
AND, because a coil is written by power rather than gating it — and asking a coil whether power
passes is circular, since the answer is what decided the power in the first place. With the
standard's rule in place a coil is always last, so this can no longer strand contacts behind
it. What it would still corrupt is the value the line reports upward, and the colour of the
wire feeding the coil during monitoring. One line of code, still required.

**Width.** Corrected during the build. Once coils float to where their own logic ends, a coil
occupies the next column like any other element and counts toward the width of its line. Rule 1
is untouched because it needed no exception at all: a coil is simply an element one column wide.

**Drawing.** A leg that ends in a coil runs out to the output column instead of back to a rejoin
node. The rejoin node only joins legs that actually rejoin, and an output block has none.

**Placement, deletion and selection.** An output is addressed by its position in the list today
and would become addressed by a path, like everything else. That simplifies the code in the
long run and touches a lot of it in the short run. Deleting the last contact on a leg should
leave the coil rather than collapse the leg, so the pruning rules need a pass.

**Structural checks.** The rule reporting a rung with logic and no output currently looks at the
list. It would walk the tree instead.

## 7. Decisions that are yours

**a. Is this designed anywhere?** The prototype governs anything visual in this project, and it
does not show a branch coil. The standing rule is that undesigned areas get a labelled empty
state and nothing is invented. So this needs either a prototype revision from you, or an
explicit agreement that I follow ISPSoft's rendering.

**b. Confirm the cost of floating coils.** Settled in principle: we follow ISPSoft, where a coil
is placed immediately after the last contact of its own line rather than in a shared column.
A second screenshot shows this plainly — coils at several different distances from the rail,
each one sitting where its logic ends.

What needs confirming is the consequence. Today every output in every rung is drawn in one
aligned column at the far right. Under ISPSoft placement a plain one-contact rung draws its coil
right beside that contact instead. So this is not only a new feature; it changes how every rung
already on screen is drawn. That contradicts the current prototype and needs saying out loud
before it is built.

Two earlier questions are now closed by the standard. Legs of an output block all terminate, so
there is no mixed case within one block. Coils do count toward width, since they sit in a column
of their own — see the corrected note in section 6.

## 8. Suggested order

1. Settle section 7.
2. Write the rules into `LD building.txt` first, as we did for the click rule and the delete
   selection. The rule book leads, the code follows.
3. Power flow, because it is small, isolated and testable on its own.
4. Model and placement, plus the new structural rule that keeps a coil last.
5. Drawing.
6. Structural checks, selection and deletion.
7. Seed data last, so the editor opens on a rung that exercises the feature.

## 9. What this does not change

The series and parallel model. Intrinsic width. Rules 2 and 3 on branching. The click rule.
The compiler boundary, since none of this asks the browser to understand what a program means.

## 10. Risk

This touches the model, the geometry, the evaluation and the rule book at the same time, and
the ladder core has no automated tests. Every rule it changes is currently guarded by someone
clicking around in a browser. Putting tests on `core/ladder/` before this work, not after, is
the difference between a refactor you can trust and one you cannot.
