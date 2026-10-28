"""The stamp card demo at /stamps/: a guided walk-through a shop owner opens from a link.

The rules live in stamps/card.js and run here under Node; the page draws them. A business
is a link (?shop=Gelatory&icon=icecream&reward=free%20scoop&color=D74000), so every value
from the link is checked before the page shows it.
"""

import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(
    0,
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts"
    ),
)
import check_site  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
DRIVER = REPO_ROOT / "tests" / "stamps_driver.cjs"


def run(query=None, actions=None):
    node = shutil.which("node")
    assert node, "Node.js is needed to run stamps/card.js in the tests"
    done = subprocess.run(
        [node, str(DRIVER), json.dumps(query or {}), json.dumps(actions or [])],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
    )
    assert done.returncode == 0, done.stderr
    return json.loads(done.stdout)


def _text(rel):
    return (REPO_ROOT / rel).read_text(encoding="utf-8")


# --- the link ------------------------------------------------------------------


def test_a_plain_link_is_the_plain_demo():
    s = run()["settings"]
    assert s["shop"] is None
    assert s["reward"] == "free coffee"
    assert s["stamps"] == 10
    assert re.fullmatch(r"#[0-9a-f]{6}", s["color"])


def test_a_shops_link_puts_their_card_on_the_page():
    s = run(
        {
            "shop": "Gelatory",
            "icon": "icecream",
            "reward": "free scoop",
            "color": "D74000",
            "stamps": "8",
        }
    )["settings"]
    assert s == {
        "shop": "Gelatory",
        "icon": "🍦",
        "reward": "free scoop",
        "color": "#d74000",
        "ink": "#ffffff",
        "stamps": 8,
    }


@pytest.mark.parametrize(
    "query",
    [
        {"shop": "<img src=x onerror=alert(1)>"},
        {"shop": "x" * 33},
        {"shop": " - "},
        {"reward": '"><script>'},
        {"color": "red;background:url(//evil)"},
        {"color": "#12345"},
        {"icon": "constructor"},
        {"stamps": "3"},
        {"stamps": "13"},
        {"stamps": "ten"},
    ],
)
def test_a_value_that_isnt_one_falls_back_to_the_plain_demo(query):
    plain = run()["settings"]
    s = run(query)["settings"]
    for key in query:
        field = "icon" if key == "icon" else key
        assert s[field] == plain[field], (key, s[field])


def test_a_pale_colour_gets_dark_writing():
    assert run({"color": "ffe066"})["settings"]["ink"] == "#1a1a1a"
    assert run({"color": "fff"})["settings"]["color"] == "#ffffff"


def test_a_name_ending_in_s_takes_a_bare_apostrophe():
    assert run()["possessive"] == ["Gelatory's", "Jess'"]


def test_card_codes_avoid_letters_that_read_as_others():
    for code in run()["codes"]:
        assert re.fullmatch(r"[ACDEFGHJKMNPQRTUVWXY34679]{5}", code)


# --- the card ------------------------------------------------------------------


def test_stamps_never_overfill_the_card():
    steps = run({"stamps": "10"}, [["stamp", 8], ["stamp", 5], ["stamp", 1]])["steps"]
    assert [s["count"] for s in steps] == [8, 10, 10]
    assert steps[1]["result"] == 2 and steps[1]["full"]
    assert steps[2]["result"] == 0


def test_the_free_item_comes_only_from_a_full_card():
    steps = run({"stamps": "4"}, [["stamp", 3], ["redeem"], ["stamp", 1], ["redeem"]])[
        "steps"
    ]
    assert steps[1] == {"kind": "redeem", "result": False, "count": 3, "full": False}
    assert steps[3] == {"kind": "redeem", "result": True, "count": 0, "full": False}


def test_undo_puts_back_the_last_change_once():
    steps = run(
        {"stamps": "4"}, [["stamp", 4], ["redeem"], ["undo"], ["undo"], ["stamp", 2]]
    )["steps"]
    assert [s["count"] for s in steps] == [4, 0, 4, 4, 4]
    assert steps[3]["result"] is False


# --- the page ------------------------------------------------------------------


def test_the_page_is_unlisted():
    html = _text("stamps/index.html")
    assert re.search(r'<meta name="robots" content="noindex', html)
    assert 'rel="canonical"' not in html
    assert "/stamps/" not in _text("sitemap.xml")


def test_the_page_keeps_and_sends_nothing():
    for rel in ("stamps/index.html", "stamps/card.js"):
        text = _text(rel)
        for api in (
            "localStorage",
            "sessionStorage",
            "indexedDB",
            "document.cookie",
            "XMLHttpRequest",
            "fetch(",
            "sendBeacon",
            "WebSocket",
            "<form",
            "<input",
            "umami",
        ):
            assert api not in text, f"{rel}: {api}"
    # No third-party anything: every script, stylesheet and font is the site's own.
    html = _text("stamps/index.html")
    assert not re.search(r'(src|href)="(https?:)?//', html)
    assert "url('/fonts/" in html


def test_the_link_is_never_written_into_the_page_as_html():
    # The shop, reward and icon reach the page only as text.
    script = _text("stamps/index.html").split("<script>")[-1]
    for line in script.splitlines():
        if "innerHTML" in line:
            assert not re.search(r"SHOP|REWARD|S\.\w+|query", line), line


def test_the_page_says_it_is_a_demo_and_how_to_ask_for_one():
    html = _text("stamps/index.html")
    assert "A demo by" in html
    assert "mailto:hello@aidoo.biz" in html


def test_the_page_makes_no_promise_the_product_rules_out():
    # loyalty's D-001 and D-004: no accounts, no points, no marketing, no personal data.
    text = re.sub(r"<[^>]+>", " ", _text("stamps/index.html")).lower()
    for claim in ("sign up now", "earn points", "newsletter", "we'll text", "forever"):
        assert claim not in text, claim


def test_deploy_serves_the_demo():
    served = check_site.served_files(REPO_ROOT, check_site.deploy_excludes(REPO_ROOT))
    for rel in ("stamps/index.html", "stamps/card.js"):
        assert rel in served, rel


def test_the_homepage_offers_the_stamp_card_in_a_quiet_band():
    # D-040: one dark band after the promo game's steps, linking the demo
    html = (REPO_ROOT / "index.html").read_text(encoding="utf-8")
    start = html.index('id="stamps"')
    band = html[start : html.index("</section>", start)]
    assert html.index('id="process"') < start < html.index('id="also"')
    assert 'href="stamps/"' in band and "data-tint=" in band
    assert "data-umami-event=" in band
    # the demo plays itself; the Play button offers only games
    assert "data-play" not in band
    text = re.sub(r"<[^>]+>", " ", band)
    assert "Free two-week pilot" in text
    # no wallet named, no price, no em dash (owner, 2026-10-28)
    for word in ("Google", "Apple", "£", "\u2014"):
        assert word not in text, word
    # the page's one bright band stays the promo game's: no gradient here
    assert "gradient" not in band
