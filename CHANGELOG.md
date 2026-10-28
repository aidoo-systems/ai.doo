# Changelog

All notable changes to the ai.doo marketing site will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **A live board on the demo game** (P2.0c, D-036): each visit gets a random name like "Brave Heron", every finished game goes on that week's board, and the board shows the week's real top ten among the sample scores. It stores the venue, name, score and week, and nothing else; the privacy policy says so (4b)

### Fixed

- **No flash when a pour is let go** (P2.1i): the result's pop no longer pushes a scrollbar under the game on a desktop browser, and the scene repaints at once whenever its size changes, so it never shows a blank frame

### Changed

- **The café looks like a café** (P2.1h, D-034): every coffee stands on a cream saucer and steams once poured; the cappuccinos have a glass handle and cocoa dusted on the foam. A skin can now give a serve a handle and steam, a saucer wider than the glass, and a fine dust finish
- **The pub and the café change drinks each round** (P2.0v): the pub pours a lager, an ale and a cider; the café a flat white, a latte and a cappuccino, each in its own colour and with its own head or foam
- **The promo game pours milk too** (P2.0s): a made-up dairy, Sleepy Cow, at `/play/pour/?skin=dairy`. The milk comes from a carton that glugs, into a straight glass with no bubbles, and the prize is a week's milk
- **Keeping a promo game live has a price**: £25 a month after the first three months, on the promo-games page and in the chatbot's answers
- **The venue's name stays in sight in the promo game** (P2.0f): the pub's and the café's name and emblem now show while you play and on the results, and the emblem is on the tap's handle and the milk jug
- **The café demo pours like a café** (P2.0c): the made-up café in the promo game now pours milk from a steel jug that tips as you hold, where the pub has its beer tap. What pours the drink is part of a venue's skin
- **A calmer frame for the homepage and the promo-games page** (P2.1d, D-018): a flat dark background with no glow, the games as the only colour, plain buttons and links, quieter headings, and the chat opened from a link in the footer. PIKA and VERA pages are unchanged
- **Play on the homepage** (D-019): a floating Play button that starts something playable, a background that takes the colour of the game you're looking at, a dot in the logo you can flick, and a new typeface for headings
- **A small game in the logo** (D-021): flick the dot and a paddle appears at the bottom of the screen. Keep the ball up six times and it goes home; miss and it drops back into the logo
- **A new logo** (D-020): the ball from the wordmark is now the mark, in the browser tab and on every page; the head-and-brain logo is retired
- The privacy pages and the image shown when a link is shared now match the new look
- **The homepage now leads with the studio** (P2.1a, D-011): "Small games and apps, made with care." Games and apps are shown with their store art, then the promo-games offer, then one line for PIKA and VERA. The enterprise sections (what, why, how, pricing) are gone from the homepage; `/pika/` and `/vera/` are unchanged. Brand recorded in `docs/design/brand.md`
- The chatbot's opening facts now describe the studio first
- PIKA's "engagement options" link and the PIKA changelog nav no longer point at homepage sections that no longer exist
- **Labs is retired** (P2.1c): `/promo-games/` drops the "ai.doo Labs" name and colours for the homepage's look, and links each game and app to its own card on the homepage (`/#reactor-panic` and so on). `/labs/` is out of the sitemap and redirects to the homepage's games

### Fixed

- The VERA changelog page's header was unstyled, with the logo and the "Visit VERA" button stacked in the corner; it now has the same bar as every other page
- VERA's "engagement options" link pointed at a homepage pricing section that no longer exists; it now goes to the homepage's contact band
- Phones no longer scroll sideways by 13px on the homepage and `/labs/`: the hero glow now stops at the screen edge

### Added

