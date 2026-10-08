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

## D-009 — Chat limits: 10/min per visitor, 60/min site-wide, IPv6 by /64

- **Status:** Accepted
- **Date:** 2026-10-01
- **Decision:** The chat API trusts one `X-Forwarded-For` hop (Caddy's) and limits each visitor to 10 requests a minute, with a ceiling of 60 a minute across all visitors. Both are per gunicorn worker, in memory. An IPv6 visitor is keyed by its /64.
- **Why:** P1.5 made the limit per visitor. That removed the accidental cap on OpenAI spend the shared key gave, so a site-wide ceiling puts it back: a botnet or one IPv6 host rotating addresses gets 60/min per worker, no more. 60 is about six busy visitors at once, far above today's chat use.
- **Alternatives:** Per-visitor only (unbounded spend under rotation). A shared store such as Redis (multi-worker accuracy; a new service for a marketing chatbot). Caddy's own rate limiting (needs a plugin build).
- **Consequences:** Under a flood, real visitors are throttled with the attacker until the window clears. Limits multiply by the worker count.
- **Revisit when:** A 429 reaches a real visitor in the logs, or the rework (P2.1) makes chat central to the site.

## D-010 — No pivot yet: an eight-week, two-bet experiment decides it

- **Status:** Accepted; amended by D-011 (brand and homepage proceed now)
- **Date:** 2026-10-01
- **Decision:** ai.doo does not rebrand or redesign yet. Until 2026-11-26 it runs two bets (P2.0): **studio** (instrument the best 2 games plus Pomodorable, buy 500–1,000 installs each; pass at D1 ≥ 35% and D7 ≥ 10% on any title, kill if every title is under D1 25% or D7 5%) and **services, reshaped** to fixed-price promo and event web games for Isle of Man businesses and events (one unlisted offer page, 40–60 direct contacts; pass at one deposit of £300 or more, kill at none). Meanwhile: no new titles, no site redesign (P2.1 waits), and PIKA/VERA/Hub on security fixes only. If both bets fail, the site says honestly that ai.doo is a small studio, rather than being redesigned around a hope.
- **Why:** The A3 stress test (pivot brief) found the same thing three ways: building was never the bottleneck, distribution was. ~100 lifetime installs per game against roughly 150–400 a day needed for £300–£1k/month; local businesses buy outcomes that cheap tools already deliver, and Apple rejects thin business apps; one person can't run studio, client hosting and the suite at once. The owner's goal is side income within 12 months, with 0–1 selling hours a week normally and 2–3 for these eight weeks; studio leads, services are a side door.
- **Alternatives:** "Concept to store, we host it" for clients (rejected: store review risk, an open-ended maintenance tail, and it is a lead-dependent business like the one that failed). Keeping the suite in development at under 20% (owner's first answer; changed to a freeze on the panel's advice, because 20% of an undefined total can't be checked). The project manager's lighter bar of 20 contacts and 2 calls (rejected: conversations cost the prospect nothing, so they prove little).
- **Consequences:** D-004's promise (buyers start a pilot conversation) is suspended, not yet superseded. Suite repos take security fixes only until the review. The offer page is unlisted and built only once the owner approves its price and copy. About £300 of ad spend is the owner's to authorise.
- **Revisit when:** 2026-11-26, or earlier if a bet hits its pass bar. Further dates from the panel: stop new titles if no app passes £50/month by 2027-03-31; archive the suite if it has had no inbound interest by then.

## D-011 — Brand and homepage now (P2.1a); the full rework still waits for P2.0

- **Status:** Accepted
- **Date:** 2026-10-07
- **Decision:** Split P2.1. **P2.1a** starts now: the brand foundation (positioning line, voice, wordmark/logo, palette and type) and a homepage that leads with the studio, with Labs games first, the promo offer as a real way in, and the suite reduced to one honest line. **P2.1b** (the rest of P2.1: audience, pricing pages, SEO/content plan, D-003 at scale) still waits for the 2026-11-26 review. This amends D-010's "no site redesign" for P2.1a only.
- **Why:** The owner sees the site as the platform the brand derives from. Outreach now sends prospects to aidoo.biz, and a homepage selling self-hosted AI pilots from £3,000 contradicts the promo offer mid-experiment. "A small studio that makes games and apps" is true whichever bet wins, and D-010 already names it as the fallback, so the brand can be settled without guessing the result.
- **Alternatives:** The whole of P2.1 now (designs the audience-dependent parts before the data that decides them). Holding everything until 2026-11-26 (leaves the front door contradicting the offer during the experiment).
- **Consequences:** D-004's pilot-conversation promise stays suspended; the homepage stops leading with it. The owner's outreach (2–3 hours a week) keeps priority over P2.1a review time. Linking `/promo-games/` from the homepage changes the services bet from direct outreach only, so it is an owner decision inside P2.1a. Suite copy that remains is still held to "no unproven claims".
- **Revisit when:** P2.0's review on 2026-11-26; P2.1b builds on whatever P2.1a ships.

## D-012 — Homepage look: colour per game on the original dark chrome

- **Status:** Accepted (owner)
- **Date:** 2026-10-07
- **Decision:** The P2.1a homepage takes direction "C dark". Each game owns a colour: games with bright art are solid colour cards; games with dark art (Submarine Panic, Orbital Panic) get a dark card that glows in their colour (edge, title, hover). Heavy headline weight and big rounded cards, from C. The promo band is the page's one bright gradient (amber to orange). Kept from the original site: the sticky top bar, the faint dotted background and navy gradient, the outlined pill above the headline, blue gradient text on one phrase ("made with care."), the blue primary button with glow and hover lift, the outlined secondary button, and the dotted chip row, now carrying studio facts (Android, iOS, the web, Isle of Man) with game-coloured dots. No light mode: D-004's non-goal holds.
- **Why:** The owner rejected the first P2.1a build as too like the old site, picked C from three mocks (https://claude.ai/artifact/BsH33LcsQCU5gsJLGUVe9H), and the family preferred the original's dark, slick look. What read as "the old site" was the uniform grey work tiles, not the chrome, so the chrome comes back and the cards carry the change.
- **Alternatives:** A (light editorial), B (art-led full-bleed dark), C (colour per game on off-white); all mocked with the same copy and art.
- **Consequences:** Every new game needs a chosen colour (and a glow colour if its art is dark) as well as a feature graphic before it gets a card. Most chrome is already in `style.css`; the restyle mainly replaces the work tiles. If the blue glow mutes the cards, tone the glow down, not the cards.
- **Revisit when:** P2.1b reworks the other pages.

## D-013 — Labs is retired; game links land on homepage cards

- **Status:** Accepted
- **Date:** 2026-10-07 (owner)
- **Decision:** "ai.doo Labs" is no longer a name or a page. `/labs/` leaves the sitemap and redirects to `/#games`; every internal link to a game or app goes to its card on the homepage (`/#<card>`); `/promo-games/` takes the homepage's look (D-012). Answers `brand.md`'s open question "retire `/labs/` or make it the full catalogue". Built as P2.1c.
- **Why:** The owner doesn't want any link sending visitors to Labs. Since D-011 the homepage carries all nine titles, so `/labs/` was a second, older-looking catalogue to keep in step, and `/promo-games/`, where outreach sends prospects, still wore the Labs name.
- **Alternatives:** Keep `/labs/` as the full catalogue (two lists of the same nine titles). Delete it outright (breaks old links).
- **Consequences:** The `@aidoolabs` TikTok handle still says Labs (owner's call). If the catalogue outgrows the homepage, it comes back as `/games/` in the D-012 look, not as Labs.
- **Revisit when:** The homepage can't hold every title.

## D-014 — Custom apps for businesses are on offer, priced by email

- **Status:** Accepted
- **Date:** 2026-10-08 (owner)
- **Decision:** ai.doo builds apps for businesses as well as promo games. The homepage says so in its supporting line ("a game or app of its own") and meta descriptions, and the chatbot says so, with no fixed price: scoping and pricing start with an email to hello@aidoo.biz. No apps page and no starting price until the P2.0 review.
- **Why:** Asked "can you make an app instead?", the chatbot led with the promo-game pitch and only half-offered apps, improvising because nothing on the site said client apps were on offer. The owner would gladly build them.
- **Alternatives:** A starting price like the promo games' £750 (premature before the experiment reads out). Leave the site games-only (turns away work the owner wants).
- **Consequences:** Amends D-010's held commercial changes for this one line. P2.0 still measures the promo-game bet only; app enquiries that come in are noted in the brief's Results table but aren't one of its bars.
- **Revisit when:** The 2026-11-26 review, or P2.1b's pricing pages.

## D-015 — Studio bet runs on free traffic; the showcase game comes before outreach

- **Status:** Accepted
- **Date:** 2026-10-08 (owner)
- **Decision:** Amends D-010 in two ways. **(1)** The studio bet drops the ~£300 of Google App Campaigns. Reactor Panic, Submarine Panic and Pomodorable ship their analytics releases and are read on organic installs plus free promotion (TikTok @aidoolabs, Reddit, itch.io). If one game's free numbers look promising, the owner may run one small campaign (about £50) for that game only. **(2)** Outreach waits for P2.0a, a playable browser showcase, because the offer page sells a no-download phone game and its only example is an Android app. P2.0a is kept to days; the leaderboard, claim screen and ai.doo discount follow in P2.0b alongside outreach.
- **Why:** The owner won't spend £300 on campaigns without a signal first. A prospect who is told "no app to download" and then shown a Play Store link sees the contradiction at once.
- **Alternatives:** Keep the £300 (rejected by the owner). Drop the studio bet entirely (no numbers on 26 November). Start outreach with Tea Tower (contradicts the offer).
- **Consequences:** Fewer studio installs, so the D1/D7 bars only count on roughly 100 or more players per title; below that the reading is a hint, not a pass or fail. Outreach starts about a week later, inside the same eight weeks. The ai.doo discount becomes D-016 when the owner sets it.
- **Revisit when:** The 2026-11-26 review, or as soon as one title's free numbers justify the one campaign.
