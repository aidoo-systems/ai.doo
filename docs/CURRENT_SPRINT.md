# Current Sprint

Last updated: 2026-10-01
Sprint: 1 — Trustworthy for buyers and operators
State: ready-for-owner

## Goal

A visitor can never hit a broken internal link or missing asset on aidoo.biz,
and a gate proves it (P1.1).

## Current truth

- Adopted into the studio 2026-09-30 (P0.1). Gates: lint, format, tests, build, audit, docs; `site` added by P1.1.
- Adoption merged (aidoo-systems/ai.doo#11, 02e7e38) and deployed: CI Gates and Deploy both green. Live check: `/privacy-tea-tower/` 200; `AGENTS.md`, `scripts/gates.sh`, `ruff.toml`, `.gitattributes` and docs.aidoo.biz `/ROADMAP/` all 404.
- `bash scripts/gates.sh` on local `main` after the rebase: all six PASS.
- P1.1 done on `item/P1.1-site-gate` (PR open, owner merges): `scripts/check_site.py` is the `site` gate. The live tree is clean: no broken local link or asset, and all six sitemap URLs have matching canonicals.
- Known defects found at adoption, not yet worked: chat rate limit keyed on the proxy address (P1.5); unpinned mkdocs-material in deploy (P1.4).
- Owner's work on local `main`, not pushed: the enterprise-roadmap commit (rebased onto the merge) and uncommitted edits to `.github/ROADMAP.md`, `docs/admin/reverse-proxy.md`, `docs/installation/installer.md`. `api/chat.py` passes `format` under `ruff.toml`.

## Execution order

1. ~~P1.1~~ — merged (#14). Add a `site` gate to `scripts/gates.sh`: parse every `*.html` outside `.git/`, `_docs_build/`, `docs/`, `overrides/`; resolve each local `href`/`src` (root-relative against the repo root, relative against the page's directory, `/x/` → `x/index.html`, extensionless → `.html`); check every `sitemap.xml` `<loc>` maps to a file whose canonical matches. Prove it fails on a planted broken link.
2. **P1.5** — chat rate limit per visitor (machine; high). Next.
3. **P1.4** — pin mkdocs/mkdocs-material in deploy (machine; routine).
4. **P2.1** — site rework design doc, carrying P1.2 (claims) and P1.3 (commercial) (owner gate; high). D-008.

## Acceptance

- P1.1: `bash scripts/gates.sh site` → `[PASS] site`; the same command with a planted broken `href` → `[FAIL] site` naming the page and target.

## Owner gates — waiting on a human

- None blocking P1.5. P1.1 merged (aidoo-systems/ai.doo#14). (Pushing `main` ships the enterprise-roadmap commit; that's the owner's call.)

## Work log

### 2026-10-01
- `/idea`: site rework captured as P2.1 (Phase 2, owner gate, high). P1.2 and P1.3 fold into it (D-008). New order: P1.5, P1.4, P2.1.
- P1.1: `scripts/check_site.py` + `site` gate + 22 tests. Branched from `origin/main` plus the sprint commit, so the owner's unpushed enterprise-roadmap commit is not in the PR. Served set is read from `deploy.yml`'s rsync excludes, not duplicated. Gate cycles: 2 (cycle 1 failed `format` only). Codex round 1: no findings. Not checked (deliberately): `#fragment` targets, links built in JavaScript, external URLs. Next: owner merges the P1.1 PR; then P1.2 (claims audit, owner gate).

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