- **A promo game you can play** (P2.0a): `/promo-games/` now leads its example with "Pour the perfect pint" for The Wobbly Gull, a made-up pub, at `/play/pint/`. Scan the QR code or tap the link and it plays in the phone's browser: five pours with sound, a score out of 500, stars and a board of clearly labelled sample scores. The same game also plays as a made-up café, The Dozy Otter, to show a reskin. Each leads with its prize ("Top score this week: coffee and cake on us"), and the offer page gains "Why your customers play": the game from the customer's side of the counter, with no claims about takings. The demo now sits under the page's headline with a button for each venue, a Questions block answers who you deal with, how you pay and how a winner claims the prize, and WhatsApp joins email. The demo gains an example winner's screen for staff. The offer page is about half its earlier length
- The chatbot knows the promo-game offer (the demo, the deposit, what's included) and no longer answers promo questions with the AI tools' pilot steps and prices It stores and sends nothing. Tea Tower's Google Play link leaves the offer page, which promises no download
- **Tea Tower privacy policy** at `/privacy-tea-tower/`, listing exactly what the optional leaderboard at ttsb.aidoo.biz receives (random player ID, name, score, cups, version, time), how to switch posting off, and how to have an entry removed
- **Tea Tower on ai.doo Labs**: the in-development one-tap teacup stacker now appears in the games catalogue and footer, linked to its privacy policy; the Games intro now says Godot and Unity
- **Thunee privacy policy** at `/privacy-thunee/`, documenting its fully local save data, zero network access, and absence of ads, analytics, accounts, and tracking
- **Thunee on ai.doo Labs** — the in-development South African partnership card game now appears in the games catalogue
- **Labs sitemap entry** — `/labs/` and the previously omitted VERA changelog are now included in `sitemap.xml`, with accurate `lastmod` dates across the public pages
- **Self-hosted Umami analytics** — cookieless, first-party analytics on every marketing page and the docs site, served from `analytics.aidoo.biz`
  - Marketing pages embed the snippet directly before `</head>` (homepage, PIKA, PIKA changelog, VERA, VERA changelog, both privacy pages)
  - Docs site uses a MkDocs Material custom analytics partial override at `overrides/partials/integrations/analytics/custom.html` with `extra.analytics.provider: custom`
  - Two separate website IDs so marketing and docs traffic report independently
- **VERA changelog page** at `/vera/changelog`, mirroring the PIKA changelog pattern

### Changed

- **Chat rate limit is per visitor.** Behind the proxy every visitor shared one limit of about 10 messages a minute; now each visitor gets their own, with a site-wide ceiling to cap API spend

- **Tea Tower privacy policy uses the site palette**: it had shipped with a one-off brown and amber theme; it now matches every other privacy page
- **Orbital Panic marked live** — its Labs card now links directly to the live Google Play and App Store listings
- **Labs games introduction** broadened from portrait arcade survival to cover both the Panic series and Thunee's procedural card-table play
- **Privacy policy** — rewritten sections 1 and 2 to honestly disclose Umami as our (self-hosted, cookieless, no-PII) analytics provider; removes the previous blanket "no analytics" claims that would be contradicted by the new integration. `lastUpdated` bumped to 7 April 2026
- **Support email consolidated** — `support@aidoo.biz` replaced with `hello@aidoo.biz` across the EULA, troubleshooting docs, homepage, and internal email templates; `hello@aidoo.biz` is the single contact address for now
- **Licensing docs** rewritten to match the shipped graduated enforcement model (grace / licensed / warning / soft / hard)
- **PIKA and VERA API docs** updated for the latest endpoint set, including VERA's invoice export formats, LLM routes, license status API, and Hub-backed user management
- **Homepage pricing and chat context** — pricing tiers harmonised with the pilot figure and the chat widget is now given page context so it can answer questions about the product the visitor is currently reading
- **Installer page** temporarily marked "Coming Soon" until the installer ships

## [2026-04-02]

### Added

- **"Why self-hosted?" section** — six benefit cards (data never leaves, runs on your hardware,
  air-gap capable, predictable cost, compliance-ready, full auditability) inserted on the homepage
  between "What we do" and "How we work"; linked from desktop and mobile nav
- **Self-hosted Inter font** — variable WOFF2 (latin subset) at `/fonts/inter-latin.woff2`;
  declared in `style.css` via `@font-face`. Eliminates the only third-party CDN dependency on
  the site and removes all `fonts.googleapis.com` / `fonts.gstatic.com` requests

### Changed

- **Pilot pricing** — Pilot card now shows "from £3,000 — exact scope agreed upfront" instead
  of "pricing on request"; improves lead pre-qualification and reduces email roundtrips
- **Chat API system prompt** — updated with pilot pricing figure and "Why self-hosted" talking
  points so the chat widget reflects current site content
- **`style.css`** — now committed and tracked; `@font-face` declaration added at top of file

### Fixed

- **Privacy policy — chat history disclosure** (Section 4a) — corrected inaccurate statement
  ("no conversation history is stored") to accurately reflect that session history is sent to
  OpenAI per message for context but is not stored server-side
- **Privacy policy — Section 3** — updated from "Google Fonts" (third-party CDN) to "Fonts —
  self-hosted, no external requests" following the font migration
