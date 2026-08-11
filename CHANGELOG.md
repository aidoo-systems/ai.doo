# Changelog

All notable changes to the ai.doo marketing site will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Thunee privacy policy** at `/privacy-thunee/`, documenting its fully local save data, zero network access, and absence of ads, analytics, accounts, and tracking
- **Thunee on ai.doo Labs** — the in-development South African partnership card game now appears in the games catalogue
- **Labs sitemap entry** — `/labs/` and the previously omitted VERA changelog are now included in `sitemap.xml`, with accurate `lastmod` dates across the public pages
- **Self-hosted Umami analytics** — cookieless, first-party analytics on every marketing page and the docs site, served from `analytics.aidoo.biz`
  - Marketing pages embed the snippet directly before `</head>` (homepage, PIKA, PIKA changelog, VERA, VERA changelog, both privacy pages)
  - Docs site uses a MkDocs Material custom analytics partial override at `overrides/partials/integrations/analytics/custom.html` with `extra.analytics.provider: custom`
  - Two separate website IDs so marketing and docs traffic report independently
- **VERA changelog page** at `/vera/changelog`, mirroring the PIKA changelog pattern

### Changed

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
