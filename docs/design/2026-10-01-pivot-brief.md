# Pivot brief: ai.doo as a studio + app-building service?

Status: **decided 2026-10-01: no pivot yet; Phase 0 experiment running to 2026-11-26 (D-010, P2.0)**
Feeds: P2.1 (site rework design). Reopens D-004 (promise and audience).
Next step: run Phase 0 (below); read the results against the bars on 2026-11-26, then P2.1.

## What the owner said (2026-10-01, paraphrased)

- The corporate side (PIKA, VERA, Hub; self-hosted AI pilots) has produced **no leads at all**.
- On the Labs side, **two games have 100+ downloads each**. "Not amazing, but something."
- The owner has learned a lot about app and game development, can now ship better products, and enjoys that work more.
- Idea: pivot ai.doo towards what they enjoy and what seems to have more potential, perhaps **"we create and host apps for you, from concept to store"**. Don't abandon corporate entirely; it feels like a dead end.
- Asked for honest, critical feedback: this is a critical decision.
- Design reference the owner loves: <https://thegeeks.lol/> ("it makes me actually want to look around").

## Claude's feedback (given in chat, 2026-10-01)

**The evidence, read critically**

- *No corporate leads* is real, but it isn't proof of a dead end. Self-hosted enterprise AI rarely sells through inbound on a solo founder's site. It sells through network, outbound, partners and demos. And by the suite's own enterprise roadmap (`.github/ROADMAP.md`), it isn't pilot-ready: the unsupported-claims item is still stop-ship. The test was never run fairly. But running it fairly means months of sales work the owner doesn't enjoy, and for a solo founder that is a legitimate reason to stop.
- *100+ downloads on two games* proves the owner can ship to both stores (Labs lists six store releases plus two web products). It does **not** prove anyone will pay. A hundred installs is roughly friends plus organic store trickle. Revenue and retention are unknown.

**The proposed pivot is a different business from the one that's working**

- The evidence (downloads, enjoyment) points to a **studio making its own products**. "Concept to store for you" is **client services**, sold to founders and small businesses. That market is crowded (agencies, freelancers, no-code and AI app builders) and price-pressured. It brings clients, scope arguments and store rejections, and "hosting" is an open-ended maintenance commitment.
- Services also depend on leads, which is exactly what failed on the corporate side. Moving from one lead-dependent business to another doesn't fix the lead problem.
- Real strengths for it: a visible shipped portfolio, the studio's fast reviewed build pipeline, and a local Isle of Man network (The Geeks is a local example of the kind of client).

**Recommendation: no one-way pivot yet; two cheap bets, about 8 weeks, decided by numbers**

