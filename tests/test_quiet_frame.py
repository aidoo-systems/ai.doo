"""D-018: the studio pages sit on a flat, quiet frame; PIKA and VERA keep the old chrome."""

import json
import os
import re
import shutil
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
STUDIO_PAGES = ("index.html", "promo-games/index.html", "about/index.html")
ALL_STUDIO_PAGES = STUDIO_PAGES + ("404.html",)
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
    for rel in SUITE_PAGES + ("play/pour/index.html",):
        assert "studio.js" not in _text(rel), rel


def test_the_play_button_only_offers_things_that_play_in_a_browser():
    html = _text("index.html")
    plays = dict(re.findall(r'href="([^"]+)"[^>]*data-play="([^"]+)"', html))
    assert plays == {
        "https://forcesensitivesaiyan.itch.io/submarine-panic": "Play Submarine Panic",
        "https://forcesensitivesaiyan.itch.io/orbital-panic": "Play Orbital Panic",
        "https://forcesensitivesaiyan.itch.io/reactor-panic": "Play Reactor Panic",
        "https://pipes98.com/": "Play Pipes 98",
        "play/pour/": "Pour a pint",
        "stamps/": "Watch a stamp card",
        "https://spice.aidoo.biz/": "Plan a meal",
    }
    # on the offer page it is the demo and nothing that leads a buyer away
    offer = dict(
        re.findall(
            r'href="([^"]+)"[^>]*data-play="([^"]+)"', _text("promo-games/index.html")
        )
    )
    assert offer == {"/play/pour/": "Play the demo"}


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


def test_the_dots_ring_fades_out_and_is_not_pulled_back_in():
    css = _text("style.css")
    loop = css[css.index("@keyframes comeHither{") :]
    rest = re.search(r"0%,62%,100%\{[^}]*\}", loop).group(0)
    # The ring ends wide and faded to nothing. If the dot rested with a visible ring, the
    # last frames of each loop would shrink it back in at speed: a second, quick pulse.
    assert "box-shadow:0 0 0 0 rgba(244,241,234,0)" in rest
    assert "98%{box-shadow:0 0 0 .9em rgba(244,241,234,0)}" in loop


# --- D-021: the ball gets a paddle ----------------------------------------------------


ASKS = "drag to keep it up"  # what the paddle says on a phone until it is first hit


def _driven(**env):
    node = shutil.which("node")
    assert node, "Node.js is needed to run studio.js in the tests"
    done = subprocess.run(
        [node, str(REPO_ROOT / "tests" / "studio_driver.cjs")],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
        env={**os.environ, **env},
    )
    assert done.returncode == 0, done.stderr
    ran = json.loads(done.stdout)
    assert ran["error"] is None
    return ran


def _rally(how):
    return _driven(RALLY=how)["rally"]


def test_six_keep_ups_end_the_rally_and_hand_over_to_a_real_game():
    ran = _rally("keepup")
    assert ran["paddleShown"] and ran["courtShown"] and ran["dockSteppedAside"]
    # the paddle counts every hit and stops at six: the ball goes home by itself
    assert ran["paddleSaid"][1:] == [f"{n} / 6" for n in range(1, 7)]
    # once the rally is on, the whole screen steers and nothing scrolls under the thumb
    assert ran["courtTookTheWholeScreen"]
    assert ran["seconds"] < 25
    assert ran["buttonSaysAfter"] == "Play a real one"
    assert ran["leftBehind"] == [] and ran["dockBack"] and ran["dotBack"]
    assert ran["listenersLeft"] == 0


def test_a_missed_ball_drops_out_and_comes_home_with_no_game_over():
    # one hit starts the rally; after that a miss lets the ball fall out of the bottom
    ran = _rally("miss")
    assert ran["paddleSaid"] == [ASKS, "1 / 6"]
    assert ran["seconds"] < 8
    assert ran["buttonSaysAfter"] == "Play Pipes 98"
    assert ran["leftBehind"] == [] and ran["dockBack"] and ran["dotBack"]
    assert ran["listenersLeft"] == 0


def test_a_ball_nobody_plays_still_bounces_about_as_it_did():
    # until the paddle first touches it the bottom of the screen is a floor, so a visitor
    # who only flicks the dot (or needs a moment to get a thumb down there) loses nothing
    ran = _rally("idle")
    assert ran["paddleSaid"] == [ASKS]
    assert 3 < ran["seconds"] < 9
    # the top half of the page still scrolls for someone who isn't playing
    assert not ran["courtTookTheWholeScreen"]
    assert ran["buttonSaysAfter"] == "Play Pipes 98"
    assert ran["leftBehind"] == [] and ran["dockBack"] and ran["dotBack"]


