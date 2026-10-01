# Pivot brief: ai.doo as a studio + app-building service?

Status: **open — banked 2026-10-01, to be picked up in a new chat**
Feeds: P2.1 (site rework design). Reopens D-004 (promise and audience).
Next step: `/idea --test` on the pivot (inception A3 stress test), then the P2.1 design doc.

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

In a new chat in `C:\dev\repos\ai.doo`, say *"pick up the pivot brief"*. That means:
`/idea --test` on "pivot ai.doo to a studio plus app-building services". Run the inception skill's **A3 stress test** with the questions above, and capture the cheapest falsifying experiment. Its outcome then sets the direction for the P2.1 design doc (`docs/design/`), and D-004 gets superseded or reaffirmed in `DECISIONS.md`.
