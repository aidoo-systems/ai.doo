# Roadmap — aidoo.biz

Last updated: 2026-09-30

This is the site's own ledger. The suite's enterprise roadmap is
`.github/ROADMAP.md`; P1.2 depends on it.

## How to use this file

- This is the outcome/status ledger, not a wish list.
- Statuses: `Proposed`, `In Progress`, `Ready For Test`, `Complete`, `Deferred`, `Not Planned`.
- **`Complete` requires acceptance evidence recorded as a command and its output**, not a description of one.
- The `Gate` column says who can decide the item is done:
  - `machine` — a command decides pass/fail. The gauntlet can close this unattended.
  - `owner` — needs human judgement (review, taste, device, legal, user testing).
  - `undefined` — acceptance not yet specified. The gauntlet will refuse to start.
- The `Stakes` column says how costly a subtle mistake would be, and so which
  model builds it and how hard Codex reviews it:
  - `high` — touches persistence, security or money, or is a big feature with
    its own design doc. Built on Opus, reviewed at high effort.
  - `routine` — everything else. Built on Sonnet; escalates to Opus on evidence.
- The single active execution order lives in `CURRENT_SPRINT.md`.

## Definition of Ready

A row is ready to be worked - by a person or by `/next` - when:

- The user or stakeholder is named, and the desired outcome is stated as
  something that becomes true for them.
- Scope and non-scope are explicit.
- **Acceptance is observable**, and the `Gate` column says who can observe it.
- Dependencies, data, security, privacy, accessibility and licence concerns are
  identified.
- The smallest method of verification is known.
- Open decisions have owners. A blocked decision is never hidden inside an
  implementation task.

## Phase 0 — Adoption

| ID | Outcome | Status | Gate | Stakes | Acceptance evidence |
|---|---|---|---|---|---|
| P0.1 | The repo has gates, studio docs and CI, with a green baseline | Complete | machine | routine | `bash scripts/gates.sh` on `studio/adopt`, 2026-09-30: lint, format, tests (34 passed), build, audit, docs all PASS; `All gates passed.` |

## Phase 1 — Trustworthy for buyers and operators

Goal: a buyer and an operator can rely on what the site says.

| ID | Outcome | Status | Gate | Stakes | Acceptance evidence |
|---|---|---|---|---|---|
| P1.1 | **Site integrity gate.** A visitor never hits a broken internal link or missing asset: every `href`/`src` to a local path in every HTML page resolves to a file, every `sitemap.xml` URL maps to a page, and every page in the sitemap has a matching `<link rel="canonical">`. Enforced as a new `site` gate in `scripts/gates.sh` | Complete | machine | routine | 2026-10-01, `item/P1.1-site-gate`: `bash scripts/gates.sh site` → `[PASS] site`; with `href="../privacy/"` in `vera/index.html` planted as `../privacy-nope/` → `[FAIL] site` / `vera/index.html: href '../privacy-nope/' -> no served file` / `GATES FAILED: site`, exit 1. `tests/test_check_site.py`: 22 passed (each rule, plus the real tree). Full run: lint, format, tests, build, site, audit, docs all PASS. Codex round 1: no findings |
| P1.2 | **Claims audit.** Every security, audit, batch, citation, streaming, SSO and installer claim on `/`, `/pika/`, `/vera/` and docs.aidoo.biz is either backed by a shipped, tested feature or qualified/removed. A `claims` check greps a banned/qualified-phrase list the owner approves | Proposed (delivered via P2.1, D-008) | owner | high | Owner signs off a claim-by-claim table (claim → page → evidence in `.github/ROADMAP.md` or product tests → keep/qualify/remove); `bash scripts/gates.sh claims` passes |
| P1.3 | **Commercial lite.** A buyer can self-qualify without a call: a published price band, a one-paragraph pilot definition, a demo path, and a feedback address. Needs a design doc (`docs/design/`) first | Proposed (delivered via P2.1, D-008) | owner | high | Owner approves the copy and numbers on the live page; `site` gate passes with the new anchors and links |
| P1.4 | Deploy's docs build can't be broken by an upstream major release: `mkdocs`/`mkdocs-material` pinned in `deploy.yml` to the versions `ci.yml` proves | Complete | machine | routine | 2026-10-01, `item/P1.4-pin-mkdocs`: `scripts/docs-requirements.txt` pins `mkdocs==1.6.1`, `mkdocs-material==9.7.6`; `grep -n docs-requirements .github/workflows/*.yml` → `ci.yml:22` and `deploy.yml:26`. `tests/test_workflows.py` (exact pins; both workflows install the file; no second unpinned install): 2 failed before, 2 passed after. `bash scripts/gates.sh` all PASS. Codex round 1: no findings |
| P1.5 | The chat rate limit applies per visitor, not per proxy: trust Caddy's `X-Forwarded-For` (one hop) and key the limiter on the real client IP | Complete | machine | high | 2026-10-01, `item/P1.5-rate-limit-per-visitor`: `test_visitors_behind_the_proxy_are_limited_independently` failed before the change (red) and passes after; also new: forged leading `X-Forwarded-For` values can't dodge the limit, a 60/min site-wide ceiling (D-009), IPv6 keyed by /64, idle-visitor eviction. `bash scripts/gates.sh` → lint, format, tests (21 in `test_chat.py`), build, site, audit, docs all PASS. Codex round 1 (high): no findings |

