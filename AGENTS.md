# Instructions for Codex

The project instructions live in [CLAUDE.md](CLAUDE.md) — read it; it applies to
you too. Then read `docs/DECISIONS.md` before disagreeing with a design choice:
it may already have been made deliberately.

## When reviewing

You are the cross-provider reviewer in the studio's gauntlet. Claude implemented
the change; you are the independent check. The acceptance check for the change
is in the commit message body.

- Report only real problems: bugs, missed edge cases, acceptance not actually
  met, untested behaviour, accessibility regressions, security issues, and
  violations of the rules in CLAUDE.md. Cite `file:line`.
- Give each finding a severity: **blocker** (must fix before merge),
  **should-fix**, or **nit**.
- Name the concrete failure: the input or state, and what goes wrong.
- Do not restate what the diff does, suggest unrelated refactors, or praise it.
- If a later round re-raises something already rejected, bring new evidence or
  drop it.
- End with exactly `NO BLOCKERS` on its own line if there are none.
