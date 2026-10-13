"""D-018: the studio pages sit on a flat, quiet frame; PIKA and VERA keep the old chrome."""

import json
import os
import re
import shutil
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
STUDIO_PAGES = ("index.html", "promo-games/index.html")
SUITE_PAGES = ("pika/index.html", "vera/index.html")


def _text(rel):
    return (REPO_ROOT / rel).read_text(encoding="utf-8")


def _body(rel):
    html = _text(rel)
    return html[html.index("<body") :]


def test_the_studio_pages_carry_the_quiet_frame_and_the_suite_pages_do_not():
    for rel in STUDIO_PAGES:
        assert '<body class="studio">' in _text(rel), rel
    for rel in SUITE_PAGES:
        assert "<body>" in _text(rel), rel


def test_the_template_tells_are_gone_from_the_studio_pages():
    for rel in STUDIO_PAGES:
        body = _body(rel)
        for tell in (
            'class="pill"',
            'class="grad"',
            'class="chips"',
            'class="chip"',
            'class="heroMeta"',
            'chatFab" aria-label',
            "has-reveal",
        ):
            assert tell not in body, f"{rel}: {tell}"


def test_the_quiet_frame_is_flat_and_scoped():
    css = _text("style.css")
    frame = css[css.index("body.studio{") :]
    # every rule after the first is scoped, so nothing leaks onto PIKA or VERA
    selectors = re.findall(r"^([^{}@/\n][^{}]*)\{", frame, flags=re.MULTILINE)
    # keyframe steps such as "68%{" and the indented rule inside a media query aren't frame selectors
    selectors = [s.strip() for s in selectors if "%" not in s]
    assert selectors
    for selector in selectors:
        assert all(
            part.strip().startswith("body.studio") for part in selector.split(",")
        ), selector
    assert "gradient" not in frame.replace("-webkit-background-clip", "")
    # no glow: the only shadow is the Play button's hard edge, and none of it is blue
    assert "rgba(42,139,201" not in frame and "rgba(77,184,255" not in frame


def test_the_chat_opens_from_a_footer_link_not_a_floating_button():
    html = _text("index.html")
    footer = html[html.index("<footer>") : html.index("</footer>")]
    assert "data-open-chat" in footer
    assert "Ask the site a question" in footer
    # what floats is the Play button; the chat is the small "?" beside it
    dock = html[
        html.index('<div class="playDock">') : html.index("<!-- CHAT")
        if "<!-- CHAT" in html
        else None
    ]
    assert 'id="playFab"' in dock and 'id="chatFab"' in dock
    assert html.count('id="chatFab"') == 1
    assert ".chatFab{" not in html


def test_text_on_every_game_card_meets_aa_contrast():
    def lum(h):
        r, g, b = (int(h[i : i + 2], 16) / 255 for i in (1, 3, 5))
        f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4  # noqa: E731
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

    html = _text("index.html")
    cards = re.findall(r"\.w-([a-z]+)\{([^}]*)\}", html)
    assert len(cards) >= 9
    for name, rule in cards:
        c = re.search(r"--c:(#[0-9a-f]{6})", rule)
        t = re.search(r"--t:(#[0-9a-f]{6})", rule)
        back = c.group(1) if c else "#1d1b1a"
        ink = t.group(1) if t else ("#ffffff" if name == "pipes" else "#f4f1ea")
        hi, lo = sorted((lum(back), lum(ink)), reverse=True)
        assert (hi + 0.05) / (lo + 0.05) >= 4.5, name


# --- D-019: play on the studio pages -------------------------------------------------


def test_both_studio_pages_load_the_play_script_and_the_suite_pages_do_not():
    assert '<script defer src="studio.js"></script>' in _text("index.html")
    assert '<script defer src="../studio.js"></script>' in _text(
        "promo-games/index.html"
    )
    for rel in SUITE_PAGES + ("play/pint/index.html",):
        assert "studio.js" not in _text(rel), rel