### Phase 1 out of scope

- A light mode, a framework or build step, a CMS.
- Anything that makes the chatbot collect details or act as support.
- Changing the suite products themselves (their repos own that).

## Phase 2 — Found and chosen

Goal: more of the right people find aidoo.biz, and more of them start a
conversation. Direction is open: P2.0 tests it with real numbers. Meanwhile
P2.1a settles the brand and homepage, which hold whichever bet wins; P2.1b
designs the rest from the result (D-008, D-010, D-011).

| ID | Outcome | Status | Gate | Stakes | Acceptance evidence |
|---|---|---|---|---|---|
| P2.0 | **Pivot experiment (D-010).** Eight weeks to 2026-11-26, about £300: (a) studio: retention analytics in the best 2 games plus Pomodorable, 500–1,000 paid installs each; (b) services: one unlisted fixed-price offer page for promo/event web games, taken directly to 40–60 Isle of Man businesses and event organisers. No new titles, no redesign, suite on security fixes only meanwhile. Plan and bars in `docs/design/2026-10-01-pivot-brief.md` | In progress | owner | high | Results table in the brief: per-title D1/D7, installs and spend; contacts, conversations, deposits, and the "we already use X" list; then pass/kill read against the bars and D-004 superseded or reaffirmed |
| P2.1a | **Brand and homepage (D-011).** A prospect from the outreach, or a player from a Labs game, lands on aidoo.biz and sees a small studio that makes games and apps, not an enterprise AI vendor. Settled once, for every later page: positioning line, voice, wordmark/logo, palette and type (keep or change, decided), recorded in `docs/design/brand.md`. The homepage leads with the studio: Labs games first, the promo offer as a real way in (linking `/promo-games/` is the owner's call), the suite as one honest line. Starts with a short owner interview on direction and references. Not in scope: pricing pages, SEO/content plan, other pages beyond shared chrome, a framework (D-003 holds) | In Progress | owner | high | 2026-10-07, `item/P2.1a-brand-homepage` (#23): owner rejected the look (too like the old site); visual directions next, see the sprint. owner interview done (studio is ai.doo; keep the mark; crafted and calm; "we"; "Small games and apps, made with care."; promo linked; suite one line; references Panic, ustwo games, inkle, Simogo, Snowman, Tinybop). `docs/design/brand.md` drafted; homepage rebuilt; checked in the browser at 1280px and 375px (`scrollWidth` 375 = `clientWidth` on `/` and `/labs/` after reveals); `bash scripts/gates.sh` all PASS. **Waiting on:** owner approval. Acceptance: Owner approves `docs/design/brand.md` and the homepage on the live site at 1280px and 375px; `bash scripts/gates.sh` all PASS (incl. `site`); no claim on the homepage the owner hasn't cleared |
| P2.1c | **Labs retired (D-011).** Nothing on aidoo.biz sends a visitor to `/labs/` or calls the studio "ai.doo Labs": every internal link to a game or app lands on its card on the homepage (each card gets an id, e.g. `/#reactor-panic`; section links use `/#games` and `/#apps`); `/promo-games/` loses the Labs name and the purple/cyan palette for the D-012 look; `/labs/` leaves `sitemap.xml` and becomes a noindex redirect to `/#games` so old links still work; the chatbot prompt stops naming Labs. Out of scope: renaming the `@aidoolabs` TikTok (owner's call) | Complete | owner | routine | `grep -rn 'labs/' --include=*.html . \| grep -v '^./labs/'` → 0; `grep -c labs sitemap.xml` → 0; `grep -rnE 'ai\.doo Labs\|#a78bfa\|#22d3ee' promo-games/ api/chat.py` → 0; every `/#<id>` link target exists in `index.html`; `bash scripts/gates.sh` all PASS (incl. `site`); owner approves `/promo-games/` at 1280px and 375px **Evidence (2026-10-07, branch `item/P2.1c-retire-labs`):** `tests/test_labs_retired.py` encodes the greps above plus the anchors: red first, `7 failed`; green, `7 passed`; full suite `71 passed`. It also caught `vera/index.html` linking to `/#pricing`, gone since P2.1a; now `/#contact`. `bash scripts/gates.sh` → `[PASS] lint · [PASS] format · [PASS] tests · [PASS] build · [PASS] site · [PASS] audit · [PASS] docs · All gates passed.` (cycle 1 failed `format` only). Browser, local server: `/promo-games/` at 1280 and 375, can't be scrolled sideways (`scrollX` stays 0), no console errors; `/labs/` lands on `/#games`; an in-page jump to `/#reactor-panic` puts the card 96px from the top, below the sticky header (new `scroll-margin-top`). Not verified: arriving at `/#reactor-panic` from another page; the browser pane doesn't jump to anchors on page load anywhere (MDN too). Codex (gpt-6-astra, medium) round 1: exit 0, `No actionable regressions found against the specified merge base.` (0 findings). **Accepted 2026-10-07:** owner reviewed and merged #24, #25 and #26; deploy green (incl. `check-served`). Live: `/labs/` 200 with `url=/#games` refresh; `grep -c labs` on live `sitemap.xml` → 0; live `/` has no `labs/` link and has `id="reactor-panic"`; live `/promo-games/` names Labs only in the `@aidoolabs` TikTok link (out of scope). D-013 records the decision |
| P2.1b | **Site rework: direction and design (was P2.1).** The owner has an approved plan for a reworked aidoo.biz: who it is for and what it should make them do (reopens D-004), page structure, copy direction, the visual refresh beyond P2.1a's brand, and an SEO/content plan (blog, case studies). It also carries P1.2's claim-by-claim table and P1.3's price band, pilot definition and demo path, so they're designed once, into the new site. It says whether D-003 (hand-written HTML) still holds at the planned page count, and sets success measures with a baseline from the site's own Umami analytics. Build items (P2.2+) are written from it | Proposed | owner | high | Owner approves `docs/design/site-rework.md`; D-004 (and D-003 if it changes) updated or superseded in `DECISIONS.md`; P2.2+ rows written with acceptance; Umami baseline (visitors/month, top pages, contact clicks) recorded in the doc. Waits for P2.0's result (D-010); builds on P2.1a (D-011) |

## Later, separately gated

| Outcome | Status | Why later |
|---|---|---|
| Gates block deploy (deploy `needs:` a passing gates job) | Deferred | Owner decision D-006: fast hand edits to `main` stay possible for now |
| Stale-copy sweep (e.g. "installer coming soon") as a standing check | Deferred | Not chosen at adoption; P1.2's phrase list may cover it |

## Release-level Definition of Done

1. A buyer finds what ai.doo offers, what a pilot is and what it costs, without contacting us.
2. `bash scripts/gates.sh` passes, including `site` and `claims`.
3. Owner has cleared every product claim against shipped behaviour.
4. docs.aidoo.biz builds with `--strict` and describes only released installer behaviour.
5. `CURRENT_SPRINT.md`, this roadmap, `DECISIONS.md`, and `CHANGELOG.md` reflect the shipped state.
