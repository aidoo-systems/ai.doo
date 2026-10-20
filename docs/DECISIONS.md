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
- **Decision:** Amends D-010 in two ways. **(1)** The studio bet drops the ~£300 of Google App Campaigns. Reactor Panic, Submarine Panic and Pomodorable ship their analytics releases and are read on organic installs plus free promotion (TikTok @aidoolabs, Reddit, itch.io). The owner may run one small campaign (about £50) for one game only: **Submarine Panic**, chosen 2026-10-08 because it has had the most traffic. It runs after its analytics release is live, so the paid installs are measured. **(2)** Outreach waits for P2.0a, a playable browser showcase, because the offer page sells a no-download phone game and its only example is an Android app. P2.0a is kept to days; the leaderboard, claim screen and ai.doo discount follow in P2.0b alongside outreach.
- **Why:** The owner won't spend £300 on campaigns without a signal first. A prospect who is told "no app to download" and then shown a Play Store link sees the contradiction at once.
- **Alternatives:** Keep the £300 (rejected by the owner). Drop the studio bet entirely (no numbers on 26 November). Start outreach with Tea Tower (contradicts the offer).
- **Consequences:** Fewer studio installs, so the D1/D7 bars only count on roughly 100 or more players per title; below that the reading is a hint, not a pass or fail. Outreach starts about a week later, inside the same eight weeks. The ai.doo discount becomes D-016 when the owner sets it.
- **Revisit when:** The 2026-11-26 review, or as soon as one title's free numbers justify the one campaign.

## D-017 — The offer page is measured; the demo game is not

- **Status:** Accepted
- **Date:** 2026-10-11 (owner)
- **Decision:** `/promo-games/` loads the site's own Umami (cookieless, self-hosted, already on the homepage and in the privacy policy) and names its buttons as events: playing the demo, email, WhatsApp. A return from the game arrives as `?from=demo`, and outreach links carry `?for=cafe`, `?for=pub` or `?for=event`: the kind of venue, never a business's name. `/play/pint/` loads no analytics at all, and a test keeps it that way. WhatsApp (+44 7624 396325) joins email as a way to reply, and the page names Keith.
- **Why:** Without it the 26 November read can't tell an unopened email from a prospect who played and left. The game prints "Nothing is stored or sent", and a promo game's own promise is "not a data grab", so the measuring stops at the page that sells it. Island cafés and pubs answer WhatsApp more readily than a mail link, which often does nothing on a laptop with webmail.
- **Alternatives:** Analytics in the game too (breaks its printed promise). A per-prospect tag (identifies named businesses for no decision it would change). A contact form (D-004: no lead capture).
- **Consequences:** The owner's mobile number is public on the offer page. Play counts for a client's own game, promised in the page's Questions block, are a separate thing to build with the first sale and must count plays without identifying players.
- **Revisit when:** The 2026-11-26 review.

## D-018 — The studio pages get a flat, quiet frame; blue becomes the suite's colour

