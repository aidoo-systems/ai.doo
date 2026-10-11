"""P2.0a: the playable promo showcase at /play/pint/, and its place on /promo-games/.

The game's rules live in play/pint/engine.js and are run here under Node, so a
skin is proved to be data: the tests hand the same engine a skin it has never seen.
"""

import copy
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
GAME = REPO_ROOT / "play" / "pint"
SKIN = GAME / "skins" / "wobbly-gull.json"
DRIVER = REPO_ROOT / "tests" / "pint_driver.cjs"
# What the shipped code may not know about: the first skin's venue and drink.
SKIN_WORDS = re.compile(r"wobbly|gull|pint|\bpub\b|beer|lager", re.IGNORECASE)

# A second venue, written the way a real reskin would be: a file of data.
LATTE = {
    "id": "test-cafe",
    "venue": "Test Kitchen Café",
    "tagline": "Pour the perfect latte",
    "fictional": "Test Kitchen Café is made up.",
    "theme": {
        "bg": "#2b1d16",
        "panel": "#3a281f",
        "ink": "#fff4e6",
        "muted": "#d9c3ad",
        "accent": "#e8a15a",
        "accentInk": "#2b1d16",
        "counter": "#8a5a3a",
        "counterEdge": "#5a3824",
        "metal": "#d8d8d8",
    },
    "drink": {
        "liquid": "#c9a27e",
        "liquidDeep": "#a87f5c",
        "head": "#fffaf2",
        "headDepth": 0.12,
        "glass": [[0, 0], [100, 0], [90, 100], [10, 100]],
    },
    "copy": {
        "start": "Start",
        "beat": "Beat {score}",
        "round": "Latte {n} of {total}",
        "hold": "Hold to pour",
        "release": "Let go",
        "hint": "Let go at the line.",
        "next": "Next latte",
        "finish": "See the board",
        "again": "Pour again",
        "perfect": "Perfect latte",
        "good": "Good pour",
        "short": "A bit short",
        "over": "A bit full",
        "spill": "All over the counter",
        "total": "Your score",
        "boardTitle": "This week at the café",
        "you": "You",
        "prize": "Top of the board gets their name on the wall.",
    },
    "scoring": {"window": 0.25, "perfect": 0.015},
    "rounds": [
        {"line": 0.6, "speed": 0.5},
        {"line": 0.7, "speed": 0.5, "surge": 0.3},
    ],
    "sampleScores": [{"name": "Bean", "score": 150}, {"name": "Milo", "score": 90}],
}


