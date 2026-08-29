# ai.doo — Repo Context for Claude

## What this repo is

Pure static HTML/CSS/JS site — no framework, no build tool, no bundler. Every page is a hand-authored HTML file with inline `<style>` blocks. Changes deploy automatically via GitHub Actions → rsync to VPS.

There is also a small Python/Flask backend (`api/`) that powers the chat widget. It runs as a systemd service on the VPS, proxied through Caddy.

## Pages and paths

| URL path | File |
|----------|------|
| `/` | `index.html` |
| `/pika/` | `pika/index.html` |
| `/pika/changelog` | `pika/changelog.html` |
| `/vera/` | `vera/index.html` |
| `/privacy/` | `privacy/index.html` |
| `/privacy-pomodorable/` | `privacy-pomodorable/index.html` |

## Design system

Shared styles live in `style.css` (loaded by all pages). Individual pages may add inline `<style>` blocks for page-specific components (e.g. the chat widget on the homepage).

### CSS variables (defined in `:root`)
```css
--bg0: #0b1020       /* deepest background */
--bg1: #111a33       /* secondary background */
--ink: #eaf0ff       /* primary text */
--muted: rgba(234,240,255,0.72)  /* secondary/body text */
--accent: #2a8bc9    /* primary accent (buttons, links) */
--accent2: #4db8ff   /* highlight accent (chips, underlines) */
--card: rgba(255,255,255,0.06)
--card2: rgba(255,255,255,0.09)
--stroke: rgba(255,255,255,0.12)
--radius: 16px
--max: 1080px
```

### Typography
- Font: **Inter** — self-hosted variable WOFF2 at `/fonts/inter-latin.woff2` (declared in `style.css` via `@font-face`; no Google Fonts CDN dependency)
- Body line-height: 1.6–1.7
- Headings: `font-weight:700`, negative `letter-spacing`
- Muted body text uses `--muted`, white headings use `#fff` or `--ink`

### Background pattern (used on every page)
```css
background:
  radial-gradient(800px 600px at 20% 8%, rgba(77,184,255,.10), transparent 65%),
  radial-gradient(700px 500px at 80% 25%, rgba(42,139,201,.07), transparent 60%),
  linear-gradient(180deg, var(--bg0), var(--bg1));
```

### Responsive breakpoint
`@media (max-width: 920px)` — collapses nav, stacks grid columns.

### Component patterns
- **Cards**: `border:1px solid var(--stroke); background:var(--card); border-radius:14px; padding:24px`
- **Buttons**: `.btn` (ghost), `.btn.primary` (filled accent), `.btn.subtle` (transparent)
- **Chips**: pill-shaped labels with `--accent2` dot indicator
- **Footer**: `.footerRow` flex row with `.footerCol` columns
- **Steps**: `.steps` 4-column grid, `.step` with `.step-num` label in `--accent2`; connector line via `::after`
- **Pricing cards**: `.pricingTier` (flex-column to pin CTA to bottom), `.pricingCard` (highlighted variant), `.featureList` (bullet list with accent dots)
- **Chat widget**: `.chatFab` (fixed FAB), `.chatPanel` (fixed panel, toggled with `.open`), `.chatMsg.user` / `.chatMsg.assistant`

## Homepage sections (in order)

| Section id | Content |
|-----------|---------|
| `#hero` | Headline, tagline, CTA buttons |
| `#what` | Three feature cards (document intelligence, automation, self-hosted delivery) |
| `#why` | Six self-hosting benefit cards (data never leaves, hardware, air-gap, cost, compliance, auditability) |
| `#how` | Four-step engagement process |
| `#pricing` | Three tiers: Discovery (free), Pilot (from £3,000), Production (custom) |
| `#products` | PIKA, VERA, Hub product cards |
| `#contact` | CTA band + footer |

