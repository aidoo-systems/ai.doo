"""P2.1c: Labs is retired. Nothing sends a visitor to /labs/, and game links land on homepage cards."""

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", "_docs_build", "docs", "overrides", "node_modules"}
LABS_PALETTE = re.compile(
    r"#a78bfa|#22d3ee|167,\s*139,\s*250|34,\s*211,\s*238", re.IGNORECASE
)
HOME_FRAGMENT = re.compile(r'href="(?:/|\.\./|https://aidoo\.biz/)#([^"]+)"')


def _site_pages():
    for path in sorted(REPO_ROOT.rglob("*.html")):
        if not SKIP_DIRS.intersection(path.relative_to(REPO_ROOT).parts):
            yield path


def _homepage_ids():
    return set(
        re.findall(
            r'\bid="([^"]+)"', (REPO_ROOT / "index.html").read_text(encoding="utf-8")
        )
    )


def test_no_page_links_to_labs():
    offenders = []
    for path in _site_pages():
        if path.parent.name == "labs":
            continue
        for href in re.findall(r'href="([^"]*)"', path.read_text(encoding="utf-8")):
            if re.search(r"(^|/)labs/", href) and "tiktok.com" not in href:
                offenders.append(f"{path.relative_to(REPO_ROOT)}: {href}")
    assert offenders == []


def test_labs_is_not_in_the_sitemap():
    assert "labs" not in (REPO_ROOT / "sitemap.xml").read_text(encoding="utf-8")


def test_labs_redirects_to_the_games_section():
    html = (REPO_ROOT / "labs" / "index.html").read_text(encoding="utf-8")
    assert re.search(r'<meta name="robots" content="noindex', html)
    assert re.search(r'<meta http-equiv="refresh" content="0; url=/#games">', html)
    assert 'rel="canonical"' not in html


def test_promo_page_and_chatbot_drop_the_labs_name_and_palette():
    for rel in ("promo-games/index.html", "api/chat.py"):
        text = (REPO_ROOT / rel).read_text(encoding="utf-8")
        assert "ai.doo Labs" not in text, rel
        assert not LABS_PALETTE.search(text), rel


def test_every_homepage_card_has_an_anchor():
    html = (REPO_ROOT / "index.html").read_text(encoding="utf-8")
    cards = re.findall(r'<article class="work[^"]*"([^>]*)>', html)
    assert cards
    assert all(re.search(r'\bid="[a-z0-9-]+"', attrs) for attrs in cards)


def test_links_to_homepage_sections_land_on_an_anchor_that_exists():
    ids = _homepage_ids()
    missing = []
    for path in _site_pages():
        for fragment in HOME_FRAGMENT.findall(path.read_text(encoding="utf-8")):
            if fragment not in ids:
                missing.append(f"{path.relative_to(REPO_ROOT)}: /#{fragment}")
    assert missing == []


def test_promo_page_links_each_title_to_its_card():
    html = (REPO_ROOT / "promo-games" / "index.html").read_text(encoding="utf-8")
    for card in (
        "submarine-panic",
        "thunee",
        "orbital-panic",
        "reactor-panic",
        "tea-tower",
        "pomodorable",
        "reality-check",
        "spice",
        "pipes-98",
    ):
        assert f'href="/#{card}"' in html, card
