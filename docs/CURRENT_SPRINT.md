# Current Sprint

Last updated: 2026-10-01
Sprint: 1 — Trustworthy for buyers and operators (machine items done); next: P2.1 direction
State: ready-for-owner

## Goal

Decide the site's direction before redesigning it: is ai.doo pivoting towards a
studio plus app-building services, or not? (P2.1, reopens D-004.)

## Current truth

- Phase 1 machine items all merged and deployed: P1.1 site gate (#14), P1.5 chat limit per visitor + 60/min ceiling (#16, D-009), P1.4 docs build pinned (#17). Gates: lint, format, tests, build, site, audit, docs.
- P2.1 captured (#15, D-008): site rework design, carrying P1.2 (claims) and P1.3 (commercial).
- **Owner is considering a pivot** (2026-10-01): no corporate leads; two Labs games at 100+ downloads; idea "we create and host apps for you, concept to store". Claude's critical feedback, the recommended 8-week experiment and the open questions are banked in [the pivot brief](design/2026-10-01-pivot-brief.md).
- DNS, seen 2026-10-01 (owner's to fix): `aidoo.biz` has a second A record `162.255.119.207` that doesn't answer HTTPS, and `www.aidoo.biz` has an AAAA in Google's range (`2a00:1450:4009:c08::79`). Only `157.180.81.235` serves the site.
- Owner's local `main`: rebased onto `origin/main` 2026-10-01; the enterprise-roadmap commit (`200b844`) is unpushed, with uncommitted edits to `.github/ROADMAP.md`, `docs/admin/reverse-proxy.md`, `docs/installation/installer.md`.

## Execution order

1. **Next action:** in a new chat, *"pick up the pivot brief"*. Run `/idea --test` on "pivot ai.doo to a studio plus app-building services": the inception A3 stress test, starting from the brief's open questions. Capture the cheapest falsifying experiment.
2. P2.1 — site rework design doc in `docs/design/`, its direction set by step 1. Supersede or reaffirm D-004 (and D-003 if the page count grows).
3. P1.2 / P1.3 — delivered inside P2.1 (D-008).

## Owner gates — waiting on a human

- Answer the pivot brief's open questions (next chat).
- Fix the two stray DNS records.
- `takeown` + delete `C:\dev\worktrees\ai.doo-P1.1` (two folders locked by Codex's sandbox).

## Work log

### 2026-10-01
- #17 merged. Owner raised a possible pivot (studio + app-building services); Claude gave critical feedback; banked in `docs/design/2026-10-01-pivot-brief.md` for a new chat. Next: `/idea --test` on the pivot.
- #15 and #16 merged; both Gates runs green. P1.4: docs build pinned in one file both workflows install; test-first. Gate cycles: 2 (format). Codex round 1: no findings. Next: P2.1 (site rework design: interview the owner on direction first).
- P1.5: `ProxyFix(x_for=1)`; per-visitor keys; own adversarial pass found that per-visitor keys removed the de facto cap on OpenAI spend, so added a 60/min site-wide ceiling, IPv6 /64 keying and idle eviction (D-009). Gate cycles: 1. Codex round 1 (high): no findings. Next: P1.4.
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
