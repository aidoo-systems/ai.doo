# Product Brief — aidoo.biz

Last updated: 2026-09-30
Status: Accepted (adoption interview, 2026-09-30)

Every claim is marked **fact** (evidenced), **assumption** (believed, untested)
or **preference** (a choice, not a truth).

## Vision

A corporate buyer who lands on aidoo.biz understands what ai.doo offers and can
start a pilot conversation; an operator installing the suite finds accurate
documentation at docs.aidoo.biz. *(preference: owner's promise, 2026-09-30)*

## Problem

The suite (Hub, PIKA, VERA) is being made safe for founder-assisted corporate
pilots (`.github/ROADMAP.md`, Phase 0). The site is where a buyer forms their
first judgement, and where an operator's install either works or doesn't. Two
failure modes matter:

- The site claims more than the suite ships. The enterprise roadmap lists
  "Remove or qualify unsupported security, audit, batch, citation, and streaming
  claims" as an open stop-ship item. *(fact: `.github/ROADMAP.md`, Phase 0)*
- A buyer can't self-qualify: no price band, no pilot definition, no demo path.
  *(fact: `../docs/claude/corporate-readiness-roadmap.md`, Tier 1.6)*

## Target users — and explicitly, non-users

| Who | What they need | Where |
|---|---|---|
| **Corporate buyer** (CTO, IT lead, compliance) | What ai.doo is, why self-hosted, what a pilot costs and involves, how to start | `/`, `/pika/`, `/vera/` |
| **Operator** installing the suite | Accurate install, proxy, backup and admin docs | docs.aidoo.biz (`docs/`) |
| **App store reviewers and app users** | A privacy policy per app | `/privacy-*/` |
| **Curious visitors** | What else ai.doo builds | `/labs/` |

Non-users: end users of PIKA or VERA inside a customer (they use the product,
not this site); anyone looking for support (there is no support channel here).

## Jobs to be done

1. "Tell me in a minute whether this fits our constraints (data residency, cost, hardware)."
2. "Tell me what a pilot is and roughly what it costs before I book a call."
3. "Let me install and run it from the docs without asking you."
4. "Show me the privacy policy for this app." (store requirement)

## Value proposition

Own the AI rather than rent it: local inference, data never leaves the
customer's network, fixed cost. *(preference: the site's positioning, commit 11ce73d)*

## Product principles

- **Say only what ships.** Every claim on the site or docs describes behaviour
  that is implemented and tested. *(preference: owner, 2026-09-30)*
- Hand-authored static pages; the site is fast and has no runtime beyond the chat API. *(preference, D-003)*
- Privacy practised, not just described: self-hosted fonts, cookieless first-party analytics. *(fact: `style.css`, Umami in CHANGELOG)*

## Core user loop

Buyer: land → read the own-vs-rent case → product page → pricing → contact.
Operator: docs.aidoo.biz → requirements → installer → admin guides.

## MVP must-have

Already live: homepage, PIKA and VERA pages with changelogs, docs site, chat
widget, Labs, privacy policies. *(fact: `sitemap.xml`, 2026-09-30)*

## Explicitly out of scope

- **No light mode** on the marketing site. (The MkDocs docs site keeps Material's toggle.)
- **The chatbot stays a guide.** No lead capture, no support tickets, no answers beyond public site content.
- **No unproven claims.** Nothing on the site or docs describes unshipped or untested behaviour.

## Success measures and guardrails

- Every internal link, asset and sitemap URL resolves (P1.1, machine).
- No page makes a claim the owner hasn't cleared against `.github/ROADMAP.md` (P1.2, owner).
- A buyer can find a price band and what a pilot is without contacting us (P1.3, owner).
- Guardrail: the chat API's OpenAI spend stays bounded (rate limit, `max_tokens=500`).

## Assumptions and the cheapest test for each

| Assumption | Cheapest test |
|---|---|
| **Riskiest:** the site's claims match what the suite ships | P1.2: walk every claim against `.github/ROADMAP.md` and the product repos' tests |
| A published price band helps more than it scares off | Owner judgement; revisit after the first pilot conversations |
| The chat API's rate limit protects cost | **Known false:** it keys on `remote_addr`, which is Caddy's loopback (P1.5) |

## Business or sustainability model

The site sells pilots (Discovery free, Pilot from £3,000, Production custom:
`index.html#pricing`). Its running costs: the VPS and the chat API's OpenAI usage.

## Risks

- Claims drift ahead of the product as the enterprise roadmap moves.
- Pushes to `main` deploy immediately and are not blocked by the gates (D-006).
- Unpinned `mkdocs-material` in deploy; MkDocs 2.0 breaks theme overrides (P1.4).

## Evidence and source links, with checked dates

- `.github/ROADMAP.md` (suite enterprise roadmap), checked 2026-09-30
- `C:\dev\repos\docs\claude\corporate-readiness-roadmap.md`, checked 2026-09-30
