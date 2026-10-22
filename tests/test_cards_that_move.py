"""P2.1e: the first three game cards draw a small scene in code (stage 2 of D-018).

Submarine Panic, Thunee and Orbital Panic are the first three cards in index.html's games
grid; each shows a small drawing made from the game's own shapes, in place of its store
graphic. Out of scope, and untouched by this file: the other cards, gameplay screenshots,
PIKA and VERA.
"""

import json
import os
import re
import shutil
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CARDS = ("submarine-panic", "thunee", "orbital-panic")
# The exact set of files in images/work/ before this item: "no new image files" is tested
# by the directory not growing, whatever drawings replace these cards' <img> tags.
WORK_IMAGES_BEFORE = {
    "orbital-panic.webp",
    "pomodorable.webp",
    "reactor-panic.webp",
    "reality-check.webp",
    "submarine-panic.webp",
    "tea-tower.webp",
    "thunee.webp",
}


def _text(rel):
    return (REPO_ROOT / rel).read_text(encoding="utf-8")


def _card(html, card_id):
    start = html.index(f'id="{card_id}"')
    end = html.index("</article>", start)
    return html[start:end]


def _block(css, needle):
    """The text of the brace-balanced block whose opening brace follows `needle`."""
    start = css.index(needle) + len(needle)
    assert css[start] == "{", needle
    depth = 1
    i = start + 1
    while depth:
        if css[i] == "{":
            depth += 1
        elif css[i] == "}":
            depth -= 1
        i += 1
    return css[start + 1 : i - 1]


def test_the_first_three_cards_draw_in_code_not_a_store_graphic():
    html = _text("index.html")
    for card_id in CARDS:
        card = _card(html, card_id)
        assert "<svg" in card and 'class="cardDrawing' in card, card_id
        assert "<img" not in card, card_id
        assert "images/work/" not in card, card_id
    # the rest of the games section keeps its store graphics
    for card_id in ("reactor-panic", "tea-tower"):
        card = _card(html, card_id)
        assert "<img" in card and "images/work/" in card, card_id


def test_no_new_image_files_were_added():
    names = {p.name for p in (REPO_ROOT / "images" / "work").iterdir()}
    assert names == WORK_IMAGES_BEFORE


def test_each_drawing_keeps_its_alt_text_for_screen_readers():
    html = _text("index.html")
    for card_id in CARDS:
        card = _card(html, card_id)
        m = re.search(r'role="img" aria-label="([^"]+)"', card)
        assert m and len(m.group(1)) > 10, card_id


def test_the_drawings_only_move_without_the_reduced_motion_preference():
    css = _text("index.html")
    motion = _block(css, "@media (prefers-reduced-motion:no-preference)")
    for name in (
        "sweepTurn",
        "blipPulse",
        "pingOut",
        "cardSquish",
        "flipFront",
        "flipBack",
        "shuffleBump",
        "orbitTurn",
    ):
        assert f"@keyframes {name}" in motion, name
    # and nowhere else in the page: a reduced-motion visitor loads no rule that moves them
    rest = css.replace(motion, "")
    for name in (
        "sweepTurn",
        "blipPulse",
        "pingOut",
        "cardSquish",
        "flipFront",
        "flipBack",
        "shuffleBump",
        "orbitTurn",
    ):
        assert f"@keyframes {name}" not in rest, name


def test_every_animated_part_starts_paused_until_a_script_lets_it_run():
    css = _text("index.html")
    for selector in (
        ".sweep",
        ".blip",
        ".flipCard",
        ".cardFront",
        ".cardBack",
        ".orbitPivot",
    ):
        assert re.search(
            re.escape(selector)
            + r"\{animation:[^}]*animation-play-state:paused[^}]*\}",
            css,
        ), selector
    assert "cardDrawing.playing .sweep{animation-play-state:running}" in css
    assert "cardDrawing.playing .blip{animation-play-state:running}" in css
    assert "cardDrawing.playing .flipCard{animation-play-state:running}" in css
    assert "cardDrawing.playing .orbitPivot{animation-play-state:running}" in css


def test_the_play_script_wires_up_the_drawings():
    js = _text("studio.js")
    assert "cardDrawing" in js
    assert "IntersectionObserver" in js
    assert "dataset.react" in js


def test_each_drawing_is_reachable_by_keyboard_and_shows_focus():
    # Codex round 1 (P2): the SVGs had only a click handler, so a keyboard-only visitor
    # could not set off any reaction.
    html = _text("index.html")
    for card_id in CARDS:
        card = _card(html, card_id)
        assert re.search(r'<svg class="cardDrawing"[^>]*\btabindex="0"', card), card_id
    css = _text("index.html")
    assert ".cardDrawing:focus-visible{" in css
    js = _text("studio.js")
    assert '"keydown"' in js
    assert '"Enter"' in js


def _run_driver(calm=False):
    node = shutil.which("node")
    assert node, "Node.js is needed to run studio.js in the tests"
    env = dict(os.environ)
    if calm:
        env["CALM"] = "1"
    done = subprocess.run(
        [node, str(REPO_ROOT / "tests" / "cards_driver.cjs")],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
        env=env,
    )
    assert done.returncode == 0, done.stderr
    ran = json.loads(done.stdout)
    assert ran["error"] is None, ran["error"]
    return ran


def test_a_drawing_off_screen_to_start_is_not_playing_and_plays_once_seen():
    ran = _run_driver()
    assert ran["observedAll"]
    assert ran["playingBeforeSeen"] is False
    assert ran["playingOnScreen"] is True


def test_a_drawing_pauses_again_once_it_leaves_the_screen():
    ran = _run_driver()
    assert ran["playingOffScreen"] is False


def test_a_tap_sets_off_each_drawings_own_reaction_and_it_clears_itself():
    ran = _run_driver()
    assert ran["reactedOnTap"] is True
    assert ran["reactionCleared"] is True
    assert ran["cardsReacted"] is True
    assert ran["orbitReacted"] is True


def test_pressing_enter_sets_off_the_same_reaction_as_a_tap():
    ran = _run_driver()
    assert ran["keyboardReacted"] is True


def test_a_repeat_tap_restarts_the_reaction_instead_of_cutting_it_short():
    # Codex round 1 (P2): a retap just before the first tap's 900ms timeout fired used to
    # let that stale timeout clear the *second* reaction almost immediately.
    ran = _run_driver()
    assert ran["stillReactingAfterRepeatTap"] is True
    assert ran["reactionClearedAfterRepeatTap"] is True
