# ai.doo — Repo Context for Claude

## What this repo is

Pure static HTML/CSS/JS site — no framework, no build tool, no bundler. Every page is a hand-authored HTML file with inline `<style>` blocks. Changes deploy automatically via GitHub Actions → rsync to VPS.

## Pages and paths

| URL path | File |
|----------|------|
| `/` | `index.html` |
| `/pika/` | `pika/index.html` |
| `/pika/changelog` | `pika/changelog.html` |
| `/privacy/` | `privacy/index.html` |

## Design system

All CSS is inline in each page's `<style>` block — no shared stylesheet.

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
- Font: **Inter** loaded from Google Fonts (`wght@400;600;700`)
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

## Conventions
- Dark theme only — no light mode
- No external CSS frameworks
- Favicon: `favicon.svg` (SVG, referenced as `../favicon.svg` from subdirectories)
- Copyright year injected via `document.getElementById("year").textContent = new Date().getFullYear()`
- Legal pages use `<meta name="robots" content="noindex">`

## Deployment

Push to `main` → GitHub Actions workflow → `rsync` to `/var/www/aidoo.biz/` on the VPS. No build step. New directories (e.g. `privacy/`) are picked up automatically.

## Products

### PIKA
- Self-hosted document intelligence application
- Runs entirely within the customer's own infrastructure — ai.doo never receives or stores customer data
- Has (or is in the process of getting) an Android app on the **Google Play Store**
- Android app may request device storage (document selection) and camera permissions; all processing is local
- No user accounts currently; account/deletion flows are planned for future versions
- Marketing/landing page at `/pika/` with a changelog at `/pika/changelog`
- Changelog is auto-generated on deploy (built by the GitHub Actions workflow)

## Privacy policy (`/privacy/`)

File: `privacy/index.html`

Sections (as of Feb 2026):
1. Introduction
2. Information we collect (server access logs only)
3. Google Fonts (only meaningful third-party data touch-point)
4. Our apps (PIKA) — includes Android permissions disclosure
5. Cookies (none set)
6. How we use information
7. Data retention (logs ~90 days)
8. Your rights (IOM DPA 2018)
9. Contact
10. Changes to this policy
11. Data deletion (Google Play requirement)

Key notes:
- IOM Data Protection Act 2018 is explicitly called out as equivalent to UK GDPR and EU GDPR — important for Google Play reviewers
- Policy covers both the website and mobile applications on the Google Play Store
- Page uses `<meta name="robots" content="noindex">`

## Key contacts / identity
- Trading as: **ai.doo**
- Domain: `aidoo.biz`
- Contact email: `hello@aidoo.biz`
- Jurisdiction: Isle of Man — Data Protection Act 2018 (equivalent to UK GDPR and EU GDPR)