def test_the_play_button_only_offers_things_that_play_in_a_browser():
    html = _text("index.html")
    plays = dict(re.findall(r'href="([^"]+)"[^>]*data-play="([^"]+)"', html))
    assert plays == {
        "https://forcesensitivesaiyan.itch.io/submarine-panic": "Play Submarine Panic",
        "https://forcesensitivesaiyan.itch.io/orbital-panic": "Play Orbital Panic",
        "https://forcesensitivesaiyan.itch.io/reactor-panic": "Play Reactor Panic",
        "https://pipes98.com/": "Play Pipes 98",
        "play/pint/": "Pour a pint",
    }
    # on the offer page it is the demo and nothing that leads a buyer away
    offer = dict(
        re.findall(
            r'href="([^"]+)"[^>]*data-play="([^"]+)"', _text("promo-games/index.html")
        )
    )
    assert offer == {"/play/pint/": "Play the demo"}


def test_the_play_script_stores_and_fetches_nothing_and_respects_reduced_motion():
    js = _text("studio.js")
    for api in (
        "localStorage",
        "sessionStorage",
        "document.cookie",
        "fetch(",
        "XMLHttpRequest",
        "sendBeacon",
    ):
        assert api not in js, api
    assert "prefers-reduced-motion" in js
    served = (REPO_ROOT / ".github" / "workflows" / "deploy.yml").read_text(
        encoding="utf-8"
    )
    assert "studio.js" not in served  # not excluded from the deploy


def test_the_heading_typeface_is_self_hosted_with_its_licence():
    css = _text("style.css")
    assert "url('/fonts/bricolage-grotesque-latin.woff2')" in css
    assert (
        REPO_ROOT / "fonts" / "bricolage-grotesque-latin.woff2"
    ).stat().st_size > 20_000
    licence = (REPO_ROOT / "fonts" / "OFL-Bricolage-Grotesque.txt").read_text(
        encoding="utf-8"
    )
    assert "SIL Open Font License" in licence
    assert "fonts.googleapis" not in css and "fonts.gstatic" not in css


def test_the_play_script_survives_a_phone_loading_mid_page():
    # A phone restores a scrolled page with a game card across the middle of the screen:
    # the script must set up the button, the tint, the footer link and the toy, in any order.
    node = shutil.which("node")
    assert node, "Node.js is needed to run studio.js in the tests"
    done = subprocess.run(
        [node, str(REPO_ROOT / "tests" / "studio_driver.cjs")],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
    )
    assert done.returncode == 0, done.stderr
    ran = json.loads(done.stdout)
    assert ran["error"] is None
    # the card in view is teal and playable: the page and the button both follow it
    assert ran["tint"] == ran["themeColour"] != ""
    assert ran["buttonSays"] == "Play Pipes 98"
    assert ran["buttonGoesTo"] == "https://pipes98.com/"
    assert ran["buttonHidden"] is False
    assert ran["footerOpensChat"] == 1
    # the toy is a real, named button placed after the home link, not a span inside it
    assert ran["toyIsButton"] and ran["toyPlacedAfterHomeLink"]
    assert ran["toyLabel"] == "Flick the dot"


def test_a_hidden_play_button_is_really_hidden():
    css = _text("style.css")
    assert "body.studio .playFab[hidden]{display:none}" in css
    # and it starts hidden in the markup, so a page without JavaScript shows no empty button
    for rel in STUDIO_PAGES:
        assert re.search(r'<a class="playFab" id="playFab"[^>]*hidden>', _text(rel)), (
            rel
        )


# --- D-021: the ball gets a paddle ----------------------------------------------------


def _rally(how):
    node = shutil.which("node")
    assert node, "Node.js is needed to run studio.js in the tests"
    done = subprocess.run(
        [node, str(REPO_ROOT / "tests" / "studio_driver.cjs")],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
        env={**os.environ, "RALLY": how},
    )
    assert done.returncode == 0, done.stderr
    ran = json.loads(done.stdout)
    assert ran["error"] is None
    return ran["rally"]


def test_six_keep_ups_end_the_rally_and_hand_over_to_a_real_game():
    ran = _rally("keepup")
    assert ran["paddleShown"] and ran["courtShown"] and ran["dockSteppedAside"]
    # the paddle counts every hit and stops at six: the ball goes home by itself
    assert ran["paddleSaid"][1:] == [f"{n} / 6" for n in range(1, 7)]
    assert ran["seconds"] < 25
    assert ran["buttonSaysAfter"] == "Play a real one"
    assert ran["leftBehind"] == [] and ran["dockBack"] and ran["dotBack"]
    assert ran["listenersLeft"] == 0