## Conventions
- Dark theme only — no light mode
- No external CSS frameworks; no Google Fonts CDN (fonts self-hosted in `/fonts/`)
- Favicon: `favicon.svg` (SVG, referenced as `../favicon.svg` from subdirectories)
- Copyright year injected via `document.getElementById("year").textContent = new Date().getFullYear()`
- Legal/privacy pages use `<meta name="robots" content="noindex">`

## Docs site (`docs.aidoo.biz`)

MkDocs Material site at `docs/` + `mkdocs.yml`. Built automatically during deploy.

- Source: `docs/` (Markdown), `mkdocs.yml` (config)
- Build: `mkdocs build -f mkdocs.yml` → `_docs_build/`
- Deploy target: `/var/www/docs.aidoo.biz/` on VPS
- Caddy vhost must be configured manually on VPS to serve `docs.aidoo.biz`

## Deployment

Two-job GitHub Actions workflow on push to `main`:

1. **`deploy`** — fetches PIKA changelog, builds `pika/changelog.html`, builds MkDocs docs site, rsyncs static files to `/var/www/aidoo.biz/` (excludes `api/`, `docs/`, and other non-web files), rsyncs built docs to `/var/www/docs.aidoo.biz/`
2. **`deploy-api`** (runs after `deploy`) — rsyncs `api/` to `/opt/aidoo-api/`, pip-installs requirements, restarts the `aidoo-api` systemd service

## Chat API backend (`api/`)

- **`api/chat.py`** — Flask app, `POST /api/chat`, uses `gpt-4o-mini`, CORS restricted to `aidoo.biz`
- **`api/site_context.py`** — builds chatbot context at service startup from sitemap pages and other public HTML pages with canonical URLs; reads the repository root locally and `/var/www/aidoo.biz` in production (`AIDOO_SITE_ROOT` overrides discovery)
- **`api/requirements.txt`** — `flask`, `openai`, `gunicorn`
- Runs as a systemd service (`aidoo-api`) on the VPS at `127.0.0.1:8765`
- Caddy proxies `location /api/*` to the service
- `OPENAI_API_KEY` stored in `/etc/aidoo-api.env` on VPS and as a GitHub Actions secret

### VPS one-time setup
1. `python3 -m venv /opt/aidoo-api/venv && pip install flask openai gunicorn`
2. Create `/etc/aidoo-api.env` with `OPENAI_API_KEY=...`
3. Install systemd unit at `/etc/systemd/system/aidoo-api.service`
4. Add `reverse_proxy /api/* localhost:8765` to Caddy vhost
5. Add sudoers rule so deploy user can `sudo systemctl restart aidoo-api`

## Products

### PIKA
- Self-hosted document intelligence application — designed to be deployed within an organisation's own infrastructure
- Runs entirely within the customer's own infrastructure — ai.doo never receives or stores customer data
- No cloud dependency; uses local inference models
- Features: RAG, citations, access control, multi-user support
- No user accounts currently; account/deletion flows are planned for future versions
- Marketing/landing page at `/pika/` with a changelog at `/pika/changelog`
- Changelog is auto-generated on deploy (built by the GitHub Actions workflow)

### Pomodorable
- Android focus/productivity app by Aidoo Systems
- Uses Notification Listener Service, Do Not Disturb control, Firebase Analytics, Firebase Crashlytics, Google AdMob
- Privacy policy at `/privacy-pomodorable/`

## Privacy policies

| File | URL | Covers |
|------|-----|--------|
| `privacy/index.html` | `/privacy/` | aidoo.biz website and PIKA |
| `privacy-pomodorable/index.html` | `/privacy-pomodorable/` | Pomodorable Android app |

Both pages use `<meta name="robots" content="noindex">`.

## Key contacts / identity
- Trading as: **ai.doo** / **Aidoo Systems**
- Domain: `aidoo.biz`
- Contact email: `hello@aidoo.biz`
- Jurisdiction: Isle of Man — Data Protection Act 2018 (equivalent to UK GDPR and EU GDPR)
