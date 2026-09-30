# Architecture — aidoo.biz

Last updated: 2026-09-30
Status: Accepted (describes what exists at adoption)

## Quality goals

1. **Accurate**: nothing on the site or docs claims more than ships.
2. **Intact**: every link, asset and sitemap entry resolves.
3. **Cheap to change**: editing a page is editing one HTML file; no build.
4. **Private**: no third-party fonts, CDNs or cookies.

## Context and constraints

One Ubuntu VPS running Caddy. GitHub Actions deploys on push to `main`. The
owner edits pages by hand. The repo also hosts the customer-facing suite docs.

## System / data-flow diagram

```
             push to main
 repo ──────────────────────▶ GitHub Actions
                               ├─ deploy:     fetch PIKA CHANGELOG → build-changelog.py → pika/changelog.html
                               │              mkdocs build → _docs_build/
                               │              rsync site  → VPS /var/www/aidoo.biz      (Caddy file_server)
                               │              rsync docs  → VPS /var/www/docs.aidoo.biz
                               ├─ deploy-api: rsync api/  → VPS /opt/aidoo-api, pip install, restart aidoo-api
                               └─ gates (ci.yml): scripts/gates.sh — parallel, does NOT block deploy

 browser ─▶ Caddy ─┬─ static files                 /var/www/aidoo.biz
                   └─ /api/* ─▶ gunicorn -w 2 :8765 ─▶ api/chat.py ─▶ OpenAI gpt-4o-mini
                                  (site_context.py reads the deployed pages from sitemap.xml at startup)
```

## Domain boundaries and dependency direction

| Part | Files | Depends on |
|---|---|---|
| Marketing site | `index.html`, `pika/`, `vera/`, `labs/`, `style.css`, `fonts/`, `favicon.svg` | nothing at runtime |
| Privacy policies | `privacy*/index.html` (noindex) | nothing; linked from app stores |
| Chat API | `api/chat.py`, `api/site_context.py` | OpenAI; reads the deployed site's `sitemap.xml` and pages |
| Changelog pages | `build-changelog.py` → `pika/changelog.html` | PIKA repo's `CHANGELOG.md`, fetched in deploy |
| Docs site | `docs/` (customer docs), `mkdocs.yml`, `overrides/` | mkdocs-material |
| Studio docs | `docs/PRODUCT_BRIEF.md` … `docs/design/` | excluded from MkDocs by `exclude_docs` |

The chat API depends on the site (its context is the site's own public text),
never the reverse. Adding a page to `sitemap.xml` teaches the chatbot about it
at the next API restart.

## Proposed stack, and alternatives considered

Hand-authored HTML/CSS with inline page styles plus `style.css`; Flask + gunicorn
for the one endpoint; MkDocs Material for docs. A static-site generator or JS
framework was considered at adoption and not taken (D-003).

## Data model — ownership, lifecycle, migration

No database. The chat API keeps an in-memory per-IP request log (lost on
restart) and receives the browser's conversation history per request (last 10
messages). Nothing is persisted.

## Privacy, security, safety, accessibility

- Fonts self-hosted (`/fonts/inter-latin.woff2`). Analytics: self-hosted Umami, cookieless.
- Chat API: CORS restricted to aidoo.biz; `max_tokens=500`; rate limit 10 requests / 60 s per IP.
  **Defect:** behind Caddy `request.remote_addr` is the proxy, so the limit is
  shared by all visitors per worker (P1.5).
- `OPENAI_API_KEY` lives in `/etc/aidoo-api.env` on the VPS and a GitHub secret.
- Deploy rsync uses an exclude list: anything new at the repo root that isn't a
  web file must be added to it, or it is served publicly.

## External services and failure behaviour

| Service | If it fails |
|---|---|
| OpenAI | Chat widget shows an error; the rest of the site is unaffected |
| PIKA repo fetch in deploy | `curl -sf` fails the deploy job; the site is not updated |
| PyPI (mkdocs-material, unpinned) | Deploy fails, or a breaking major version breaks the docs build (P1.4) |

## Testing strategy — and which gates enforce it

`scripts/gates.sh`: `lint`, `format` (ruff) · `tests` (pytest: changelog renderer,
chat endpoint, site context) · `build` (`mkdocs build --strict`) · `audit`
(pip-audit on `api/requirements.txt`, slow tier) · `docs`. The static HTML has
no automated check yet; P1.1 adds one.

## Performance and reliability budgets

None defined. Pages are small static files with one self-hosted font.

## Deployment and operations

See `README.md` (VPS setup) and `.github/workflows/deploy.yml`. There is no
staging environment: `main` is production.

## Known risks and debt

- Gates don't block deploy (D-006).
- Chat rate limit keyed on the proxy address (P1.5).
- Unpinned `mkdocs-material` in deploy (P1.4).
- Nav, footer and `<head>` are copied into every page; drift is caught only by review until P1.1.
