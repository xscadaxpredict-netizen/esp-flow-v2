#!/usr/bin/env node
// SessionStart hook: injects the ESP-Flow rules file into context.
// The rules file deliberately lives under documentation/ rather than at the
// project root, so Claude Code's automatic CLAUDE.md discovery never sees it.
// This hook is what makes it load anyway.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const relPath = "documentation/claude/context window memory/CLAUDE.md";
const target = resolve(here, "../..", relPath);

let text;
try {
  text = readFileSync(target, "utf8");
} catch (err) {
  process.stdout.write(
    JSON.stringify({
      systemMessage: `ESP-Flow rules not loaded: could not read ${target} (${err.code ?? err.message}).`,
    }),
  );
  process.exit(0);
}

process.stdout.write(
  JSON.stringify({
    suppressOutput: true,
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext:
        `Project instructions for ESP-Flow, loaded from ${relPath}. ` +
        `Follow these as you would a root CLAUDE.md.\n\n` +
        text,
    },
  }),
);