def test_the_arrow_keys_and_a_finger_on_the_strip_move_the_paddle():
    ran = _rally("keys")
    assert ran["arrowsMoved"] > 60
    # the paddle is 90 wide on a 375 screen, so a finger at 60 centres it there
    assert ran["fingerPutPaddleAt"] == 15
    # and a finger anywhere else steers it too: at 300, so the paddle's left edge is at 255
    assert ran["strayFingerMoved"] == 240


def test_the_paddle_is_drawn_where_the_ball_will_meet_it_after_the_screen_turns():
    # 500 high, 92 above the bottom on a phone, 14 thick
    assert _rally("turn")["paddleTopAfterTurn"] == 500 - 92 - 14


def test_reduced_motion_gets_no_ball_and_no_paddle():
    ran = _rally("calm")
    assert not ran["ballMade"] and not ran["paddleShown"]
    assert ran["dockBack"] and ran["dotBack"]


def test_the_rally_keeps_the_page_scrollable_and_the_dock_out_of_the_way():
    css = _text("style.css")
    court = css[css.index("body.studio .wmCourt{") :].split("}")[0]
    # the bottom half of the screen takes the finger; the top half still scrolls until the rally is on
    assert "touch-action:none" in court and "height:50%" in court
    assert "body.studio .wmCourt.all{height:100%}" in css
    # and it is there on every device: a touchscreen laptop has a mouse and a finger
    assert "body.studio .wmCourt{display:none}" not in css
    assert "body.studio.rally .playDock{" in css


# --- D-041: more play (P2.1m) ---------------------------------------------------------

CARD_COLOURS = ["#008080", "#17533f"]  # the driver's two game cards


def test_six_keep_ups_throw_six_sparks_in_the_games_colours():
    ran = _driven(RALLY="keepup")
    assert ran["sparks"]["thrown"] == 6
    assert ran["sparks"]["colours"] == CARD_COLOURS
    assert ran["sparks"]["leftBehind"] == 0


def test_a_missed_rally_throws_no_sparks():
    assert _driven(RALLY="miss")["sparks"]["thrown"] == 0


def test_the_os_of_doo_watch_the_ball_and_blink_when_it_lands():
    ran = _driven(RALLY="keepup")["eyes"]
    # the word still reads "doo", with a pupil in each o
    assert ran["letters"] == "doo" and ran["eyes"] == 2
    assert ran["watched"] and ran["looks"] > 10
    assert ran["blinked"] == "home"
    # at rest the mark is D-020's again: no pupils, no blink
    assert not ran["stillWatching"] and not ran["stillBlinking"]


def test_the_eyes_are_googly_so_the_look_reads_at_header_size():
    # The owner's pick (B, 2026-11-02): at 24px today's 0.04em was about a pixel. While the
    # ball is out each o fills with the ink and a dark pupil half its size rolls inside it.
    ran = _driven(RALLY="keepup")["eyes"]
    # it rolls about 3px at 24px, and never past the fill's edge (0.26em less the pupil's 0.125em)
    assert 0.1 <= ran["reach"] <= 0.135
    # the blink drains the fill: still full as the eye shuts, gone once it opens
    assert ran["filledAsItShut"] and not ran["stillWatching"]
    css = _text("style.css")
    fill = css[css.index("body.studio .wmEye::before{") :].split("}")[0]
    assert "background:var(--ink)" in fill and "width:.52em" in fill
    # seen only while the ball is out, and fading in rather than popping
    assert "opacity:0" in fill and "transition:opacity" in fill
    assert (
        "body.studio.watching .wmEye::before,\nbody.studio.watching .wmPupil{opacity:1}"
        in css
    )
    pupil = css[css.index("body.studio .wmPupil{") :].split("}")[0]
    assert "background:var(--bg0)" in pupil and "width:.25em" in pupil


def test_reduced_motion_leaves_the_wordmark_as_it_is():
    ran = _driven(RALLY="calm")
    assert "eyes" not in ran or ran["eyes"]["eyes"] == 0


def test_the_demo_opens_over_the_homepage_on_a_computer_and_is_still_counted():
    ran = _driven(SHEET="button")["sheet"]
    assert ran["pageKeptHome"] and ran["opened"] and ran["dialog"]
    assert ran["counted"] == ["play-demo-home"]
    assert ran["frameGoesTo"] == "https://aidoo.biz/play/pour/"
    # one game at a time, the page held still beneath it, one sheet however often you type
    assert ran["dockHidden"] and ran["pageHeld"] and ran["sheets"] == 1
    # and the keyboard stays in the sheet: the page behind it is inert until it goes
    assert ran["pageInert"] and ran["pageBack"]
    # links in the game leave the sheet; Esc from inside the game puts it away, and the game goes
    assert ran["linksLeaveTheSheet"]
    assert ran["closed"] and ran["gone"] and ran["focusBack"]


