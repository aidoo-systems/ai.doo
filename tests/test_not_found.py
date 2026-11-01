"""The 404 page: Caddy serves it for any missing path, so it must work at any depth."""

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PAGE = (REPO_ROOT / "404.html").read_text(encoding="utf-8")


def test_it_sits_on_the_studio_frame_and_carries_the_play():
    assert '<body class="studio">' in PAGE
    assert '<script defer src="/studio.js"></script>' in PAGE


def test_every_local_path_is_absolute():
    # A relative path breaks when the missing page is /a/b/c: style.css would be looked for in /a/b/.
    refs = re.findall(r'(?:href|src)="([^"]+)"', PAGE) + re.findall(
        r"url\('([^']+)'\)", PAGE
    )
    local = [r for r in refs if not re.match(r"(https?:|mailto:|#)", r)]
    assert local, "expected some local paths"
    assert all(r.startswith("/") for r in local), [
        r for r in local if not r.startswith("/")
    ]


def test_search_engines_and_the_chatbot_leave_it_alone():
    assert '<meta name="robots" content="noindex">' in PAGE
    # site_context.py only reads pages with a canonical
    assert 'rel="canonical"' not in PAGE
    assert "404" not in (REPO_ROOT / "sitemap.xml").read_text(encoding="utf-8")


def test_its_play_link_plays_in_a_browser():
    # D-019: only something playable here and now is marked for the Play button.
    assert re.findall(r'href="([^"]+)"[^>]*data-play=', PAGE) == ["/play/pour/"]
