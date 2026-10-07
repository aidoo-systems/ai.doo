# ai.doo brand

Status: draft for owner approval (P2.1a, D-011)
Last updated: 2026-10-07

Every page, store listing and promo pitch takes its identity from this file.
P2.1b builds the rest of the site on it.

## Who we are

**ai.doo is a small studio on the Isle of Man that makes games and apps.**
Labs no longer exists as a separate brand: its games and apps are now ai.doo's
main work. PIKA and VERA stay as ai.doo products, mentioned once and linked,
not leading.

- **Positioning line:** "Small games and apps, made with care."
- **Supporting line:** "We make mobile games, useful little apps and toys for
  the web. And if your business or event wants a game of its own, we'll make
  that too."
- **Place:** "A small studio on the Isle of Man" sits above the headline and
  in the footer. Being local supports the promo outreach; it is not the lead.

## Voice

- **"We", as a small studio.** Plain, warm, a little dry. Short sentences.
- Say what a thing does, not how good it is. "Pick the fake, then read the
  real sources" rather than "an innovative news experience".
- No claims the work can't back up: no download counts, ratings or "award-
  winning" until they are true and checked (D-004's "no unproven claims"
  still holds).
- Prices appear only where they're settled (promo games: from £750).

## Look: crafted and calm

> **Rejected by the owner, 2026-10-07:** the build below still reads as the old site. Choose from three mocked-up directions (see `CURRENT_SPRINT.md`); whether light mode returns is open.

The frame stays quiet so the game art can be loud.

| Element | Decision |
|---|---|
| Palette | Keep the site tokens in `style.css`: `--bg0 #0b1020`, `--bg1 #111a33`, `--ink #eaf0ff`, `--accent #2a8bc9`, `--accent2 #4db8ff`. Colour comes from the game art, not the chrome |
| Labs palette | Purple `#a78bfa` and cyan `#22d3ee` retire from the main site. `/labs/` and `/promo-games/` keep them until P2.1b reworks those pages |
| Type | Inter (self-hosted), headings 700 with negative tracking, as now |
| Mark | Keep the head-and-brain mark and the `ai·doo` wordmark. The Labs stars-and-dots variant retires. A redraw for the new palette is optional; the current mark already fits it |
| Imagery | Store feature graphics (1024×500) are the main tiles, served as WebP from `images/work/`. Every new game needs one before it gets a tile |
| Light mode | None (product brief non-goal) |

## References (owner's picks)

Panic, ustwo games, inkle, Simogo, Snowman, Tinybop. What they share and we
borrow: **the work is the hero** (big art tiles, few words), a one-line studio
claim, a calm frame, and evidence shown rather than asserted. Where they
differ, we take inkle and Snowman's restraint over Simogo's spectacle, because
the brief is "crafted and calm".

## Homepage structure (built in P2.1a)

1. Hero: place pill, positioning line, supporting line, two CTAs (games;
   promo), Orbital Panic art.
2. Games: Submarine Panic, Thunee, Orbital Panic, Reactor Panic, plus Tea Tower
   marked "In development".
3. Apps & web toys: Pomodorable, Reality Check, SPICE, Pipes 98.
4. For businesses and events: the promo offer, linked to `/promo-games/`
   (owner's choice, 2026-10-07). This adds a second way in, alongside direct
   outreach, so P2.0's results should note where each enquiry came from.
5. One line for PIKA and VERA, with documentation.
6. Contact band and footer.

The chatbot's opening facts now describe the studio first, with the suite
facts kept for visitors who ask.

## Left for P2.1b

- `/labs/` duplicates the homepage. Retire it (redirect to `/#games`) or make
  it the full catalogue.
- `/promo-games/` still says "ai.doo Labs" and uses the Labs palette.
- `/pika/` and `/vera/` still sell pilots; whether they keep doing so waits for
  P2.0's result (D-004, D-010).
- `og-image.png` still shows the AI positioning.
- Success measures and the Umami baseline.