def test_typing_pour_opens_the_pint_and_esc_puts_it_away():
    ran = _driven(SHEET="word")["sheet"]
    assert ran["opened"] and ran["counted"] == []
    assert ran["closed"] and ran["gone"]


def test_typing_pour_in_the_chat_opens_nothing():
    assert _driven(SHEET="chat")["sheet"]["opened"] is False


def test_a_phone_or_reduced_motion_goes_to_the_games_own_page():
    for how in ("phone", "calm"):
        ran = _driven(SHEET=how)["sheet"]
        assert ran["opened"] is False and ran["pageKeptHome"] is False, how
        assert ran["counted"] == [], (
            how
        )  # the analytics script counts the plain link itself


def test_only_the_homepages_demo_opens_in_a_sheet():
    for rel in ("index.html", "promo-games/index.html", "about/index.html", "404.html"):
        found = re.findall(r"<a [^>]*data-sheet[^>]*>", _text(rel))
        if rel == "index.html":
            assert len(found) == 1 and 'href="play/pour/"' in found[0]
            assert 'data-umami-event="play-demo-home"' in found[0]
        else:
            assert found == [], rel


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
            assert url == "https://aidoo.biz/og-image.jpg?v=4", path
            asked += 1
    assert asked == 6
    # its source is kept, and kept off the public site
    assert (REPO_ROOT / "internal" / "og-card" / "index.html").is_file()
    assert "--exclude='internal/'" in (
        REPO_ROOT / ".github" / "workflows" / "deploy.yml"
    ).read_text(encoding="utf-8")


def test_every_page_that_counts_clicks_loads_the_analytics():
    # D-023: Umami shows whether prospects open /about/; an event with no script counts nothing
    script = 'src="https://analytics.aidoo.biz/script.js"'
    skip = (".claude", ".git", "docs", "_docs_build", "node_modules", "internal")
    pages = [
        p
        for p in REPO_ROOT.rglob("*.html")
        if not set(p.relative_to(REPO_ROOT).parts) & set(skip)
    ]
    counted = [p for p in pages if "data-umami-event=" in p.read_text(encoding="utf-8")]
    assert REPO_ROOT / "about" / "index.html" in counted
    for page in counted:
        assert script in page.read_text(encoding="utf-8"), page.relative_to(
            REPO_ROOT
        ).as_posix()


def test_the_about_page_shows_keith_and_keith_with_bineeta():
    # P2.1g: the photos the owner picked from the shoot, in place of the dashed placeholder
    html = _text("about/index.html")
    assert 'class="photo"' not in html
    hero = html[html.index('<section class="hero aboutHero">') :]
    hero = hero[: hero.index("</section>")]
    assert re.search(
        r'<img [^>]*src="\.\./images/about/keith\.webp"[^>]*width="720" height="900"',
        hero,
    )
    family = re.search(
        r'<img [^>]*src="\.\./images/about/keith-bineeta\.webp"[^>]*>', html
    )
    assert family and 'width="1000" height="800"' in family.group(0)
    assert re.search(r'alt="[^"]*Bineeta[^"]*"', family.group(0))
    for name in ("keith.webp", "keith-bineeta.webp"):
        assert (REPO_ROOT / "images" / "about" / name).stat().st_size < 150_000, name


def test_the_about_page_shows_three_games_with_their_art_uncropped():
    # the card art is Play feature graphics (1024x500); a 16:10 crop cut the titles off
    html = _text("about/index.html")
    made = html[html.index('<div class="made">') :]
    made = made[: made.index("</div>")]
    imgs = re.findall(r"<img [^>]*>", made)
    assert len(imgs) == 3
    for img in imgs:
        assert 'width="1024" height="500"' in img, img
    assert re.search(r"\.made img\{[^}]*aspect-ratio:1024/500", html)
    assert 'href="/#games"' in html


