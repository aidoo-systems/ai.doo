# Current Sprint

Last updated: 2026-10-01
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
- CI went red on `lint`: CI installed ruff 0.16.9, whose wider default rules (I001, BLE001) failed code local 0.15.9 passed. Fixed by `ruff.toml` (explicit `select`, `target-version`) and pinning `ruff==0.15.9` in `ci.yml`; verified lint passes under both 0.15.9 and 0.16.9. `ruff.toml` and `.gitattributes` added to the deploy rsync excludes.
- Tea Tower privacy policy (`privacy-tea-tower/`, from the local `privacy-tea-tower` branch, cherry-picked without 591c281) folded in at the owner's request. Claims spot-checked against tea-tower: payload fields match `docs/LEADERBOARD_API.md`; IP used only by the in-memory rate limiter; queue cleared when posting is off (`Leaderboard.cs:298`); names sanitised server-side. Unblocks tea-tower P1.3.

### 2026-10-01
- Owner spotted `/privacy-tea-tower/` was brown. It had shipped with a one-off palette (no recorded reason); restored the site palette. Its `<style>` block is now identical to `privacy-submarine-panic`'s (`diff` empty).
- Added a Tea Tower card to Labs (In development; Android, iOS, Unity; privacy link; no store buttons until it's on a store), a footer entry and the meta description; the Games intro now says "Godot and Unity". Checked in the browser at 1280px and 375px.
- Found, pre-existing and not fixed: `/labs/` is 13px wider than a 375px phone after the reveal animations run (`scrollWidth` 388 vs 375, identical on production before this change). A candidate for P1.1's site checks.

## Stop/handoff checklist

- [ ] Roadmap status and acceptance evidence updated.
- [ ] Decisions recorded.
- [ ] Changelog updated if behaviour changed.
- [ ] Exactly one unambiguous next action left above.
- [ ] Gates run and result recorded.
