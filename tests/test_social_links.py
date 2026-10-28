"""Every page with a footer links the studio's own accounts, and none links an old handle."""

from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
FOOTER_PAGES = [
    "index.html",
    "about/index.html",
    "promo-games/index.html",
    "pika/index.html",
    "vera/index.html",
]
ACCOUNTS = [
    "https://www.facebook.com/profile.php?id=61595609953908",
    "https://www.instagram.com/studioaidoo/",
    "https://www.tiktok.com/@studioaidoo",
    "https://www.linkedin.com/company/ai-doo/",
    "https://github.com/aidoo-systems",
]
OLD_HANDLES = ["@aidoolabs"]


def _footer(page):
    html = (REPO_ROOT / page).read_text(encoding="utf-8")
    return html[html.index("<footer") : html.index("</footer>")]


@pytest.mark.parametrize("page", FOOTER_PAGES)
def test_footer_links_every_account(page):
    footer = _footer(page)
    for url in ACCOUNTS:
        assert f'href="{url}"' in footer, f"{page} footer is missing {url}"


@pytest.mark.parametrize("page", FOOTER_PAGES)
def test_no_old_handles(page):
    html = (REPO_ROOT / page).read_text(encoding="utf-8")
    for handle in OLD_HANDLES:
        assert handle not in html, f"{page} still links {handle}"