def test_a_missed_ball_drops_out_and_comes_home_with_no_game_over():
    # one hit starts the rally; after that a miss lets the ball fall out of the bottom
    ran = _rally("miss")
    assert ran["paddleSaid"] == ["keep it up", "1 / 6"]
    assert ran["seconds"] < 8
    assert ran["buttonSaysAfter"] == "Play Pipes 98"
    assert ran["leftBehind"] == [] and ran["dockBack"] and ran["dotBack"]
    assert ran["listenersLeft"] == 0


def test_a_ball_nobody_plays_still_bounces_about_as_it_did():
    # until the paddle first touches it the bottom of the screen is a floor, so a visitor
    # who only flicks the dot (or needs a moment to get a thumb down there) loses nothing
    ran = _rally("idle")
    assert ran["paddleSaid"] == ["keep it up"]
    assert 3 < ran["seconds"] < 9
    assert ran["buttonSaysAfter"] == "Play Pipes 98"
    assert ran["leftBehind"] == [] and ran["dockBack"] and ran["dotBack"]


def test_the_arrow_keys_move_the_paddle():
    assert _rally("keys")["arrowsMoved"] > 60


def test_reduced_motion_gets_no_ball_and_no_paddle():
    ran = _rally("calm")
    assert not ran["ballMade"] and not ran["paddleShown"]
    assert ran["dockBack"] and ran["dotBack"]


def test_the_rally_keeps_the_page_scrollable_and_the_dock_out_of_the_way():
    css = _text("style.css")
    court = css[css.index("body.studio .wmCourt{") :].split("}")[0]
    # only the strip under the paddle takes the finger; the rest of the page still scrolls
    assert "touch-action:none" in court
    assert "body.studio.rally .playDock{" in css


# --- the privacy pages and the share card join the frame ------------------------------

PRIVACY_PAGES = sorted(
    p.relative_to(REPO_ROOT).as_posix() for p in REPO_ROOT.glob("privacy*/index.html")
)


def test_every_privacy_page_sits_on_the_quiet_frame():
    assert len(PRIVACY_PAGES) == 9
    for rel in PRIVACY_PAGES:
        html = _text(rel)
        assert "--bg0:#141312;" in html, rel
        assert "background:var(--bg0);" in html, rel
        for old in ("0b1020", "111a33", "gradient(", "4db8ff"):
            assert old not in html, f"{rel}: {old}"
        # a privacy page loads no script, style or font from anyone else: the fonts and the mark are ours
        assert "url('/fonts/inter-latin.woff2')" in html, rel
        assert "url('/fonts/bricolage-grotesque-latin.woff2')" in html, rel
        assert "url('/favicon.svg')" in html, rel
        assert not re.search(
            r'(?:src|href)="https?://(?!(?:[a-z]+\.)?aidoo\.biz)[^"]*\.(?:js|css|woff2?)"',
            html,
        ), rel
        assert 'aria-label="Back to ai.doo"' in html, rel


def _jpeg_size(rel):
    data = (REPO_ROOT / rel).read_bytes()
    assert data[:2] == b"\xff\xd8", rel
    i = 2
    while i < len(data):
        assert data[i] == 0xFF, rel
        marker = data[i + 1]
        length = int.from_bytes(data[i + 2 : i + 4], "big")
        if marker in (0xC0, 0xC1, 0xC2):
            return int.from_bytes(data[i + 7 : i + 9], "big"), int.from_bytes(
                data[i + 5 : i + 7], "big"
            )
        i += 2 + length
    raise AssertionError(f"{rel}: no size found")


def test_the_share_card_is_the_right_size_and_every_page_asks_for_the_new_one():
    assert _jpeg_size("og-image.jpg") == (1200, 630)
    assert (REPO_ROOT / "og-image.jpg").stat().st_size < 300_000
    asked = 0
    for path in REPO_ROOT.rglob("*.html"):
        if {".git", "docs", "_docs_build", "internal"} & set(
            path.relative_to(REPO_ROOT).parts
        ):
            continue
        for url in re.findall(
            r'content="(https://aidoo\.biz/og-image[^"]*)"',
            path.read_text(encoding="utf-8"),
        ):
            assert url == "https://aidoo.biz/og-image.jpg?v=3", path
            asked += 1
    assert asked == 6
    # its source is kept, and kept off the public site
    assert (REPO_ROOT / "internal" / "og-card" / "index.html").is_file()
    assert "--exclude='internal/'" in (
        REPO_ROOT / ".github" / "workflows" / "deploy.yml"
    ).read_text(encoding="utf-8")
