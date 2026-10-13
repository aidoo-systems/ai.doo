# ai.doo brand

Status: draft for owner approval (P2.1a, D-011)
Last updated: 2026-10-13

Every page, store listing and promo pitch takes its identity from this file.
P2.1b builds the rest of the site on it.

## Who we are

**ai.doo is a small studio on the Isle of Man that makes games and apps.**
Labs no longer exists as a separate brand: its games and apps are now ai.doo's
main work. PIKA and VERA stay as ai.doo products, mentioned once and linked,
not leading.

- **Positioning line:** "Small games and apps, made with care."
- **Supporting line:** "We make mobile games, useful little apps and toys for
  the web. And if your business or event wants a game or app of its own,
  we'll make that too." (apps added 2026-10-08, D-014)
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

## Look: colour per game on a flat, quiet frame (D-018, which replaced D-012's chrome)

The chrome stays the original site's, dark and slick. The colour comes from
the games: each one owns a colour, and its card carries it.

| Element | Decision |
|---|---|
| Frame | Flat and silent, so the games are the only colour: one warm near-black, solid surfaces, a solid top bar with the mark unboxed, one plain button, underlined links. No gradient, glow, dotted texture, pill above the headline, gradient text, chip or dot rows, label rules, scroll or hover motion, or floating chat button (the chat opens from a footer link). Carried by `body.studio` in `style.css`, on the homepage and `/promo-games/` |
| Palette | `body.studio` tokens: `--bg0 #141312`, `--card #1d1b1a`, `--stroke #34302d`, `--ink #f4f1ea`, `--muted #b3aca2`, `--focus #f5b544`. The frame has no colour of its own. Blue (`--suite #4db8ff`) belongs to PIKA and VERA, whose pages keep the older navy chrome until stage 2 |
| Game colours | Bright-art games are solid cards: Thunee `#17533f`, Reactor Panic `#d9a03b`, Tea Tower `#6a4a3f`, Pomodorable `#ffd7b5`, Reality Check `#f3e7da`, SPICE `#e8562a`, Pipes 98 `#008080`. Dark-art games are dark cards that glow in their colour (edge, title, hover): Submarine Panic `#f5b544`, Orbital Panic `#4be08a`. Set per game as `.w-<name>` in `index.html` |
| New games | Need a feature graphic, a chosen colour, and a glow colour if the art is dark, before they get a card |
| Promo band | The page's one bright gradient, amber `#f5b544` to orange `#e8562a`, with dark text and the price as its big number |
| Type | Headings in Bricolage Grotesque (self-hosted, SIL OFL 1.1): H1 700 up to 72px, H2 650 up to 40px, card titles 26px. Inter for body and labels. Labels are sentence case, 13px, muted |
| Shape | Big rounded cards (28px radius, art inset with 16px corners). Dark-art games are a solid deep tone of their colour with the title in the bright one. Store links are underlined text, not pills. Nothing moves on hover |
| Play (D-019) | The frame is quiet so three things can be loud: a floating Play button in the colour of the game it starts (the chat is the "?" beside it); the page's background washes to the colour of the game in view; the wordmark's dot is a ball you can flick. All from `studio.js`. Fun comes from play and the games' colours, never from effects |
| Labs palette | Purple `#a78bfa` and cyan `#22d3ee` retire from the main site. `/labs/` and `/promo-games/` keep them until P2.1b reworks those pages |
| Mark (D-020) | The ball from the wordmark: amber `#f5b544`, a shaded side `#e09a2e`, a glint `#ffe9b8`; three flat shapes in `favicon.svg`. The logo is the wordmark with the ball on the baseline between "ai" and "doo"; headers and footers show it alone. Amber at rest, always; other colours only while it bounces. Squares and circles use the ball mid-hop over its shadow on `#141312` (`images/brand/`, `apple-touch-icon.png`). Clear space: one ball's width all round. Never set the name with a typed full stop in the logo. No brains, chips or sparks: the head-and-brain mark is retired |
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

- ~~`/labs/` duplicates the homepage; `/promo-games/` still says "ai.doo Labs".~~ Settled by D-013: Labs retired (P2.1c).
- `/pika/` and `/vera/` still sell pilots; whether they keep doing so waits for
  P2.0's result (D-004, D-010).
- ~~`og-image.png` still shows the AI positioning.~~ Redrawn 2026-10-08 in the D-012 look (studio headline, game cards); now `og-image.jpg` (a new URL, so share caches refetch; under WhatsApp's ~300 KB limit).
- Success measures and the Umami baseline.