def test_the_homepage_shows_the_games_as_a_shelf_then_the_offers():
    # D-042: the games as a shelf of tiles, then the promo game and stamp card, then the apps
    html = _text("index.html")
    order = [
        html.index(f'id="{s}"') for s in ("games", "promo", "stamps", "apps", "also")
    ]
    assert order == sorted(order)
    assert 'id="process"' not in html
    assert "the games above" in html
    shelf = html[html.index('class="workGrid shelf"') : html.index('id="promo"')]
    tiles = re.findall(r'<article class="work tile[^"]*" id="([^"]+)"', shelf)
    assert tiles == [
        "submarine-panic",
        "reactor-panic",
        "thunee",
        "orbital-panic",
        "tea-tower",
    ]
    assert shelf.count("shelfLead") == 1 and 'tile glow w-submarine shelfLead"' in shelf
    # every tile is one link to a store, and keeps its store links and privacy page in view
    for t in tiles:
        tile = shelf[shelf.index(f'id="{t}"') :]
        tile = tile[: tile.index("</article>")]
        assert 'class="tileLink" href="https://play.google.com/' in tile, t
        assert ">Android</a>" in tile and f'href="privacy-{t}/"' in tile, t
        assert ("data-ios=" in tile) == (">iOS</a>" in tile), t
    assert (
        'href="#promo">promo games</a>' in html
        and 'href="#stamps">stamp cards</a>' in html
    )


# --- D-043 / P2.1n: the footer biscuit --------------------------------------------------

COOKIE_LINE = "No cookie banner. There are no cookies. Have a biscuit instead."
PERFECT = "Perfect dunk."
LOST = "Lost it. Happens to everyone."
GO_ON = "Go on, then."
FIRST = "Go on, then. Now try holding it."
SHORT = "A bit longer."
HINT = "Hold to dunk. Tap to bite."
EATEN = "We'd remember you ate it, but that would need a cookie."


def _biscuit(how):
    return _driven(BISCUIT=how)["biscuit"]


def _classes(text):
    return set(text.split())


def test_every_studio_page_says_there_are_no_cookies_in_the_footer():
    for rel in ALL_STUDIO_PAGES:
        html = _text(rel)
        assert 'class="studio"' in html, rel
        footer = html[html.index("<footer") : html.index("</footer>")]
        assert footer.count(COOKIE_LINE) == 1, rel
        assert "data-biscuit" in footer, rel
        assert "studio.js" in html, rel
    # the words are the owner's: no em dash in them or in the script's copy
    js = _text("studio.js")
    for words in (PERFECT, LOST, GO_ON, FIRST, SHORT, HINT, EATEN):
        assert words in js
    assert chr(0x2014) not in js


def test_no_studio_page_sets_a_cookie_or_embeds_a_third_party():
    for rel in ALL_STUDIO_PAGES + ("studio.js",):
        text = _text(rel)
        assert "document.cookie" not in text, rel
        assert "Set-Cookie" not in text, rel
    for rel in ALL_STUDIO_PAGES:
        html = _text(rel)
        assert "<iframe" not in html.lower(), rel
        for src in re.findall(r'<script[^>]+src="([^"]+)"', html):
            # the pages' own scripts, and the analytics that counts without a cookie (D-043)
            assert not src.startswith("http") or "umami" in src or "aidoo" in src, (
                rel,
                src,
            )


def test_the_biscuit_is_found_and_stays_quiet_until_it_is_pressed():
    ran = _biscuit("under")
    assert ran["mounted"]
    assert ran["start"]["says"] == COOKIE_LINE
    # a button for a keyboard and a screen reader, and the dotted underline only once it works
    assert ran["role"] == "button" and ran["tabindex"] == "0"
    assert "on" in _classes(ran["start"]["root"])
    assert "show" not in _classes(ran["start"]["stage"])
    # nothing moves at the first touch: it could still be a tap
    assert "up" not in _classes(ran["beforeHold"]["stage"])


def test_a_hold_let_go_inside_two_seconds_is_a_perfect_dunk():
    ran = _biscuit("under")
    # held a second: the mug has risen and the biscuit is in, still saying the line
    mid = _classes(ran["mid"]["stage"])
    assert {"show", "up", "dunk"} <= mid
    assert ran["mid"]["says"] == COOKIE_LINE
    assert "busy" in _classes(ran["mid"]["root"])
    # let go at 1.6 s: perfect, soaked at the bottom, one drip
    assert ran["out"]["says"] == PERFECT
    assert "soaked" in _classes(ran["out"]["root"])
    assert "drip" in _classes(ran["out"]["stage"])
    assert "snapped" not in _classes(ran["out"]["stage"]) and "half" not in _classes(
        ran["out"]["root"]
    )
    # then the mug goes back down and the footer is as it was, with a darker biscuit
    assert _classes(ran["after"]["stage"]) & {"show", "up", "dunk", "drip"} == set()
    assert "busy" not in _classes(ran["after"]["root"])
    assert ran["after"]["says"] == PERFECT
    assert ran["timersLeft"] == 0


