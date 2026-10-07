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

## Look: colour per game on the original dark chrome (D-012)

The chrome stays the original site's, dark and slick. The colour comes from
the games: each one owns a colour, and its card carries it.

| Element | Decision |
|---|---|
| Chrome | Kept from the original site: the sticky top bar, the navy gradient with the faint dotted texture and blue glow behind the hero, the outlined pill above the headline, blue gradient text on one phrase ("made with care."), the blue primary button with glow and hover lift, the outlined secondary button, and a dotted chip row (Android, iOS, the web, from concept to launch) |
| Palette | Site tokens in `style.css`: `--bg0 #0b1020`, `--bg1 #111a33`, `--ink #eaf0ff`, `--accent #2a8bc9`, `--accent2 #4db8ff`. The chrome's only colour is blue; every other colour belongs to a game |
| Game colours | Bright-art games are solid cards: Thunee `#17533f`, Reactor Panic `#d9a03b`, Tea Tower `#6a4a3f`, Pomodorable `#ffd7b5`, Reality Check `#f3e7da`, SPICE `#e8562a`, Pipes 98 `#008080`. Dark-art games are dark cards that glow in their colour (edge, title, hover): Submarine Panic `#f5b544`, Orbital Panic `#4be08a`. Set per game as `.w-<name>` in `index.html` |
| New games | Need a feature graphic, a chosen colour, and a glow colour if the art is dark, before they get a card |
| Promo band | The page's one bright gradient, amber `#f5b544` to orange `#e8562a`, with dark text and the price as its big number |
| Type | Inter (self-hosted). Hero headline 900 weight, up to 104px, tight tracking; section headings 900; card titles 900 at 28px |
| Shape | Big rounded cards (28px radius, art inset with 16px corners); hover lifts and tilts slightly and glows in the game's colour; no motion under `prefers-reduced-motion` |
| Labs palette | Purple `#a78bfa` and cyan `#22d3ee` retire from the main site. `/labs/` and `/promo-games/` keep them until P2.1b reworks those pages |
| Mark | Keep the head-and-brain mark and the `ai·doo` wordmark. The Labs stars-and-dots variant retires |
| Light mode | None (D-004's non-goal holds) |

If the blue hero glow ever mutes the cards, tone the glow down, not the cards.

## References (owner's picks)

Panic, ustwo games, inkle, Simogo, Snowman, Tinybop. What they share and we
borrow: **the work is the hero** (big art tiles, few words), a one-line studio
claim, a calm frame, and evidence shown rather than asserted. Where they
differ, we take inkle and Snowman's restraint over Simogo's spectacle, because
the brief is "crafted and calm".

## Homepage structure (built in P2.1a)

1. Hero: studio pill ("An independent games and apps studio"), positioning
   line, supporting line, two CTAs (games; promo), chip row. No hero image:
   the type carries it. The Isle of Man stays in the footer and the meta
   description (local search for the promo outreach), not in the hero.
2. Games: Submarine Panic, Thunee, Orbital Panic, Reactor Panic, plus Tea Tower
   marked "In development".
3. Apps & web toys: Pomodorable, Reality Check, SPICE, Pipes 98.
4. For businesses and events: the promo offer, linked to `/promo-games/`
   (owner's choice, 2026-10-07). This adds a second way in, alongside direct
   outreach, so P2.0's results should note where each enquiry came from.
   Followed by "How a promo game gets made": six numbered tiles (concept
   chat, the idea, build, you play it first, launch, three months live),
   the original site's steps in the new look. It ends on the web, as the
   offer does: client store apps aren't offered (D-010).
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
