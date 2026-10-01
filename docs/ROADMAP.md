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
| P1.2 | **Claims audit.** Every security, audit, batch, citation, streaming, SSO and installer claim on `/`, `/pika/`, `/vera/` and docs.aidoo.biz is either backed by a shipped, tested feature or qualified/removed. A `claims` check greps a banned/qualified-phrase list the owner approves | Proposed | owner | high | Owner signs off a claim-by-claim table (claim → page → evidence in `.github/ROADMAP.md` or product tests → keep/qualify/remove); `bash scripts/gates.sh claims` passes |
| P1.3 | **Commercial lite.** A buyer can self-qualify without a call: a published price band, a one-paragraph pilot definition, a demo path, and a feedback address. Needs a design doc (`docs/design/`) first | Proposed | owner | high | Owner approves the copy and numbers on the live page; `site` gate passes with the new anchors and links |
| P1.4 | Deploy's docs build can't be broken by an upstream major release: `mkdocs`/`mkdocs-material` pinned in `deploy.yml` to the versions `ci.yml` proves | Proposed | machine | routine | `grep` shows the pins in both workflows; CI green |
| P1.5 | The chat rate limit applies per visitor, not per proxy: trust Caddy's `X-Forwarded-For` (one hop) and key the limiter on the real client IP | Proposed | machine | high | New test: two requests with different forwarded IPs from the same `remote_addr` are limited independently; `bash scripts/gates.sh tests` passes |

### Phase 1 out of scope

- A light mode, a framework or build step, a CMS.
- Anything that makes the chatbot collect details or act as support.
- Changing the suite products themselves (their repos own that).

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