def test_a_hold_past_two_seconds_snaps_the_soaked_half_off():
    ran = _biscuit("over")
    assert ran["snapped"]["says"] == LOST  # said when it goes, not when you let go
    assert "snapped" in _classes(ran["snapped"]["stage"])
    assert "half" in _classes(ran["snapped"]["root"])
    assert "soaked" not in _classes(ran["snapped"]["root"])
    assert ran["after"]["says"] == LOST
    assert _classes(ran["after"]["stage"]) & {"show", "up", "dunk", "snapped"} == set()
    assert "half" in _classes(ran["after"]["root"])  # you keep the dry half
    # and a tap on what's left is still a bite
    assert ran["bitHalf"]["says"] == FIRST
    assert "bit1" in _classes(ran["bitHalf"]["root"])


def test_three_taps_eat_the_biscuit_and_leave_crumbs():
    ran = _biscuit("taps")
    assert ran["said"] == [FIRST, GO_ON, EATEN, EATEN]
    assert "bit1" in _classes(ran["classes"][0]) and "bit2" not in _classes(
        ran["classes"][0]
    )
    assert "bit2" in _classes(ran["classes"][1]) and "eaten" not in _classes(
        ran["classes"][1]
    )
    assert "eaten" in _classes(ran["classes"][2])
    # a fourth tap changes nothing
    assert ran["classes"][3] == ran["classes"][2]
    # the crumbs stay: the stage is still showing once the biscuit has gone
    assert "show" in _classes(ran["stageLater"])


def test_the_keyboard_dunks_with_enter_and_bites_with_space():
    ran = _biscuit("keys")
    assert {"up", "dunk"} <= _classes(ran["mid"]["stage"])
    assert ran["out"]["says"] == PERFECT
    assert ran["tap"]["says"] == FIRST
    assert ran["other"] == ran["tap"]  # any other key does nothing


def test_a_mouse_dunks_on_hover_after_a_beat_and_bites_on_click():
    ran = _biscuit("hover")
    assert "show" not in _classes(ran["quick"]["stage"])
    assert {"up", "dunk"} <= _classes(ran["mid"]["stage"])
    assert ran["out"]["says"] == PERFECT
    assert ran["click"]["says"] == FIRST


def test_a_screen_readers_click_takes_a_bite_and_a_pointers_click_does_not_double_it():
    ran = _biscuit("at")
    assert ran["click"]["says"] == FIRST
    assert "bit1" in _classes(ran["click"]["root"])
    assert ran["after"] == ran["click"]


def test_reduced_motion_keeps_the_words_and_drops_the_movement():
    ran = _biscuit("calm")
    assert ran["out"]["says"] == PERFECT
    assert "soaked" in _classes(ran["out"]["root"])
    for step in ("mid", "out", "after"):
        assert _classes(ran[step]["stage"]) & {"show", "up", "dunk", "drip"} == set(), (
            step
        )
    css = _text("style.css")
    reduce = css[
        css.index("@media (prefers-reduced-motion:reduce){", css.index("bskStage")) :
    ]
    assert "body.studio .bskStage" in reduce


def test_the_biscuit_writes_nothing_anywhere():
    for how in ("under", "over", "taps", "keys", "hover", "calm", "at"):
        assert _biscuit(how)["stored"] == [], how


def test_a_quiet_hint_says_what_to_do_and_never_promises_a_dunk_under_reduced_motion():
    assert _biscuit("under")["hint"] == HINT
    assert _biscuit("calm")["hint"] == "Tap to bite."
    css = _text("style.css")
    hint = css[css.index("body.studio .bskHint{") :].split("}")[0]
    assert "font-size:12px" in hint and "var(--muted)" in hint
    # a line under the joke, not a shelf: nothing is positioned over the footer for it
    assert "position" not in hint


def test_the_first_bite_teaches_the_hold_and_only_the_first():
    ran = _biscuit("taps")
    assert ran["said"][0] == FIRST
    assert ran["said"][1] == GO_ON


def test_a_hold_let_go_before_it_has_soaked_is_a_bit_longer_not_a_dunk():
    ran = _biscuit("short")
    assert ran["out"]["says"] == SHORT
    assert "soaked" not in _classes(ran["out"]["root"])
    assert "drip" not in _classes(ran["out"]["stage"])
    assert _classes(ran["after"]["stage"]) & {"show", "up", "dunk"} == set()
    # a proper hold afterwards is still a perfect dunk
    assert ran["then"]["says"] == PERFECT
    assert "soaked" in _classes(ran["then"]["root"])
    # and a plain tap is still a bite, never a too-short dunk
    assert _biscuit("taps")["said"][0] == FIRST
