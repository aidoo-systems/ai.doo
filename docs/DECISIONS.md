# Decision Log — aidoo.biz

Keep superseded decisions. Link the replacement rather than rewriting history.

## D-001 — Adopted into the studio with a repo-specific gate runner

- **Status:** Accepted
- **Date:** 2026-09-30
- **Decision:** `scripts/gates.sh` written for this repo, honouring the gate contract (`studio/profiles/README.md`). The `docs` gate is copied verbatim from `python-service`.
- **Why:** No profile fits. `web-app` assumes Node/Vite/Vitest (this repo has no Node); `python-service` assumes `src/<pkg>` and `pyproject.toml` (this repo has `api/` and `requirements.txt`).
- **Alternatives:** Force `python-service` by adding a `pyproject.toml` (restructures a working deploy for the gate's sake); write a `static-site` profile now (rule of two: no second static site yet).
- **Consequences:** When the studio's `docs` gate changes, this copy must be synced by hand (`/adopt` sync step). Studio gap logged: `static-site` profile; `web-app` README wrongly lists this site as a user.
- **Revisit when:** A second static site joins the studio (e.g. bineeta, toy-site): build the `static-site` profile from this runner.

## D-002 — Studio docs live in `docs/`, excluded from MkDocs

- **Status:** Accepted
- **Date:** 2026-09-30
- **Decision:** `docs/PRODUCT_BRIEF.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `CURRENT_SPRINT.md`, `DECISIONS.md` and `docs/design/` sit beside the customer docs and are listed in `mkdocs.yml` `exclude_docs`.
- **Why:** The studio's gates, `sb.py` and the watchdog all look for `docs/CURRENT_SPRINT.md` and `docs/ROADMAP.md`. Without the exclusion, MkDocs would publish internal planning to docs.aidoo.biz.
- **Alternatives:** Move the MkDocs source to `site-docs/` (touches deploy, links and the owner's in-flight docs edits); put studio docs elsewhere (breaks the studio's tooling).
- **Consequences:** **Any new internal file under `docs/` must be added to `exclude_docs`.** `sb.py publish` also mirrors the customer docs to the wiki under `Docs/`; they're public, so that's harmless.
- **Revisit when:** The exclusion is forgotten once, or the docs site moves repo.

## D-003 — Stay hand-authored static HTML; no framework or build step

- **Status:** Accepted
- **Date:** 2026-09-30
- **Decision:** Keep the site as hand-written HTML/CSS. Not listed as a product non-goal; held as a working rule.
- **Why:** 15 pages, rsync deploy, no Node toolchain or npm audit surface. The only real cost is nav/footer/head duplicated across pages, and P1.1's integrity gate catches the likely failure (a stale link in one copy). Owner asked for Claude's view; this was it, and the owner said go.
- **Alternatives:** A JS framework (Astro/Next): new toolchain for no user-visible gain. A small Python include step at deploy: the cheapest option if duplication starts to bite.
- **Consequences:** Shared chrome edits touch every page; the `site` gate is what keeps that safe.
- **Revisit when:** Duplicated chrome causes a shipped defect, or the site passes about 30 pages. Then a Python include step first, with a design doc.

## D-004 — Promise and non-goals

- **Status:** Accepted
- **Date:** 2026-09-30
- **Decision:** Promise: buyers understand ai.doo and can start a pilot conversation; operators get accurate docs; Labs and privacy pages are supporting duties. Non-goals: no light mode on the marketing site; the chatbot stays a guide (no lead capture, no support); no unproven claims.
- **Why:** Owner's answers in the adoption interview.
- **Alternatives:** "Buyers only" and "company front door (equal weight)" were offered and not chosen. A "stale copy sweep" outcome was offered and not chosen.
- **Consequences:** Operator docs are held to the same accuracy bar as sales copy.
- **Revisit when:** The owner changes the site's audience.

## D-005 — Phase 1 order: integrity → claims → commercial

- **Status:** Accepted
- **Date:** 2026-09-30
- **Decision:** P1.1 site integrity gate first, then P1.2 claims audit, then P1.3 commercial lite.
- **Why:** A machine gate first means the later copy-heavy edits can't silently break links. Recommended by Claude, chosen by the owner.
- **Alternatives:** Claims first (buyer accuracy soonest); commercial first (price band soonest).
- **Consequences:** P1.4 and P1.5 were found during adoption and are unordered; they can slot in between.
- **Revisit when:** A pilot conversation needs the price band before P1.2 is done.

## D-006 — Gates run beside deploy, not in front of it

- **Status:** Accepted (as found; not re-decided)
- **Date:** 2026-09-30
- **Decision:** `ci.yml` runs the gates on push and PR, but `deploy.yml` doesn't depend on it. A push to `main` deploys even if the gates fail.
- **Why:** Adoption doesn't change deploy behaviour without the owner deciding it; the owner edits `main` directly for quick copy changes.
- **Alternatives:** Make `deploy` `needs:` the gates job (safer; slows every hand edit by the gate time, about a minute).
- **Consequences:** **Run `bash scripts/gates.sh` before pushing to `main`.** Work through PRs where possible.
- **Revisit when:** A red gate reaches production.

## D-007 — Setup landed as its own PR from a worktree

- **Status:** Accepted
- **Date:** 2026-09-30
- **Decision:** Setup built in `C:/dev/worktrees/ai.doo-adopt` on `studio/adopt` off `origin/main`, landing as its own PR.
- **Why:** The owner had uncommitted edits to `.github/ROADMAP.md` and two docs pages on `main`, plus one unpushed commit.
- **Consequences:** Only one pre-existing file changed in content: `tests/test_chat.py`, reformatted by ruff so the `format` gate is green. The unpushed commit's `api/chat.py` also fails `ruff format`; it will go red on the first gate run after it merges.

## D-008 — Site rework next; claims and commercial fold into it

- **Status:** Accepted
- **Date:** 2026-10-01
- **Decision:** After P1.5 and P1.4, the next work is P2.1, a design doc for a full site rework (direction, structure, copy, visual, SEO/content). P1.2 (claims audit) and P1.3 (commercial lite) are delivered through that design rather than as separate edits to today's pages. Supersedes D-005's order for P1.2 and P1.3.
- **Why:** The owner wants the site to do more for marketing. A rework rewrites the copy, so auditing and extending the current copy first would mean doing it twice. P1.5 (shared chat rate limit) and P1.4 (unpinned docs build) come first because more traffic makes P1.5 worse, and P1.4 can break deploy mid-rework. Claude recommended; the owner agreed.
- **Alternatives:** D-005 as written (claims, then commercial, then rework): accurate copy sooner, but the work is redone in the rework.
- **Consequences:** Today's pages keep their current claims until the rework ships; the enterprise roadmap's stop-ship item on unsupported claims stays open that long. P2.1 may reopen D-003 and D-004.
- **Revisit when:** A pilot conversation needs accurate claims or a price band before the rework ships: then do P1.2/P1.3 on the current pages.