def run(skin_path, plays):
    node = shutil.which("node")
    assert node, "Node.js is needed to run play/pint/engine.js in the tests"
    done = subprocess.run(
        [node, str(DRIVER), str(skin_path), json.dumps(plays)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
    )
    assert done.returncode == 0, done.stderr
    return json.loads(done.stdout)


@pytest.fixture
def latte(tmp_path):
    def write(change=None):
        skin = copy.deepcopy(LATTE)
        if change:
            change(skin)
        path = tmp_path / "skin.json"
        path.write_text(json.dumps(skin), encoding="utf-8")
        return path

    return write


def _text(rel):
    return (REPO_ROOT / rel).read_text(encoding="utf-8")


# --- the rules -----------------------------------------------------------------


def test_the_shipped_skin_is_valid_and_three_perfect_pours_score_300():
    result = run(SKIN, ["line", "line", "line"])
    assert result["problems"] == []
    assert [r["verdict"] for r in result["rounds"]] == ["perfect"] * 3
    assert result["total"] == 300
    assert result["phase"] == "done"


def test_a_second_skin_is_data_alone(latte):
    result = run(latte(), ["line", "line"])
    assert result["problems"] == []
    assert result["labels"] == ["Latte 1 of 2", "Latte 2 of 2"]
    assert [round(r["level"], 2) for r in result["rounds"]] == [0.6, 0.7]
    assert result["total"] == 200
    assert result["phase"] == "done"


def test_the_shipped_code_knows_nothing_about_the_first_skin():
    for rel in ("play/pint/engine.js", "play/pint/game.js", "play/pint/index.html"):
        found = SKIN_WORDS.findall(_text(rel))
        assert found == [], f"{rel}: {found}"


def test_overfilling_spills_and_scores_nothing(latte):
    result = run(latte(), ["never", "line"])
    spilled = result["rounds"][0]
    assert spilled["verdict"] == "spill"
    assert spilled["score"] == 0
    assert result["total"] == 100


def test_a_tap_is_a_short_measure_and_scores_nothing(latte):
    result = run(latte(), [0.01, 0.01])
    assert [r["verdict"] for r in result["rounds"]] == ["short", "short"]
    assert result["total"] == 0


def test_the_score_falls_the_further_the_pour_stops_from_the_line(latte):
    # Round 1 pours at 0.5 a second to a line at 0.6: 1.2s is the line.
    scores = [run(latte(), [held])["rounds"][0]["score"] for held in (0.8, 1.0, 1.2)]
    assert scores == sorted(scores)
    assert scores[0] < scores[1] < scores[2] == 100
    over = run(latte(), [1.4])["rounds"][0]
    assert over["verdict"] == "over"
    assert over["score"] < 100


def test_the_board_ranks_the_player_among_the_samples(latte):
    board = run(latte(), ["line", 0.01])["board"]
    assert [(row["name"], row["score"]) for row in board] == [
        ("Bean", 150),
        ("You", 100),
        ("Milo", 90),
    ]
    assert [row.get("you", False) for row in board] == [False, True, False]


def test_stars_follow_the_share_of_the_best_score(latte):
    # Two rounds: 200 is the best. One perfect pour is half of it, so one star.
    assert run(latte(), ["line", "line"])["stars"] == 3
    assert run(latte(), ["line", 0.01])["stars"] == 1
    assert run(latte(), [0.01, 0.01])["stars"] == 0
    assert run(latte(), ["line", "line"])["topScore"] == 150


@pytest.mark.parametrize(
    "change",
    [
        lambda s: s.pop("rounds"),
        lambda s: s.update(rounds=[]),
        lambda s: s["rounds"][0].update(line=1.0),
        lambda s: s["rounds"][0].update(speed=0),
        lambda s: s["copy"].pop("spill"),
        lambda s: s["theme"].update(bg="url(https://example.com/x)"),
        lambda s: s["drink"].update(glass=[[0, 0], [100, 0]]),
        lambda s: s["sampleScores"].append({"name": "Zed", "score": 999}),
        lambda s: s.update(emblem={"width": 10, "height": 10, "path": "M0 0<script>"}),
        lambda s: s["theme"].pop("counter"),
    ],
)
def test_a_broken_skin_is_refused(latte, change):
    assert run(latte(change), ["line", "line"])["problems"] != []


# --- the page ------------------------------------------------------------------


def test_the_game_page_is_unlisted_and_says_its_scores_are_samples():
    html = _text("play/pint/index.html")
    assert re.search(r'<meta name="robots" content="noindex', html)
    assert 'rel="canonical"' not in html
    assert "/play/" not in _text("sitemap.xml")
    assert "Sample scores" in html
    assert 'href="/promo-games/"' in html


def test_the_game_keeps_and_sends_nothing():
    for rel in ("play/pint/engine.js", "play/pint/game.js", "play/pint/index.html"):
        text = _text(rel)
        for api in (
            "localStorage",
            "sessionStorage",
            "indexedDB",
            "document.cookie",
            "XMLHttpRequest",
            "sendBeacon",
            "WebSocket",
            "<form",
            "<input",
        ):
            assert api not in text, f"{rel}: {api}"
    # The one request the game makes is for its own skin file, by a safe name.
    js = _text("play/pint/game.js")
    assert len(re.findall(r"\bfetch\(", js)) == 1
    assert re.search(r"fetch\(\s*[`\"']skins/", js)
    assert "/^[a-z0-9-]+$/" in js


def test_the_shipped_skin_names_a_made_up_venue_and_no_drink_as_a_prize():
    skin = json.loads(SKIN.read_text(encoding="utf-8"))
    assert "made up" in skin["fictional"].lower() or "made-up" in skin["fictional"]
    assert not re.search(
        r"free (pint|drink|beer)|wins? a (pint|drink|beer)", json.dumps(skin), re.I
    )


def test_deploy_serves_the_game_and_its_skin():
    served = check_site.served_files(REPO_ROOT, check_site.deploy_excludes(REPO_ROOT))
    for rel in (
        "play/pint/index.html",
        "play/pint/engine.js",
        "play/pint/game.js",
        "play/pint/skins/wobbly-gull.json",
        "images/promo/pint-qr.svg",
    ):
        assert rel in served, rel


# --- the offer page ------------------------------------------------------------


def test_the_offer_page_leads_with_the_playable_example():
    html = _text("promo-games/index.html")
    assert 'href="/play/pint/"' in html
    assert 'src="../images/promo/pint-qr.svg"' in html
    # "No app to download" and a store link can't share a page.
    assert "play.google.com" not in html
    assert "tea-tower.webp" not in html
    assert 'href="/#tea-tower"' in html
    assert "made-up pub" in html
