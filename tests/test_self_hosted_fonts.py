"""Fonts come from /fonts/: no page sends a visitor's IP to Google Fonts, and every page that asks for Inter gets it."""

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {
    ".git",
    ".claude",
    "_docs_build",
    "docs",
    "overrides",
    "node_modules",
    "internal",
}
FONT_CDNS = re.compile(r"fonts\.googleapis\.com|fonts\.gstatic\.com", re.IGNORECASE)


def _site_pages():
    for path in sorted(REPO_ROOT.rglob("*.html")):
        if not SKIP_DIRS.intersection(path.relative_to(REPO_ROOT).parts):
            yield path


def test_no_page_loads_a_font_cdn():
    offenders = [
        str(p.relative_to(REPO_ROOT))
        for p in _site_pages()
        if FONT_CDNS.search(p.read_text(encoding="utf-8"))
    ]
    assert offenders == []


def test_pages_that_use_inter_load_it_from_fonts():
    missing = []
    for p in _site_pages():
        html = p.read_text(encoding="utf-8")
        if not re.search(r"font-family:\s*['\"]?Inter", html):
            continue
        if "/fonts/inter-latin.woff2" not in html and not re.search(
            r'href="[^"]*style\.css', html
        ):
            missing.append(str(p.relative_to(REPO_ROOT)))
    assert missing == []