1. **Lead with Labs.** Games and apps become the face of aidoo.biz. PIKA and VERA move to a quieter "For business" section, parked, not deleted. Reversible.
2. **Test the services offer before rebranding.** One page with a concrete fixed-price package (e.g. "your app on Google Play and the App Store in N weeks, from £X"). Take it personally to 20–30 real prospects (local businesses, the owner's network). Set the pass bar up front (e.g. 3 real conversations or 1 paid project). If even that gets no bites, the bottleneck is distribution, not the offer.
3. **Baseline first:** Umami (site), Play Console and App Store Connect (installs, retention, revenue).

**On thegeeks.lol:** worth borrowing from. Strong personality, bold chunky type, a confident orange/purple palette, jokes (a "Do Not Press" button), and a weekly ritual (The Friday Ten) that gives people a reason to return. These ideas suit a Labs-led site. The catch: if services are sold too, playfulness has to coexist with "you can trust me with your money".

## Open questions for the owner (start the next chat here)

1. What does this need to earn, and by when?
2. How many hours a week will you give to selling, as opposed to building?
3. What happens to PIKA, VERA and Hub (several repos and an enterprise roadmap) if corporate is parked? Maintained, frozen, or archived?
4. Which business is it: a studio of your own products, services for clients, or both? If both, which leads?
5. Who are the first 20–30 people you would take a services offer to?
6. What are the real numbers: installs, retention and revenue per game, and site traffic?

## How to pick this up

*Done 2026-10-01.* This section was the hand-off; the stress test and its outcome follow.

## Owner's answers (2026-10-01, second chat)

| Question | Answer |
|---|---|
| Earn what, by when? | Side income (a few hundred to ~£1k/month) within 12 months |
| Selling hours a week | About 0–1. After pushback: 2–3 for a time-boxed 8 weeks |
| Which business? | Both, studio leads; services are a side door |
| PIKA, VERA, Hub? | First "keep developing, under 20%"; after the panel, frozen to security fixes for the 8 weeks |
| First prospects | Isle of Man local businesses |
| Real numbers | Revenue £0. Retention and site traffic not known; Phase 0 measures them |

## Stress test (inception A3)

Panel: business analyst (services demand), app-economics domain expert (studio), IT project manager (capacity). Each was asked for the strongest case against.

- **All three: building was never the bottleneck; distribution was.** Nine products, £0 and zero enterprise leads say the same thing. A plan of more building, a redesign and 0–1 hours of selling is the shape that fails.
- **Studio.** £500/month from ad-funded arcade games needs roughly 500–2,000 daily players, so about 150–400 new installs a day at typical arcade retention (D1 25–35%, D7 5–8%). Today: ~100 per game, lifetime. A 50–100x gap, which more titles don't close, because the stores don't surface unknown games without paid installs. No title has a measured D1 yet. The expert's view (opinion, not evidence): Pomodorable, a utility with search demand, may earn sooner than any arcade game. Figures quoted from memory, ±2x.
- **Services.** Local businesses buy outcomes (bookings, footfall, repeat custom) that cheap tools already deliver. Apple guidelines 4.2 and 4.2.6 reject thin business apps. Hosting is an open-ended on-call commitment at a few hundred pounds. A better shape fits the real strength: short-lived web games and microsites for TT and other events, and branded promo games (a QR code at the till). Fixed price, no store review, a 3-month life.
- **Capacity.** The plan added a business without stopping one. "Suite under 20%" can't be checked. Don't host by default; don't redesign before the evidence, or the redesign becomes the displacement activity.
- **Fault lines.** Services bar: 20 contacts and 2 calls (project manager) or 60 contacts and 1 deposit (analyst). Taken: the deposit, because a conversation costs the prospect nothing. Suite: the owner's "keep developing" against the project manager's freeze. The owner chose the freeze.

## Phase 0: the experiment (2026-10-01 to 2026-11-26)

| Bet | Do | Pass | Kill |
|---|---|---|---|
| Studio | Firebase or GameAnalytics in the best 2 games plus Pomodorable (D1, D7, session length, ad revenue per daily user, store listing conversion). 500–1,000 installs each through Google App Campaigns, mostly cheap countries plus a small UK/US slice. About £300 in all | Any title: D1 ≥ 35% and D7 ≥ 10% (UK/US cost per install ≤ $0.50 is a bonus signal) | Every title under D1 25% or D7 5% |
| Services | One unlisted offer page: fixed-price promo and event web games. 40–60 named Isle of Man businesses and event organisers, contacted directly. 2–3 hours a week | At least 1 deposit of £300 or more | 0 deposits, or every need heard is met by an existing tool |
| Hold | No new titles. No site redesign (P2.1 waits). Suite on security fixes only | n/a | n/a |

Between pass and kill on a studio title: iterate once on onboarding and the first 60 seconds of play, then retest.

**What kills the pivot:** both bets fail. Then the site says honestly that ai.doo is a small studio, rather than being redesigned. If one passes, it leads P2.1, and D-004 is superseded from the data.

**Keep the "we already use X" list.** Every need a prospect names that an existing tool already meets is part of the finding.

## Results (fill in by 2026-11-26)

| Measure | Value |
|---|---|
| Per title: installs bought, spend, D1, D7, session length | |
| Contacts made / conversations / deposits | |
| "We already use X" list | |
| Verdict against the bars | |
