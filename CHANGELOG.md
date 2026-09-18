# Changelog

All notable changes to ESP-Flow. Versions follow semantic versioning;
0.x means nothing is stable yet.

## [0.2.0] - 2026-09-18

### Added
- Where you point decides what a click does, as in ISPSoft: with a tool armed, the
  lower band of an element branches and either side inserts before or after.
  Branching no longer needs a separate armed step.
- The canvas shows where the armed tool can go before you click. Accepting
  positions are outlined, a faint ghost shows where the element will land, and
  pointing at a refused position gives the reason in the status bar.

### Changed
- A new branch leg takes the armed tool's type rather than copying the element
  it branches from, so an NO contact can be branched with an NC.

### Fixed
- Function block tabs opened Prog0's ladder under the block's name, so edits
  made there changed the program. They now show a labelled empty page.

### Removed
- Function blocks are switched off while they are redesigned to follow ISPSoft.
  The toolbar button, F9 and the library explain why instead of placing one.

## [0.1.0] - 2026-09-15

### Added
- IDE shell with all twelve regions of the design.
- Ladder editor built on a series/parallel tree, with seven documented rules.
- Outputs inside the rung, placed as ISPSoft places them.
- Live structural diagnostics in the Problems panel.
- Unit test suite for the ladder core and undo history.