- **Status:** Accepted for stage 1 (owner, 2026-10-13); supersedes D-012's list of chrome to keep, for the homepage and `/promo-games/`
- **Date:** 2026-10-13
- **Decision:** The homepage and `/promo-games/` drop the original site's chrome: the navy gradient and blue glow, the dotted texture, the pill above the headline, the gradient phrase, the glowing button, the chip and dot rows, the label-with-a-rule, the scroll and hover motion, and the floating chat button. In their place: one flat warm near-black (`#141312`), solid surfaces, one plain button, underlined links, headings at 800 weight and no more than 68px, and the games as the only colour. The chat opens from "Ask the site a question" in the footer. This is all carried by `body.studio` in `style.css`, so PIKA and VERA, which don't have the class, keep the old chrome and their blue: blue is now their colour, as amber is Submarine Panic's. Stage 1 is subtraction only, with no new art or fonts. Stage 2 (a heading typeface, drawings from the games in the hero, gameplay images, PIKA and VERA brought into the frame) waits for the 2026-11-26 review as part of P2.1b.
- **Why:** The owner said the original chrome "is giving us very vibe-coded template feels". Two design reviews (an art director's critique and a benchmark of ten small-studio sites, including all six in `brand.md`) agreed and named the same tells; none of the ten sites uses any of them. The frame was built to sell enterprise AI and the games were slotted into it, so the loudest colour on a page whose rule is "every colour belongs to a game" was a blue that belonged to none. D-012 judged that what read as the old site was the grey tiles, not the chrome; fixing the tiles exposed the chrome.
- **Alternatives:** A light "paper" frame (direction C of 2026-10-07; the art director thinks it the stronger brand call, but it reverses D-004's non-goal and the family's preference, and splits PIKA and VERA into a visibly separate site). Leaving it until the review (the site is what outreach prospects see now). Doing stage 2 now (six to eight days that compete with outreach hours).
- **Consequences:** `brand.md`'s Look section is rewritten. D-012's colour-per-game rule stands; dark-art games change from a glowing edge to a solid deep tone of their colour. SPICE's card text goes dark, because white on its orange was 3.4:1. `og-image.jpg` still shows the old look until stage 2. Chat use may fall without the floating button: compare Umami before and after. The head-with-a-brain mark was flagged as AI-company imagery on a games studio; left for the review.
- **Revisit when:** The owner has lived with stage 1 for a week, and at the 2026-11-26 review. Judge it on a phone with two questions, not on which looks slickest: "What does this company make?" after five seconds, and "Does this look made by a person?"

## D-019 — The quiet frame carries play: a Play button, the page's tint, a ball in the wordmark, a heading typeface

- **Status:** Accepted (owner, 2026-10-13); builds on D-018
- **Date:** 2026-10-13
- **Decision:** Four additions to the studio pages, all from `studio.js` and `body.studio`. **(1)** A floating Play button, in the colour of the game it names, that opens something playable in a browser: the pour game, Pipes 98, or the itch.io builds of Submarine, Orbital and Reactor Panic. It offers the game in view when that one is playable. The chat is the small "?" beside it, and still opens from the footer. On `/promo-games/` it offers only the demo, and only once the page's own demo button has scrolled away. **(2)** The page's background takes a wash of the colour of the game in view (under the pointer with a mouse; across the middle of the screen on a phone), and the phone's browser bar follows. **(3)** The dot in the header's wordmark is a ball: click it and it bounces around the window with a blip, changing to a game's colour at each bounce, then goes home. **(4)** Headings are set in Bricolage Grotesque (SIL OFL 1.1), self-hosted as one 41 KB file with its licence beside it. Inter stays for everything else.
- **Why:** The owner liked the move away from the template but said the calm frame was not exciting enough: "We're a fun studio, and I need us to show this on our site." The earlier excitement was borrowed effects, and more effects would be another template. For a games studio the fun has to come from play and from the games' own colours, which no template has. The floating chat button was objected to as a stock support bubble advertising a chatbot; a floating button that starts a game says what the studio is.
- **Alternatives:** Bring back the blue chat bubble (the template tell). Cards that move, drawn in code from each game (the strongest idea, two to three days; held as stage 2). A playable toy in the hero (same). Motion and glow for their own sake (rejected: that is what was just removed).
- **Consequences:** Play links are marked in the page with `data-play`; a game that isn't playable in a browser must not be marked. The itch.io builds were taken from the cards' existing links and not played from this machine. `studio.js` stores and fetches nothing, and a test holds that. Reduced-motion visitors get no bouncing ball and no colour fade. Amends D-018's "no motion": these three move because someone made them move.
- **Revisit when:** The owner has used it on a phone for a week, and at the 2026-11-26 review. Check the `play-fab` event in Umami: if nobody presses it, it goes.

## D-020 — The mark is the ball; the head-and-brain logo is retired

- **Status:** Accepted on trial (owner, 2026-10-13: "Let's give the ball a try"); reverses `brand.md`'s "keep the head-and-brain mark"
- **Date:** 2026-10-13
- **Decision:** ai.doo's mark is the ball from its wordmark: an amber ball (`#f5b544`) with a shaded side (`#e09a2e`) and a glint (`#ffe9b8`), three flat shapes in `favicon.svg`. The logo is the wordmark "ai", the ball, "doo", set in Bricolage Grotesque 700, with the ball sitting on the baseline where the name's full stop would be; the header and footer show the wordmark alone, with no separate symbol beside it. At rest the ball is always amber; it takes the games' colours only while it bounces. For squares and circles (avatars, the phone home-screen icon, the image search engines are pointed at) the ball is shown at the top of a hop over its shadow on the studio's near-black. On PIKA and VERA pages the head is removed too and their wordmark keeps its blue dot.
- **Why:** The owner asked whether the blue brain should be updated to match the new look. An identity review found recolouring fixed one clash of four: the head was the only gradient left on a flat frame; it put the suite's blue in the top corner of every games page; it answered "what does this company make?" with "AI"; and it was a realistic silhouette beside a ball that hops and asks to be flicked. As a drawing it was an auto-trace nobody could edit, it lost its profile at 16px, and on a light background it all but vanished. The dot was already the liveliest part of the identity and the owner loved it, so a second symbol only competed with it.
- **Alternatives:** A flat redraw of the head (drawn for comparison: cleaner, readable small, still says "AI company" in the suite's colour). Recolour only. The two o's of "doo" as eyes watching the ball (the most character; muddy at 16px and the likeliest to resemble another mark; kept as a possible bit of play on the site, not as the logo). A joystick (generic, and leaves out the apps).
- **Consequences:** A plain amber circle is not distinctive on its own: it is owned through the wordmark and its behaviour, which is acceptable at this size and worth revisiting if the studio grows. Recognition lost is close to nil (about a hundred installs a game, a handful of followers). `og-image.jpg` was redrawn with the wordmark the same day. Still not carrying the mark: the docs site (MkDocs default icon, never had the head), and every avatar the owner controls by hand (GitHub, LinkedIn, TikTok, store developer pages); `images/brand/` holds the files for those. The name will still read as "AI" to some: the answer is to stop illustrating it and to pair the wordmark with "Small games and apps" wherever it first appears. The PNGs were drawn by a script to match the SVG, so a change to the mark means redrawing both.
- **Revisit when:** The owner has lived with it for a week; and at the 2026-11-26 review, with the share card.

## D-021 — The ball gets a paddle: a six-hit rally, with no game over

- **Status:** Accepted on trial (owner, 2026-10-13: "Yeah, let's build it"); builds on D-019
- **Date:** 2026-10-13
- **Decision:** Flicking the wordmark's dot now brings up a paddle at the bottom of the screen. Until the paddle first touches the ball, the bottom of the screen is a floor and the ball behaves as it did under D-019. From the first hit the paddle is the floor: each hit is counted on the paddle ("3 / 6"), the sixth sends the ball home and the Play button reads "Play a real one"; a miss lets the ball fall out of the bottom and drop back into the wordmark from the top. A mouse or a finger steers from anywhere, the arrow keys from a keyboard. So that the page doesn't scroll under a thumb, the bottom half of the screen takes the finger while the ball is out, and the whole screen once the paddle has hit it; on a phone the paddle says "drag to keep it up" until then. The Play button and the "?" step aside while the ball is out.
- **Why:** The owner asked whether the bounce could be a small game. A studio whose logo turns into a few seconds of play says what it makes better than a sentence does, and D-019 had already held "a playable toy in the hero" as the stronger idea. Six hits and no fail state keep it a toy: it ends by itself and points at the real games.
- **Alternatives:** The paddle as the floor from the start (built first: a visitor who only flicks the dot saw the ball for one second, and a phone thumb had under a second to get from the logo to the bottom of the screen). A score or a best (needs storage, which `studio.js` promises not to use). A finger steering only from a 150px strip under the paddle, so the rest of the page kept scrolling (built second: the owner's first go on a phone was "do I not get to move the paddle?", because nothing showed where to touch).
- **Consequences:** `studio.js` still stores and fetches nothing, and no analytics event was added, so whether anyone plays is not measured. The bottom half of the screen takes no taps or clicks while the ball is out, and none of it does during a rally (about ten seconds at most; a miss ends it in one): the court is there on every device, because a touchscreen laptop has both a mouse and a finger. Someone who only flicks the dot can still scroll with the top half. On a phone the paddle rides 92px above the bottom so a thumb doesn't cover it. Reduced-motion visitors get no ball, so no paddle. It landed inside D-018 to D-020's week of living with the look, which muddies that read a little.
- **Revisit when:** The owner has played it on a phone; and at the 2026-11-26 review with the rest of the play.

## D-022 — Keeping a promo game live costs £25 a month

- **Status:** Accepted (owner, 2026-10-13: "Yes, 25 sounds good")
- **Date:** 2026-10-13
- **Decision:** After the three months in the fixed price, a promo game switches off or stays live for £25 a month. The offer page and the chatbot say the number.
- **Why:** "A monthly price we agree first" left a prospect with an open cost and one more thing to negotiate. Claude suggested £25; the owner agreed.
- **Alternatives:** Leaving it to be agreed per client (the wording until now).
- **Consequences:** It is a published price, so it holds for anyone who has seen it. It covers keeping the game live as it is; anything more is priced in writing first, as the page's Questions say.
- **Revisit when:** The first client reaches month three, or at the 2026-11-26 review.

## D-023 — An About page is allowed before the review, as an exception to the P2.1b hold

- **Status:** Accepted (owner, 2026-10-19: captured with this decision; parked until the photo is in)
- **Date:** 2026-10-19
- **Decision:** One new page, `/about/` (P2.1g), may be built before the 2026-11-26 review. It is one page in the studio frame, linked from the footer and from `/promo-games/`, with no nav item and no header change. Everything else in the site rework stays held for P2.1b (D-010, D-011).
- **Why:** It serves the outreach bet, as `/promo-games/` did: outreach emails are signed "Keith", and a small-island café owner buys from someone they can picture, but there is no Keith to find on the site. A full page has room for a photo, why, and the games shipped, where a block on the offer page would crowd the price. Umami shows whether prospects open it, which is a signal for the review.
- **Alternatives:** A short "Who's behind this" block on `/promo-games/` (Claude's first suggestion: smaller, but competes with the price); waiting for P2.1b (leaves the emails without a face for the whole experiment).
- **Consequences:** The page is plainly one person working as "we": no implied team, no claims or numbers we can't back. It can't be built until the owner supplies a photo and a few sentences in the owner's own words.
- **Revisit when:** P2.1b, which folds the page into the reworked site.

## D-024 — The demo pub's prize is a drink, soft drinks included, labelled an example

- **Status:** Superseded by D-025 (2026-10-20). Accepted (owner, 2026-10-20: "a drink on us (pub skin, soft drinks included, labelled an example)")
- **Date:** 2026-10-20
- **Decision:** The made-up pub in the pour demo offers "a drink on us" for the week's top score, soft drinks included, called an example prize. It replaces crisps. This supersedes, for the demo only, P2.0b's "not alcohol" framing and the 2026-10-18 email rule that no prize is a drink.
- **Why:** A pub would offer a drink, so it's the prize that makes the demo look like their game; crisps read as a stand-in. Saying soft drinks count keeps it from being an alcohol promotion, and the example label keeps it from reading as an offer anyone can claim.
- **Alternatives:** Keep crisps until the Isle of Man rules are checked (the rule until now); a named soft drink only.
- **Consequences:** No prize may be a pint, beer or lager alone (a test holds it). A real pub's drinks prize still waits on the owner checking the Isle of Man rules on alcohol promotions; the outreach emails keep their rule until then. The café's prize doesn't change.
- **Revisit when:** The first pub client sets a prize, or the Isle of Man rules are checked.

## D-025 — The demo pub offers a pint, said plainly; the prize's rules are the business's

- **Status:** Accepted (owner, 2026-10-20: "A pint on us sounds more grabby"; "I'd shy away from 'example' wording. Let's make it deliberate and fun to read")
- **Date:** 2026-10-20
- **Decision:** The made-up pub's prize is "a pint on us", with no "soft drinks included" and no "example" label on the prize or the winner's screen. The demo stays honest about what it is through the credit line ("The Wobbly Gull is a made-up pub") and by saying the prize is the business's to set. The offer page says the business chooses the prize, runs it and checks it's allowed where they are. Supersedes D-024.
- **Why:** The demo sells by looking like the real thing a pub would run. Hedged copy read as a demo apologising for itself. The venue is made up and nothing is won, so it isn't a promotion; a real promotion, and its rules, are the business's.
- **Alternatives:** D-024's "a drink on us, soft drinks included", labelled an example.
- **Consequences:** The outreach emails' rule (no drink as a real prize until the Isle of Man rules are checked) relaxes to: the business sets and checks its own prize; we don't advise on promotion law (the chatbot already says so). If a pub asks us what's allowed, we say they should check.
- **Revisit when:** A prospect or the regulator raises it, or a pub client sets a drinks prize.

## D-026 — The offer page speaks as "we", and says we build it and look after it

- **Status:** Accepted (owner, 2026-10-20: "Let's go with we")
- **Date:** 2026-10-20
- **Decision:** `/promo-games/` keeps "we" throughout. Its hero line says "We build it and look after it", and the price card and the chatbot say the game is "hosted and looked after for three months". Outreach emails signed by Keith keep "I build it and look after it".
- **Why:** A café owner's first worry is who keeps the game running. The page already spoke as "we", and mixing voices on one page reads as careless.
- **Alternatives:** Switching the page to "I", to match the About page and the emails.
- **Consequences:** "Live in about two weeks" left the hero line; it stays in "How it goes" and the chatbot (#63).
- **Revisit when:** The About page or a client says the studio reads as bigger than it is.

## D-027 — A prospect hears from us once the demo pours their drink

- **Status:** Accepted (owner, 2026-10-20: "I don't want to reach out to the new prospects until I have a game that speaks their language"; "I like A ... It feels more like milk, for a dairy company"; asked whether a carton should pour it)
- **Date:** 2026-10-20
- **Decision:** A prospect whose drink isn't a pint or a latte isn't contacted until the demo has a skin that pours it. The Isle of Man Creamery waits on a milk skin (P2.0s); Wine Down and Wine Cellar wait on a wine skin (P2.0t, parked). The milk skin is mock A, plain milk, carried forward with a designer agent's review: a milk carton pours it (a new `carton` pourer, the carton's face a label for the dairy's logo), each glug a surge you learn to release between, no bubbles, a straight tumbler, a lighter morning room, and a prize such as "a week's milk on us". At the pitch it wears the Creamery's own colours.
- **Why:** A café's latte link won't persuade a dairy; the demo sells by looking like the thing the business would run. A carton reads as milk, where the steel jug reads as a café. Plain milk has no head, so the glug keeps it a skill.
- **Alternatives:** Emailing with today's links and building on a reply (Claude's first suggestion); a strawberry milkshake (mock B, the strongest skill, but less like a dairy); chocolate milk (mock C); a glass milk bottle (little label room, a steep tip).
- **Consequences:** Outreach to these three waits on a build; the five drafted emails don't. The bottle, an emptying carton, a moving line and a cereal-bowl round wait for a dairy's yes.
- **Revisit when:** The 2026-11-26 review, or a dairy or wine bar gets in touch first.

## D-028 — Outreach emails pitch the drink their link pours, and name no family

- **Status:** Accepted (owner, 2026-10-20: "I'd like for them to not mention the wife and son's name directly", "walk them through why this would be a good fit", "The cafe's should have the latte, not a water bottle suggestion. Bars should have the pints"; the About page stays as it is)
- **Date:** 2026-10-20
- **Decision:** Each outreach email pitches the game its demo link plays: a café the latte, a pub the pint, the Creamery the glass of milk. A custom idea (a bike café's bidon) waits for the conversation. The emails say "a small family studio" and name no family members; the About page, linked in the signature, keeps their names. Each email walks through why the game suits that business (the moment it fills, what they get, the effort on their side) with no claimed results, and says they play it before launch and owe nothing beyond the £300 deposit.
- **Why:** The demo sells by being what they'd run (D-027); asking them to picture something they can't play weakens it. Family names belong on the page someone chooses to open, not in a cold email.
- **Alternatives:** A custom idea per venue in the email (the first rewrite's "fill the bidon"); keeping the family names in the emails.
- **Consequences:** The panto and Hospice, which aren't cafés or bars, open the café link to show how the game plays and pitch their own idea in words.
- **Revisit when:** A prospect replies asking for something the demo doesn't show, or the 2026-11-26 review.
