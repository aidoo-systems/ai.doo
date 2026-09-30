# Current Sprint

Last updated: 2026-09-30
Sprint: 1 — Trustworthy for buyers and operators
State: ready

## Goal

A visitor can never hit a broken internal link or missing asset on aidoo.biz,
and a gate proves it (P1.1).

## Current truth

- Adopted into the studio 2026-09-30 (P0.1). Gates: lint, format, tests, build, audit, docs.
- `bash scripts/gates.sh` on `studio/adopt`: all six PASS (34 tests; `mkdocs build --strict` clean; pip-audit clean).
- Static HTML has no automated check: links, assets and the sitemap are unverified.
- Known defects found at adoption, not yet worked: chat rate limit keyed on the proxy address (P1.5); unpinned mkdocs-material in deploy (P1.4).
- Owner's in-flight edits on `main` (not in this branch): `.github/ROADMAP.md`, `docs/admin/reverse-proxy.md`, `docs/installation/installer.md`, and unpushed commit 591c281, whose `api/chat.py` fails `ruff format`.

## Execution order

1. **P1.1** — add a `site` gate to `scripts/gates.sh`: parse every `*.html` outside `.git/`, `_docs_build/`, `docs/`, `overrides/`; resolve each local `href`/`src` (root-relative against the repo root, relative against the page's directory, `/x/` → `x/index.html`, extensionless → `.html`); check every `sitemap.xml` `<loc>` maps to a file whose canonical matches. Prove it fails on a planted broken link.
2. P1.2 — claims audit (owner gate; high).
3. P1.3 — commercial lite (design doc first; owner gate; high).
4. P1.4, P1.5 — slot in when convenient.

## Acceptance

- P1.1: `bash scripts/gates.sh site` → `[PASS] site`; the same command with a planted broken `href` → `[FAIL] site` naming the page and target.

## Owner gates — waiting on a human

- Merge the adoption PR, then bring `main` into the primary checkout so the wiki can publish.
- Rebase or reformat unpushed commit 591c281 (`python -m ruff format api/chat.py`) before pushing.

## Work log

### 2026-09-30
- Adopted: short interview; gate runner, CI, studio docs, settings written; `exclude_docs` added to `mkdocs.yml`; `AGENTS.md` and `scripts/` excluded from the deploy rsync; `.gitignore` narrowed so `.claude/settings.json` is committed. `tests/test_chat.py` reformatted by ruff. Gates green. Next: P1.1.

## Stop/handoff checklist

- [ ] Roadmap status and acceptance evidence updated.
- [ ] Decisions recorded.
- [ ] Changelog updated if behaviour changed.
- [ ] Exactly one unambiguous next action left above.
- [ ] Gates run and result recorded.
