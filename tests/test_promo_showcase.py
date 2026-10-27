"""P2.0a: the playable promo showcase at /play/pour/, and its place on /promo-games/.

The game's rules live in play/pour/engine.js and are run here under Node, so a
skin is proved to be data: the tests hand the same engine a skin it has never seen.
"""

import math
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
GAME = REPO_ROOT / "play" / "pour"
SKINS = sorted((GAME / "skins").glob("*.json"))
DRIVER = REPO_ROOT / "tests" / "pint_driver.cjs"
# What the shipped code may not know about: any shipped skin's venue or drink.
SKIN_WORDS = re.compile(
    r"wobbly|gull|pint|\bpub\b|beer|lager|dozy|otter|latte|coffee|caf[eé]"
    r"|sleepy|\bcow\b|dairy|milk|creamery"
    r"|giddy|puffin|whipp|ice cream|\bcones?\b|flake|kiosk|strawberr|sprinkle|wafer",
    re.IGNORECASE,
)

# A second venue, written the way a real reskin would be: a file of data.
LATTE = {
    "id": "test-cafe",
    "venue": "Test Kitchen Café",
    "tagline": "Pour the perfect latte",
    "fictional": "Test Kitchen Café is made up.",
    "switchLabel": "See it as a test",
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
        "offer": "Top score wins a test",
        "beat": "Beat {score}",
        "round": "Latte {n} of {total}",
        "hold": "Hold to pour",
        "release": "Let go",
        "hint": "Let go at the line.",
        "falseStart": "Keep holding",
        "rival": "{gap} to pass {name}",
        "rivalTop": "{gap} to pass {name} and win",
        "top": "Top",
        "best": "Best {score}",
        "newBest": "New best",
        "claim": "A test prize",
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


# P2.0u: a round's own serve, as the whippy writes one: a swirl over a cone, a stick in it.
CONE = {
    "name": "A test cone",
    "liquid": "#fff6dc",
    "glass": [[30, 0], [70, 0], [95, 100], [5, 100]],
    "vessel": {
        "points": [[0, 100], [100, 100], [50, 180]],
        "colour": "#d9a55b",
        "edge": "#a8742f",
        "grid": True,
    },
    "topping": {"kind": "stick", "colours": ["#5a3218"]},
}


def run(skin_path, plays):
    node = shutil.which("node")
    assert node, "Node.js is needed to run play/pour/engine.js in the tests"
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


def test_four_skins_ship():
    assert [p.stem for p in SKINS] == [
        "dozy-otter",
        "giddy-puffin",
        "sleepy-cow",
        "wobbly-gull",
    ]


def test_the_skin_list_names_files_that_exist_and_ids_match_file_names():
    listing = _text("play/pour/skins/default.js")
    default = re.search(r'POUR_SKIN = "([^"]+)"', listing).group(1)
    listed = re.findall(
        r'"([a-z0-9-]+)"', re.search(r"POUR_SKINS = \[(.*?)\]", listing).group(1)
    )
    assert sorted(listed) == [p.stem for p in SKINS]
    assert default in listed
    for path in SKINS:
        assert json.loads(path.read_text(encoding="utf-8"))["id"] == path.stem


@pytest.mark.parametrize("path", SKINS, ids=lambda p: p.stem)
def test_every_shipped_skin_is_valid_and_perfect_pours_score_full_marks(path):
    rounds = len(json.loads(path.read_text(encoding="utf-8"))["rounds"])
    result = run(path, ["line"] * rounds)
    assert result["problems"] == []
    assert [r["verdict"] for r in result["rounds"]] == ["perfect"] * rounds
    assert result["total"] == rounds * 100
    assert result["stars"] == 3
    assert result["rival"] is None
    assert result["phase"] == "done"


@pytest.mark.parametrize("path", SKINS, ids=lambda p: p.stem)
def test_every_shipped_skin_forgives_a_tap(path):
    rounds = len(json.loads(path.read_text(encoding="utf-8"))["rounds"])
    result = run(path, [0.02] + ["line"] * rounds)
    assert result["falseStarts"] == 1
    assert result["total"] == rounds * 100


def test_a_second_skin_is_data_alone(latte):
    result = run(latte(), ["line", "line"])
    assert result["problems"] == []
    assert result["labels"] == ["Latte 1 of 2", "Latte 2 of 2"]
    assert [round(r["level"], 2) for r in result["rounds"]] == [0.6, 0.7]
    assert result["total"] == 200
    assert result["phase"] == "done"


def test_the_shipped_code_knows_nothing_about_the_first_skin():
    for rel in ("play/pour/engine.js", "play/pour/game.js", "play/pour/index.html"):
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


def test_a_false_start_empties_the_glass_and_keeps_the_round(latte):
    forgiving = latte(lambda s: s["scoring"].update(falseStart=0.08))
    # 0.1s at 0.5 a second is 0.05 of the glass: under the bar, so not a pour.
    result = run(forgiving, [0.1, "line", "line"])
    assert result["falseStarts"] == 1
    assert [r["verdict"] for r in result["rounds"]] == ["perfect", "perfect"]
    assert result["total"] == 200
    # 0.2s is 0.1 of the glass: over the bar, so it counts, and scores nothing.
    counted = run(forgiving, [0.2, "line"])
    assert counted["falseStarts"] == 0
    assert counted["rounds"][0]["verdict"] == "short"


def test_the_rival_is_the_next_sample_score_up(latte):
    # Bean holds the top score, so passing Bean is what wins the prize.
    assert run(latte(), ["line", 0.01])["rival"] == {
        "name": "Bean",
        "gap": 50,
        "top": True,
    }
    assert run(latte(), [0.01, 0.01])["rival"] == {
        "name": "Milo",
        "gap": 90,
        "top": False,
    }
    assert run(latte(), ["line", "line"])["rival"] is None


def test_a_slower_surge_changes_how_the_same_hold_pours(latte):
    # Round 2 surges. Held for the same 0.5s, a different pulse rate pours a different amount.
    def poured(hz):
        skin = latte(lambda s: s["rounds"][1].update(surgeHz=hz))
        return run(skin, ["line", 0.5])["rounds"][1]["level"]

    assert poured(0.5) != pytest.approx(poured(2), abs=0.005)


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
        # D-030, logo B: an emblem may name how its path fills, as one of the canvas's two ways.
        lambda s: s.update(
            emblem={"width": 10, "height": 10, "path": "M0 0 L9 9 Z", "rule": "holes"}
        ),
        lambda s: s["theme"].pop("counter"),
        lambda s: s.pop("switchLabel"),
        lambda s: s["copy"].pop("offer"),
        lambda s: s["copy"].pop("claim"),
        # A glass drawn with headroom above its rim, and one that is a flat line: both
        # would leave the canvas with nothing to mark the line against.
        lambda s: s["drink"].update(glass=[[10, 20], [90, 20], [80, 100], [20, 100]]),
        lambda s: s["drink"].update(glass=[[0, 50], [50, 50], [100, 50]]),
        # A line a false start can reach could never be scored on.
        lambda s: (
            s["scoring"].update(falseStart=0.3),
            s["rounds"][0].update(line=0.35),
        ),
        lambda s: s["copy"].pop("rivalTop"),
        lambda s: s["rounds"][1].update(surgeHz=9),
        lambda s: s["scoring"].update(falseStart=0.5),
        # Five hex digits is no CSS colour: the canvas would throw on it mid-game.
        lambda s: s["theme"].update(counter="#12345"),
        lambda s: s["drink"].update(liquid="#1234567"),
        # What pours the drink is one of the kinds game.js can draw, and nothing else.
        lambda s: s["drink"].update(pourer="hose"),
        lambda s: s["drink"].update(stream="white"),
        # Fizz is on or off, nothing in between.
        lambda s: s["drink"].update(fizz="no"),
        # P2.0u: the top and the outline are kinds game.js can draw.
        lambda s: s["drink"].update(top="fizzy"),
        lambda s: s["drink"].update(outline="dotted"),
        # A round's serve is checked like the drink it stands in for.
        lambda s: s["rounds"][1].update(serve="cone"),
        lambda s: s["rounds"][1].update(serve=dict(CONE, liquid="#12")),
        lambda s: s["rounds"][1].update(serve=dict(CONE, name="")),
        lambda s: s["rounds"][1].update(serve=dict(CONE, name="A" * 41)),
        lambda s: s["rounds"][1].update(serve=dict(CONE, headDepth=0.5)),
        # What pours, the fizz, the top and the outline are the skin's, not a round's.
        lambda s: s["rounds"][1].update(serve=dict(CONE, pourer="tap")),
        lambda s: s["rounds"][1].update(serve=dict(CONE, fizz=True)),
        # A serve's glass has to be open at its own round's line.
        lambda s: s["rounds"][1].update(
            serve=dict(CONE, glass=[[45, 0], [55, 0], [55, 100], [45, 100]])
        ),
        lambda s: s["rounds"][1].update(
            serve=dict(
                CONE,
                vessel=dict(CONE["vessel"], points=[[0, 100], [50, 250], [100, 100]]),
            )
        ),
        lambda s: s["rounds"][1].update(
            serve=dict(CONE, vessel=dict(CONE["vessel"], colour="tan"))
        ),
        lambda s: s["rounds"][1].update(
            serve=dict(CONE, vessel={"points": [[0, 100]], "colour": "#d9a55b"})
        ),
        lambda s: s["rounds"][1].update(
            serve=dict(CONE, topping={"kind": "flake", "colours": ["#5a3218"]})
        ),
        lambda s: s["rounds"][1].update(
            serve=dict(CONE, topping={"kind": "stick", "colours": []})
        ),
        lambda s: s["rounds"][1].update(
            serve=dict(CONE, topping={"kind": "scatter", "colours": ["red"]})
        ),
        lambda s: s["drink"].update(topping={"kind": "drizzle"}),
    ],
)
def test_a_broken_skin_is_refused(latte, change):
    assert run(latte(change), ["line", "line"])["problems"] != []


def test_a_skin_says_what_pours_the_drink_and_what_colour_it_pours(latte):
    jug = latte(lambda s: s["drink"].update(pourer="jug", stream="#fffaf0"))
    assert run(jug, ["line", "line"])["problems"] == []
    assert run(latte(), ["line", "line"])["problems"] == []


def test_a_skin_can_pour_from_a_carton_and_turn_its_fizz_off(latte):
    # P2.0s: milk comes from a carton and has no bubbles; a skin that doesn't say still fizzes.
    milk = latte(lambda s: s["drink"].update(pourer="carton", fizz=False))
    assert run(milk, ["line", "line"])["problems"] == []
    fizzy = latte(lambda s: s["drink"].update(fizz=True))
    assert run(fizzy, ["line", "line"])["problems"] == []


def test_the_shipped_venues_do_not_pour_from_the_same_thing():
    pourers = {
        path.stem: json.loads(path.read_text(encoding="utf-8"))["drink"].get(
            "pourer", "tap"
        )
        for path in SKINS
    }
    assert pourers == {
        "wobbly-gull": "tap",
        "dozy-otter": "jug",
        "sleepy-cow": "carton",
        "giddy-puffin": "machine",
    }


# --- the page ------------------------------------------------------------------


def test_the_game_page_is_unlisted_and_says_its_scores_are_samples():
    html = _text("play/pour/index.html")
    assert re.search(r'<meta name="robots" content="noindex', html)
    assert 'rel="canonical"' not in html
    assert "/play/" not in _text("sitemap.xml")
    assert "Sample scores" in html
    assert 'href="/promo-games/"' in html


def test_the_game_keeps_and_sends_nothing():
    for rel in ("play/pour/engine.js", "play/pour/game.js", "play/pour/index.html"):
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
    js = _text("play/pour/game.js")
    assert len(re.findall(r"\bfetch\(", js)) == 1
    assert re.search(r"fetch\(\s*[`\"']skins/", js)
    assert "/^[a-z0-9-]+$/" in js


@pytest.mark.parametrize("path", SKINS, ids=lambda p: p.stem)
def test_every_shipped_skin_names_a_made_up_venue(path):
    skin = json.loads(path.read_text(encoding="utf-8"))
    assert "made up" in skin["fictional"].lower() or "made-up" in skin["fictional"]


@pytest.mark.parametrize("path", SKINS, ids=lambda p: p.stem)
def test_every_shipped_tagline_fits_one_line_beside_the_sound_button(path):
    # At 320px a named link drops the emblem and the tagline sits level with the sound
    # button: 30 letters ran under it and wrapped, squeezing the glass. The café's 22 fit.
    skin = json.loads(path.read_text(encoding="utf-8"))
    assert len(skin["tagline"]) <= 22, skin["tagline"]


def test_deploy_serves_the_game_and_its_skin():
    served = check_site.served_files(REPO_ROOT, check_site.deploy_excludes(REPO_ROOT))
    for rel in (
        "play/pour/index.html",
        "play/pour/engine.js",
        "play/pour/game.js",
        "play/pour/skins/default.js",
        "play/pour/skins/wobbly-gull.json",
        "play/pour/skins/dozy-otter.json",
        "play/pour/skins/sleepy-cow.json",
        "images/promo/pour-qr.svg",
    ):
        assert rel in served, rel


# --- the offer page ------------------------------------------------------------


def test_the_offer_page_leads_with_the_playable_example():
    html = _text("promo-games/index.html")
    assert 'href="/play/pour/"' in html
    assert 'href="/play/pour/?skin=dozy-otter"' in html
    assert 'src="../images/promo/pour-qr.svg"' in html
    # "No app to download" and a store link can't share a page.
    assert "play.google.com" not in html
    assert "tea-tower.webp" not in html
    assert 'href="/#tea-tower"' in html
    assert "made-up pub" in html


def test_the_offer_page_walks_through_the_customers_side_and_claims_no_results():
    html = _text("promo-games/index.html")
    assert 'id="why"' in html
    # The prize it quotes is the one the café demo actually shows.
    cafe = json.loads((GAME / "skins" / "dozy-otter.json").read_text(encoding="utf-8"))
    assert cafe["copy"]["offer"] in html
    # No numbers we don't have: no percentages, no "increase", no "proven".
    why = html[html.index('id="why"') : html.index('id="how"')]
    assert not re.search(r"\d\s*%|increase|boost|proven|guarantee", why, re.IGNORECASE)
    assert "won't make them up" in why


def test_the_offer_page_is_measured_and_the_game_is_not():
    # "Nothing is stored or sent" is printed on the game: no analytics may load there.
    for rel in ("play/pour/index.html", "play/pour/game.js", "play/pour/engine.js"):
        assert "analytics" not in _text(rel), rel
    offer = _text("promo-games/index.html")
    assert "analytics.aidoo.biz/script.js" in offer
    for event in ("play-demo-hero", "play-demo-pub", "play-demo-cafe", "email-contact"):
        assert f'data-umami-event="{event}"' in offer, event
    assert 'data-umami-event="whatsapp-contact"' in offer
    # Coming back from the game is visible as its own page view.
    assert 'href="/promo-games/?from=demo#price"' in _text("play/pour/index.html")


def test_the_offer_page_puts_the_demo_first_and_answers_the_buyers_questions():
    html = _text("promo-games/index.html")
    order = [
        html.index(f'id="{name}"')
        for name in ("try", "why", "price", "how", "questions", "contact")
    ]
    assert order == sorted(order)
    assert "wa.me/447624396325" in html
    # Claims the review found untrue or unproven stay out.
    for phrase in (
        "built the same way",
        "any phone",
        "compete and come back",
        "one of skill",
    ):
        assert phrase not in html, phrase


def test_the_demo_shows_a_winners_screen():
    html = _text("play/pour/index.html")
    assert 'id="claimOpen"' in html and 'id="claim"' in html
    assert "only the real winner" in html
    for path in SKINS:
        assert json.loads(path.read_text(encoding="utf-8"))["copy"]["claim"], path.stem


def test_the_winners_screen_claims_only_what_it_does():
    # P2.0n: a moving clock is beaten by a screen recording, so nothing may say it proves
    # the win. The line says what a live game would do instead: a one-off code staff mark used.
    html = _text("play/pour/index.html")
    claim = html[html.index('id="claim"') :]
    faq = _text("promo-games/index.html")
    for text in (claim, faq, _text("play/pour/game.js")):
        for phrase in (
            "isn't a screenshot",
            "can't be a screenshot",
            "shows it isn't",
            "proves",
            "proof",
        ):
            assert phrase not in text, phrase
    assert "one-off code" in claim and "one-off code" in faq


def test_the_pub_offers_a_pint_and_reads_as_meant():
    # P2.0q (D-025): the made-up pub offers what a pub would, a pint, and says it plainly.
    # The page's own copy calls the venue made up; nothing calls the prize an example.
    copy_ = json.loads(
        (GAME / "skins" / "wobbly-gull.json").read_text(encoding="utf-8")
    )["copy"]
    for key in ("offer", "prize", "claim"):
        assert "pint on us" in copy_[key].lower(), key
    for path in SKINS:
        for key, line in json.loads(path.read_text(encoding="utf-8"))["copy"].items():
            assert "example" not in line.lower(), (path.stem, key)
            assert "crisps" not in line, (path.stem, key)


def test_the_title_screen_leads_with_the_prize_and_says_its_theirs_to_set():
    html = _text("play/pour/index.html")
    assert 'id="offer"' in html
    assert "the prize is yours to set" in html
    for path in SKINS:
        skin = json.loads(path.read_text(encoding="utf-8"))
        assert skin["copy"]["rivalTop"].count("{gap}") == 1, path.stem
        assert skin["copy"]["offer"], path.stem


# --- the screen code itself, run against a stand-in page ----------------------------


@pytest.fixture(scope="module")
def ui():
    node = shutil.which("node")
    assert node, "Node.js is needed to run play/pour/game.js in the tests"
    done = subprocess.run(
        [node, str(REPO_ROOT / "tests" / "pint_ui_driver.cjs")],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
    )
    assert done.returncode == 0, done.stderr
    return json.loads(done.stdout)


def test_only_the_pouring_finger_can_end_the_pour(ui):
    # Another finger lifting, a stray key or a cancelled touch elsewhere changes nothing.
    assert ui["afterSecondFinger"] == ui["release"]
    assert ui["afterStrayKey"] == ui["release"]
    assert ui["afterStrayCancel"] == ui["release"]
    # Likewise at a keyboard: only the key that started the pour ends it.
    assert ui["afterOtherKey"] == ui["release"]
    assert re.search(r"\+\d+$", ui["afterOwnKey"])
    # Lifting the finger that is pouring ends it and scores it.
    assert re.search(r"\+\d+$", ui["afterOwnFinger"])


def test_a_hidden_page_makes_no_sound_and_waits_for_the_player(ui):
    assert ui["soundsWhileHidden"] == 0
    # The pour was ended and scored, but the game did not move on unseen.
    assert re.search(r"\+\d+$", ui["sayWhileHidden"])
    assert ui["roundWhileHidden"] == ui["roundAtStart"]
    assert ui["roundAfterReturn"] != ui["roundAtStart"]


def test_an_unknown_skin_falls_back_to_the_default_one(ui):
    assert ui["unknownSkin"]["fetched"] == [
        "skins/nope.json",
        "skins/wobbly-gull.json",
    ]
    assert ui["unknownSkin"]["venue"] == "The Wobbly Gull"
    assert ui["unknownSkin"]["start"] is False


def test_a_link_can_name_the_kind_of_venue(ui):
    # P2.0q: an email to a café links ?skin=cafe; the kinds are data, in default.js.
    assert ui["kindSkin"]["fetched"] == ["skins/dozy-otter.json"]
    assert ui["kindSkin"]["venue"] == "The Dozy Otter"
    assert ui["oddKind"]["fetched"] == [
        "skins/constructor.json",
        "skins/wobbly-gull.json",
    ]
    kinds = _text("play/pour/skins/default.js")
    for kind in ("pub", "cafe", "dairy", "icecream"):
        assert re.search(kind + r'\s*:\s*"[a-z0-9-]+"', kinds), kind


def test_a_skin_name_cannot_leave_the_skins_folder(ui):
    assert ui["unsafeSkin"]["fetched"] == ["skins/wobbly-gull.json"]


def test_the_pourer_a_skin_names_is_the_one_drawn(ui):
    # A skin that doesn't say gets the tap, drawn exactly as it always was.
    assert ui["pourers"]["unsaid"] == ui["pourers"]["tap"]
    assert ui["pourers"]["jug"] != ui["pourers"]["tap"]


def test_the_stream_takes_the_colour_the_skin_gives_it(ui):
    assert ui["streams"] == {"#abcdef": True, "unsaid": False}


def test_the_venue_is_named_while_playing_and_on_the_results(ui):
    # "Your name on it" is the product: the name may not vanish after the title screen.
    html = _text("play/pour/index.html")
    play = html[html.index('id="play"') : html.index('id="done"')]
    done = html[html.index('id="done"') : html.index('id="claim"')]
    assert 'id="playVenue"' in play and 'id="playEmblem"' in play
    assert 'id="doneVenue"' in done and 'id="doneEmblem"' in done
    assert ui["venueShown"]["play"] == ui["venueShown"]["venue"]
    assert ui["venueShown"]["done"] == ui["venueShown"]["venue"]


def test_the_venues_emblem_is_on_what_pours_the_drink(ui):
    for pourer in ("tap", "jug"):
        marked, plain = ui["marks"][pourer + " with"], ui["marks"][pourer + " without"]
        assert set(marked["paths"]) == {ui["emblem"]}, pourer
        assert marked["drawn"] != plain["drawn"], pourer
        # No emblem, nothing built for one: the pourer is drawn as it always was.
        assert plain["paths"] == [], pourer
    # The tap's badge is a disc on the pipe, and all of it is on the canvas at rest: on
    # the handle it sat above the top of a phone-sized stage (Codex, round 1).
    discs = [a for a in ui["marks"]["tap with"]["arcs"] if a[2] >= 10]
    assert discs and all(y - r >= 0 for x, y, r in discs), discs
    assert not [a for a in ui["marks"]["tap without"]["arcs"] if a[2] >= 10]


def test_a_prospects_name_from_the_link_is_the_venue_on_every_screen(ui):
    # P2.0l: the email's link puts their name on the game, marked as a sample made for them.
    for key, name in (
        ("plain", "Noa Bakehouse"),
        ("marks", "O'Brien's Bar & Grill"),
        ("longest", "A" * 32),
        ("padded", "Café 360"),
    ):
        seen = ui["named"][key]
        assert seen["title"] == seen["play"] == seen["done"] == seen["claim"] == name, (
            key
        )
        assert seen["fictional"] == f"Made for {name} as a sample.", key
        assert name in seen["tab"], key
        # The made-up venue isn't left behind: not its emblem, nor its name on the board.
        assert not seen["emblem"] and not seen["badge"], key
        assert "Gull" not in seen["board"] and seen["board"], key


@pytest.mark.parametrize("key", ["tooLong", "html", "empty", "punctuationOnly"])
def test_a_name_that_isnt_one_plays_the_skins_own_venue(ui, key):
    assert ui["named"][key] == {**ui["plain"], "badge": True}


def test_without_a_name_the_game_is_as_it_was(ui):
    assert ui["plain"]["title"] == "The Wobbly Gull"
    assert ui["plain"]["fictional"] == "The Wobbly Gull is a made-up pub."
    assert ui["plain"]["emblem"]
    assert ui["plainSwitch"] == [
        "?skin=dozy-otter",
        "?skin=sleepy-cow",
        "?skin=giddy-puffin",
    ]


def test_a_long_name_wraps_and_is_never_cut_off():
    # 32 wide letters need three lines in a name row at 320px (Codex, round 1).
    html = _text("play/pour/index.html")
    for selector in (r"\.brand span", r"\.venue"):
        rule = re.search(selector + r"\{([^}]*)\}", html).group(1)
        assert "overflow-wrap:anywhere" in rule, selector
        assert not re.search(r"line-clamp|ellipsis|nowrap", rule), selector


def test_the_name_stays_in_the_demo_and_goes_nowhere_else(ui):
    # Switching venue keeps it; the offer page's links never carry it, and the page
    # sends no referrer, so the offer page's analytics can't see it (D-017).
    assert ui["namedSwitch"] == [
        "?skin=dozy-otter&name=Noa%20Bakehouse",
        "?skin=sleepy-cow&name=Noa%20Bakehouse",
        "?skin=giddy-puffin&name=Noa%20Bakehouse",
    ]
    html = _text("play/pour/index.html")
    assert re.search(r'<meta name="referrer" content="no-referrer"', html)
    offers = re.findall(r'href="(/promo-games/[^"]*)"', html)
    assert offers and not [h for h in offers if "name" in h]
    js = _text("play/pour/game.js")
    assert not re.search(r"promo-games", js)


def test_the_offer_page_stays_short_enough_to_read():
    # It was 989 words in eight sections before it was cut down. Questions sit closed.
    html = _text("promo-games/index.html")
    main = html[html.index("<main") : html.index("<footer>")]
    assert main.count("<section") <= 6
    closed = re.sub(r"<details.*?</details>", " ", main, flags=re.DOTALL)
    words = re.sub(r"<[^>]+>", " ", closed).split()
    assert len(words) <= 420, len(words)
    assert main.count("<details") >= 4


def test_the_chatbot_knows_the_promo_offer_and_keeps_pilot_prices_to_the_ai_tools():
    prompt = _text("api/chat.py")
    for fact in (
        "aidoo.biz/play/pour/",
        "£300 deposit",
        "+44 7624 396325",
        "From £750",
        "£25 a month",
    ):
        assert fact in prompt, fact
    # The owner set the price to keep a game live (2026-10-13); the page and the bot agree.
    assert "£25 a month" in _text("promo-games/index.html")
    assert "monthly price" not in prompt + _text("promo-games/index.html")
    assert "Never claim or estimate" in prompt
    # The £3,000 pilot belongs to PIKA and VERA: it must sit under a heading that says so.
    pricing = prompt.index("Engagement models / pricing for PIKA and VERA only")
    assert pricing < prompt.index("£3,000")
    assert prompt.count("£3,000") == 1


def test_the_offer_says_we_build_it_and_look_after_it():
    # A café owner's first worry is who keeps it running (owner, 2026-10-20). The page speaks as "we".
    html = _text("promo-games/index.html")
    hero = html[html.index('class="heroLine"') :]
    assert "We build it and look after it." in hero[: hero.index("</p>")]
    assert "Hosted and looked after for three months" in html
    assert "hosted and looked after for three months" in _text("api/chat.py")


def test_the_demo_lives_at_play_pour_and_the_old_address_is_gone():
    # P2.0r: a cafe's link shouldn't say pint; nobody else has the old links, so no forwarding page
    assert not (REPO_ROOT / "play" / "pint").exists()
    assert (REPO_ROOT / "play" / "pour" / "index.html").is_file()
    skip = (".claude", ".git", "docs", "_docs_build", "node_modules", "tests")
    for p in REPO_ROOT.rglob("*"):
        parts = p.relative_to(REPO_ROOT).parts
        if (
            p.is_file()
            and not set(parts) & set(skip)
            and p.suffix in (".html", ".js", ".py", ".svg", ".json")
        ):
            assert "play/pint" not in p.read_text(encoding="utf-8"), "/".join(parts)


# --- P2.0s: the dairy, poured from a carton ------------------------------------------


def test_the_pub_the_cafe_and_the_dairy_draw_exactly_as_they_did(ui):
    # Recorded from main before the carton was added (the dairy's before the whippy): every
    # canvas call and value of a frame at rest, a pour and its result, with the same
    # "random" numbers each run. Re-recorded for P2.0z: against main's traces, the only lines
    # that differ are the "+N" float's (its fading globalAlpha gone, its outline's strokeStyle).
    assert ui["traces"] == {
        "wobbly-gull": "2dab41fd281b68843008d279954886627ee1f6e26b36bb9f1786fb6ad03836c1",
        "dozy-otter": "0f04fc9252d3647464d9e610f6b75cb277dee6ef82ff6a2fc93f62829375a4d7",
        "sleepy-cow": "d9daa5cceb03d677123c4ff3984d089d5dd95b677f21e12702345ad380c8b84e",
    }


def test_a_dairy_link_starts_on_the_dairy(ui):
    assert ui["dairySkin"]["fetched"] == ["skins/sleepy-cow.json"]
    assert ui["dairySkin"]["venue"] == "Sleepy Cow Dairy"


def test_the_carton_is_drawn_and_carries_the_emblem(ui):
    assert ui["pourers"]["carton"] not in (ui["pourers"]["tap"], ui["pourers"]["jug"])
    marked, plain = ui["marks"]["carton with"], ui["marks"]["carton without"]
    assert set(marked["paths"]) == {ui["emblem"]}
    assert marked["drawn"] != plain["drawn"]
    assert plain["paths"] == []


@pytest.mark.parametrize("tall", ["420", "200"])
def test_the_carton_stays_on_the_canvas_at_rest_and_tipped(ui, tall):
    seen = ui["cartonTop"][tall]
    assert 0 <= seen["rest"] < 1e9 and 0 <= seen["pouring"] < 1e9, seen


def test_a_skin_without_fizz_pours_no_bubbles(ui):
    assert ui["fizz"]["on"] > 0
    assert ui["fizz"]["off"] == 0


def test_the_dairy_is_plain_milk_with_a_week_of_it_on_us():
    skin = json.loads((GAME / "skins" / "sleepy-cow.json").read_text(encoding="utf-8"))
    assert skin["drink"]["pourer"] == "carton" and skin["drink"]["fizz"] is False
    for key in ("offer", "prize", "claim"):
        assert "a week's milk" in skin["copy"][key].lower(), key
    # Every round glugs: a surge you learn to let go between (D-027).
    for r in skin["rounds"]:
        assert 0.5 <= r["surge"] <= 0.7 and 1.6 <= r["surgeHz"] <= 2.2, r


# --- P2.0u: the whippy, and a serve that changes each round --------------------------


def test_a_round_can_name_its_own_serve_over_the_skins(latte):
    path = latte(lambda s: s["rounds"][1].update(serve=copy.deepcopy(CONE)))
    result = run(path, ["line", "line"])
    assert result["problems"] == []
    first, second = result["serves"]
    assert first == LATTE["drink"]
    # The serve's own keys win; anything it doesn't say is the skin's.
    assert second["liquid"] == CONE["liquid"] and second["glass"] == CONE["glass"]
    assert second["vessel"] == CONE["vessel"] and second["topping"] == CONE["topping"]
    assert second["head"] == LATTE["drink"]["head"]
    assert second["liquidDeep"] == LATTE["drink"]["liquidDeep"]
    assert [r["verdict"] for r in result["rounds"]] == ["perfect", "perfect"]


def test_a_skin_whose_rounds_name_no_serve_pours_its_one_drink_each_round(latte):
    result = run(latte(), ["line", "line"])
    assert result["serves"] == [LATTE["drink"], LATTE["drink"]]


def test_a_skin_can_pour_soft_serve_from_a_machine(latte):
    def soft(s):
        s["drink"].update(
            pourer="machine", fizz=False, top="coil", outline="none", headDepth=0
        )
        s["drink"].update(vessel=CONE["vessel"], topping=CONE["topping"])

    assert run(latte(soft), ["line", "line"])["problems"] == []
    for kind in ("stick", "drizzle", "scatter"):
        topped = latte(
            lambda s: s["drink"].update(
                topping={"kind": kind, "colours": ["#aa2244", "#ffffff"]}
            )
        )
        assert run(topped, ["line", "line"])["problems"] == [], kind


def _whippy():
    path = GAME / "skins" / "giddy-puffin.json"
    return json.loads(path.read_text(encoding="utf-8"))


def test_the_whippy_is_soft_serve_with_a_99_on_us():
    skin = _whippy()
    drink = skin["drink"]
    assert drink["pourer"] == "machine" and drink["fizz"] is False
    assert drink["top"] == "coil" and drink["outline"] == "none"
    for key in ("offer", "prize", "claim"):
        assert "a 99" in skin["copy"][key].lower(), key
    # The machine pushes in surges, like the milk's glug.
    for r in skin["rounds"]:
        assert r.get("surge", 0) >= 0.3, r


def test_the_whippy_serves_rotate_as_the_owner_chose():
    # D-029: a 99 with a flake, a cup with sauce, a strawberry twist with sprinkles,
    # a faster 99, then a twist in a cup.
    skin = _whippy()
    rounds = skin["rounds"]
    serves = [r["serve"] for r in rounds]
    assert len(rounds) == 5
    assert all(s["name"] for s in serves)
    toppings = [s.get("topping", {}).get("kind") for s in serves]
    assert toppings == ["stick", "drizzle", "scatter", "stick", None]
    cone, cup = serves[0]["vessel"], serves[1]["vessel"]
    assert cone != cup
    assert [s["vessel"] for s in serves] == [cone, cup, cone, cone, cup]
    assert rounds[3]["speed"] > rounds[0]["speed"]
    # The twists are two colours swirled: a pink ridge on the vanilla.
    plain = serves[0].get("head", skin["drink"]["head"])
    assert serves[2]["head"] == serves[4]["head"] != plain


def test_an_icecream_link_starts_on_the_whippy(ui):
    assert ui["icecreamSkin"]["fetched"] == ["skins/giddy-puffin.json"]
    assert ui["icecreamSkin"]["venue"] == _whippy()["venue"]


def test_the_machine_is_drawn_and_carries_the_emblem(ui):
    others = (ui["pourers"]["tap"], ui["pourers"]["jug"], ui["pourers"]["carton"])
    assert ui["pourers"]["machine"] not in others
    marked, plain = ui["marks"]["machine with"], ui["marks"]["machine without"]
    assert set(marked["paths"]) == {ui["emblem"]}
    assert marked["drawn"] != plain["drawn"]
    assert plain["paths"] == []


@pytest.mark.parametrize("tall", ["420", "200"])
def test_the_machine_stays_on_the_canvas_at_rest_and_pouring(ui, tall):
    seen = ui["machineTop"][tall]
    assert 0 <= seen["rest"] < 1e9 and 0 <= seen["pouring"] < 1e9, seen


def test_each_round_says_and_draws_its_own_serve(ui):
    serves = [r["serve"] for r in _whippy()["rounds"]]
    seen = ui["whippyRounds"]
    assert len(seen) == len(serves)
    for n, (serve, shown) in enumerate(zip(serves, seen)):
        assert shown["say"].startswith(serve["name"]), (n, shown["say"])
        assert shown["vessel"], n
        # The finish goes on once it's poured, not while it pours.
        if "topping" in serve:
            assert not shown["toppingWhilePouring"], n
            assert shown["toppingAfter"], n
    # The serve changes what is drawn, not only what is said.
    assert seen[0]["frame"] != seen[1]["frame"]


def test_too_much_topples_off(ui):
    spill = ui["whippySpill"]
    assert spill["say"].startswith(_whippy()["copy"]["spill"])
    assert spill["toppled"]


def test_every_serve_name_fits_one_line_at_320():
    # Said in 24px type over the hint: at 320px "A strawberry twist with sprinkles" took two
    # lines and squeezed the stage between rounds. 22 letters fit, as the taglines do.
    for r in _whippy()["rounds"]:
        assert len(r["serve"]["name"]) <= 22, r["serve"]["name"]


# --- D-030: the whippy is built in coils, not filled like a glass ----------------------


def test_soft_serve_can_be_built_in_coils(latte):
    def coiled(s):
        s["drink"].update(
            pourer="machine",
            fizz=False,
            top="coil",
            outline="none",
            coils=5,
            headDepth=0,
        )
        s["rounds"][1]["serve"] = dict(CONE, coils=4)

    assert run(latte(coiled), ["line", "line"])["problems"] == []
    for bad in (1, 13, 4.5, "5"):
        skin = latte(lambda s: s["drink"].update(coils=bad))
        assert run(skin, ["line"])["problems"], bad
    # The glass-filling swirl and its faint outline are gone.
    assert run(latte(lambda s: s["drink"].update(top="swirl")), ["line"])["problems"]
    assert run(latte(lambda s: s["drink"].update(outline="faint")), ["line"])[
        "problems"
    ]


def test_the_whippys_coils_narrow_smoothly_to_a_flat_top():
    drink = _whippy()["drink"]
    assert 3 <= drink["coils"] <= 8
    glass = drink["glass"]
    top = sorted(p[0] for p in glass if p[1] == 0)
    assert len(top) == 2 and top[1] - top[0] >= 20, top
    # No zig-zag: going down, the right-hand side only widens.
    right = sorted((p for p in glass if p[0] > 50), key=lambda p: p[1])
    assert all(a[0] <= b[0] for a, b in zip(right, right[1:])), right


def test_no_coil_is_hidden_in_a_cup():
    # The cup's rim meets the bottom of the stack (y 100), so every coil laid is seen.
    for r in _whippy()["rounds"]:
        rim = min(p[1] for p in r["serve"]["vessel"]["points"])
        assert rim >= 88, (r["serve"]["name"], rim)


def test_the_stack_is_laid_coil_by_coil(ui):
    # Each coil is a tilted turn of the rope, so a longer pour draws more of them.
    coils = ui["whippyCoils"]
    assert coils["early"] < coils["late"], coils


def test_the_turn_being_laid_reaches_into_the_turn_below(ui):
    # D-030, seam fix (a): settled turns are drawn 12% taller than their slot and overlap the one
    # below; the turn being laid stopped at the top of the stack, a seam until it settled (owner).
    checked = 0
    for seam in ui["whippySeams"]:
        turns = seam["turns"]
        if len(turns) < 3:
            continue
        laid, below, under = turns[-1], turns[-2], turns[-3]
        slot = under["top"] - below["top"]
        assert laid["bottom"] - below["top"] >= 0.12 * slot, seam
        checked += 1
    assert checked >= 5, ui["whippySeams"]


def test_the_shops_badge_fills_evenodd_on_the_machine_and_every_screen(ui):
    # D-030, logo B: a round badge with the puffin's head cut out of it. Drawn nonzero, the
    # head and the ring would fill in solid. The pub, café and dairy are unchanged (traces).
    seen = ui["whippyEmblem"]
    assert seen["rule"] == "evenodd"
    assert seen["path"].count("A") >= 6  # the three rings of the disc
    assert seen["canvas"] == ["fill(object,evenodd)"], seen["canvas"]
    for attrs in seen["svgs"]:
        assert attrs == {"d": seen["path"], "fill-rule": "evenodd"}, attrs


def test_the_sauce_coats_the_top_and_stays_on_the_serve(ui):
    # D-030, sauce 1 (owner, 2026-10-23, over sauce 3's cap): a glossy ribbon over the top with
    # drips that end in round bulbs. Once the drop has landed, nothing of it, drips included,
    # rises above the height scored or hangs out past the serve's widest turn, and it is filled
    # (shaded), not stroked like the old line of sauce.
    checked = 0
    for run in ui["whippySauce"]:
        coated = [f for f in run["frames"] if f["sauce"]]
        assert coated, run["hold"]
        bulbs = [shape for shape in coated[-1]["sauce"] if shape[3]]
        assert len(bulbs) >= 3, (run["hold"], coated[-1]["sauce"])
        for frame in coated:
            left, right = frame["base"]
            for top, x0, x1, _, thread in frame["sauce"]:
                # only the falling thread (plain-filled, P2.0x) may be above the line
                assert thread or top >= frame["top"] - 0.6, (
                    run["hold"],
                    top,
                    frame["top"],
                )
                assert x0 >= left - 0.5 and x1 <= right + 0.5, (
                    run["hold"],
                    x0,
                    x1,
                    left,
                    right,
                )
        checked += 1
    assert checked >= 5


def _drizzle(ui):
    # P2.0x: every frame from release (16ms apart) of the cup's sauce, and the frame the drop or
    # thread first touches the tip (the sauce's clock starts there, and contact is 100ms in).
    frames = ui["whippyDrizzle"]["frames"]
    first = next(f["t"] for f in frames if f["sauce"])
    return frames, first + 96


def _widths(pts, bands=12):
    # The width of a path in bands from its top to its bottom (the leading end of a falling thread).
    ys = [p[1] for p in pts]
    top, bottom = min(ys), max(ys)
    height = bottom - top
    out = []
    for i in range(bands):
        lo, hi = top + height * i / bands, top + height * (i + 1) / bands
        xs = [p[0] for p in pts if lo <= p[1] <= hi + 1e-9]
        out.append(max(xs) - min(xs) if len(xs) > 1 else 0.0)
    return height, out


def test_the_sauce_is_strawberry_pink_not_crimson(ui):
    # P2.0x (owner, 2026-10-23: sauce 1 "reads a bit like blood"): brighter and pinker than #c4314b.
    colour = ui["whippyDrizzle"]["colour"].lstrip("#")
    r, g, b = (int(colour[i : i + 2], 16) for i in (0, 2, 4))
    assert r + g + b >= 420, colour
    assert b >= 0.5 * r and g <= 0.5 * r, colour


def test_the_sauce_falls_as_a_tapered_thread_with_a_rounded_end(ui):
    # P2.0x: not a drop. Just before it touches, a plain-filled thread: much longer than wide,
    # wide at its leading (lower) end and narrowing to a thin tail, the leading end rounded
    # (not cut off flat).
    frames, contact = _drizzle(ui)
    before = [f for f in frames if contact - 48 <= f["t"] < contact - 8]
    assert before, contact
    for frame in before:
        threads = [shape for shape in frame["sauce"] if shape["plain"] and shape["pts"]]
        assert threads, frame["t"]
        thread = max(threads, key=lambda shape: shape["bottom"] - shape["top"])
        height, bands = _widths(thread["pts"])
        widest = max(bands)
        assert widest > 0 and height >= 2.5 * widest, (frame["t"], height, widest)
        # bands run top to bottom: the tail is thin, the leading end is wide
        assert sum(bands[-5:]) >= 1.8 * sum(bands[:5]), (frame["t"], bands)
        # the lowest half pixel of it is a point, not a flat cut
        lowest = max(p[1] for p in thread["pts"])
        end = [p[0] for p in thread["pts"] if p[1] >= lowest - 0.5]
        assert max(end) - min(end) <= 0.5 * widest, (frame["t"], end)


def test_the_landing_pools_into_a_round_blob_that_spreads_into_the_ribbon(ui):
    # P2.0x: where the thread touches, a round blob swells (it is not a flat bar), then it flattens
    # and spreads out into the ribbon, so the sauce's width never shrinks as it hands over. Always
    # fully opaque: nothing fades out, so no translucent halo is ever on the cream.
    frames, contact = _drizzle(ui)
    for frame in frames:
        for shape in frame["sauce"]:
            assert shape["alpha"] >= 0.999, (frame["t"], shape)
    settled = [
        (f["t"], [x for x in f["sauce"] if not x["plain"] and not x["circles"]])
        for f in frames
        if contact <= f["t"] <= contact + 700
    ]
    blobs = []
    for t, shapes in settled:
        for shape in shapes:
            w, h = shape["right"] - shape["left"], shape["bottom"] - shape["top"]
            if t <= contact + 200 and h > 0 and 0.6 <= w / h <= 2.0:
                blobs.append((t, w))
    # round from the moment it lands, and for a good while (the old ribbon was only that shape for the
    # first few frames of a quick spread)
    assert len(blobs) >= 8 and blobs[0][0] <= contact + 48, blobs
    assert blobs[-1][1] >= 1.3 * blobs[0][1], blobs
    widths = [
        (t, max(x["right"] for x in shapes) - min(x["left"] for x in shapes))
        for t, shapes in settled
        if shapes
    ]
    assert widths
    for (t0, w0), (t1, w1) in zip(widths, widths[1:]):
        assert w1 >= w0 * 0.96 - 1.0, (t0, w0, t1, w1)
    assert widths[-1][1] >= max(w for _, w in blobs), (widths[-1], blobs)


def _turn(ui):
    # One turn of the stack, as drawn, in pixels: the sizes below are fractions of it.
    turns = sorted(f["turn"] for f in ui["whippyDrizzle"]["frames"] if f["turn"])
    return turns[len(turns) // 2]


def test_the_sauce_is_a_fine_drizzle_not_big_drops(ui):
    # P2.0x (owner on a phone, 2026-10-23: "the drops feel a bit large, feels less like a drizzle"):
    # a thin thread, a small bead where it lands, a ribbon about as thick as sauce 1's, and small,
    # short drips that have all finished by 700ms after contact. Sizes are fractions of a turn.
    frames, contact = _drizzle(ui)
    turn = _turn(ui)
    # the thread, widest, just before it lands
    widest = 0.0
    for f in frames:
        if contact - 48 <= f["t"] < contact - 8:
            for shape in f["sauce"]:
                if shape["plain"] and shape["pts"]:
                    xs = [p[0] for p in shape["pts"]]
                    widest = max(widest, max(xs) - min(xs))
    assert 0 < widest <= 0.13 * turn, (widest, turn)
    # the blob (a path of two curves), before it spreads into the ribbon
    blobs = [
        shape["right"] - shape["left"]
        for f in frames
        if contact <= f["t"] <= contact + 200
        for shape in f["sauce"]
        if not shape["plain"]
        and not shape["circles"]
        and shape["pts"]
        and len(shape["pts"]) <= 9
    ]
    assert blobs and max(blobs) <= 0.34 * turn, (max(blobs, default=0), turn)
    # the ribbon, once settled: its median thickness (the top edge to the bottom edge, side by side)
    settled = next(f for f in frames if f["t"] >= contact + 600)
    ribbon = max(
        (
            x
            for x in settled["sauce"]
            if not x["plain"] and not x["circles"] and len(x["pts"]) > 20
        ),
        key=lambda x: x["right"] - x["left"],
    )
    # top edge, an eleven-point cap, the bottom edge back, an eleven-point cap
    pts = ribbon["pts"]
    body = (len(pts) - 22) // 2
    gaps = sorted(
        b[1] - t[1] for t, b in zip(pts[:body], pts[body + 11 : 2 * body + 11][::-1])
    )
    assert 0.12 * turn <= gaps[len(gaps) // 2] <= 0.18 * turn, (
        gaps[len(gaps) // 2],
        turn,
    )
    # the drips: small bulbs, at most 0.62 of a turn long, each at rest by 700ms after contact
    drips = {}
    for f in frames:
        for shape in f["sauce"]:
            if shape["circles"]:
                centre = (shape["left"] + shape["right"]) / 2
                key = next((k for k in drips if abs(k - centre) < 6), round(centre))
                length = shape["bottom"] - shape["top"]
                row = drips.setdefault(
                    key, {"width": 0.0, "length": 0.0, "moved": 0, "last": length}
                )
                row["width"] = max(row["width"], shape["right"] - shape["left"])
                if abs(length - row["last"]) > 0.4:
                    row["moved"] = f["t"]
                row["last"], row["length"] = length, length
    assert len(drips) == 3, drips
    for key, row in drips.items():
        assert row["width"] <= 0.15 * turn, (key, row, turn)
        assert row["length"] <= 0.62 * turn, (key, row, turn)
        assert row["moved"] <= contact + 700, (key, row, contact)


def test_the_ribbon_has_no_square_ends_or_steps(ui):
    # P2.0x (owner, 2026-10-23: the drizzle "sort of squares off"): the ribbon ends in rounded
    # tips and dips over a turn's edge in one smooth curve. Its outline (a path of many points;
    # the blob, the drips and the thread are not it) turns by no more than 60 degrees at any
    # point, so no corner is sharper than 120 degrees, from 180 to 760ms after contact.
    frames, contact = _drizzle(ui)
    checked = 0
    for f in frames:
        if not contact + 180 <= f["t"] <= contact + 760:
            continue
        for shape in f["sauce"]:
            pts = shape["pts"]
            if shape["plain"] or shape["circles"] or not pts or len(pts) < 20:
                continue
            # drop points that sit on top of each other
            line = [
                p for i, p in enumerate(pts) if i == 0 or math.dist(p, pts[i - 1]) > 0.3
            ]
            for i in range(len(line)):
                a, b, c = line[i - 1], line[i], line[(i + 1) % len(line)]
                v1, v2 = (b[0] - a[0], b[1] - a[1]), (c[0] - b[0], c[1] - b[1])
                turn = abs(
                    math.degrees(
                        math.atan2(
                            v1[0] * v2[1] - v1[1] * v2[0], v1[0] * v2[0] + v1[1] * v2[1]
                        )
                    )
                )
                assert turn <= 60, (f["t"], round(turn), b, a, c)
            checked += 1
    assert checked >= 25, checked


def test_the_three_drips_differ_in_length_and_in_when_they_start(ui):
    # P2.0x: less posed: three bulbs of three lengths, let go at three different moments.
    frames, _ = _drizzle(ui)
    starts, ends = {}, {}
    for f in frames:
        for shape in f["sauce"]:
            if shape["circles"]:
                centre = (shape["left"] + shape["right"]) / 2
                key = next((k for k in starts if abs(k - centre) < 6), round(centre))
                starts.setdefault(key, f["t"])
                ends[key] = shape["bottom"] - shape["top"]
    assert len(starts) == 3, starts
    first = sorted(starts.values())
    assert first[1] - first[0] >= 30 and first[2] - first[1] >= 30, starts
    lengths = sorted(ends.values())
    assert (
        lengths[1] - lengths[0] >= 0.08 * lengths[2]
        and lengths[2] - lengths[1] >= 0.08 * lengths[2]
    ), ends


def test_a_glint_runs_along_the_sauce_and_is_done_by_700ms(ui):
    # P2.0x: the shine moves once the sauce has settled, and is over about 700ms after contact,
    # before the next glass slides in.
    frames, contact = _drizzle(ui)
    glints = [f["t"] for f in frames if f["glint"]]
    assert len(glints) >= 5, glints
    assert min(glints) >= contact + 250, (min(glints), contact)
    assert max(glints) <= contact + 740, (max(glints), contact)


def test_the_thread_is_the_only_sauce_above_the_line_and_it_is_gone_by_the_end(ui):
    # P2.0x (D-030's rule kept): the settled sauce never rises above the scored height or out past
    # the serve; only the falling thread (plain-filled) may cross the line, and it is absorbed.
    frames, contact = _drizzle(ui)
    for f in (f for f in frames if f["top"] is not None and f["base"]):
        left, right = f["base"]
        for shape in f["sauce"]:
            assert shape["left"] >= left - 0.5 and shape["right"] <= right + 0.5, (
                f["t"],
                shape,
            )
            if not shape["plain"]:
                assert shape["top"] >= f["top"] - 0.6, (f["t"], shape["top"], f["top"])
    assert any(
        shape["plain"] and shape["top"] < frames[-1]["top"] - 3
        for f in frames
        for shape in f["sauce"]
    )
    for f in frames:
        if f["t"] >= contact + 400:
            assert not [x for x in f["sauce"] if x["plain"]], (f["t"], f["sauce"])


def test_nothing_below_the_top_moves_when_a_serve_finishes(ui):
    # Owner, 2026-10-23: the base shifted down as a serve finished. The tip's foot reached most
    # of a turn below the piece it replaced. Now the turns below stay exactly as poured, and the
    # finished top ends where the turn being laid ended.
    checked = 0
    for run in ui["whippyRelease"]:
        poured = run["poured"]
        if len(poured) < 2:
            continue
        for frame in run["finish"]:
            if not frame:
                continue
            kept = len(frame) - 1
            assert kept == len(poured) - 1, run["hold"]
            assert frame[:kept] == poured[:kept], run["hold"]
            replaced = poured[-1][1]
            assert frame[-1][1] <= replaced + 0.5, (run["hold"], frame[-1], poured)
            # the driver reads a rounded turn's bottom from its corners, a few pixels low
            assert frame[-1][1] >= replaced - 5, (run["hold"], frame[-1], poured)
        checked += 1
    assert checked >= 10, ui["whippyRelease"]


def test_a_topped_serve_holds_long_enough_to_see_its_finish(ui):
    # P2.0x review (2026-10-24): the settled sauce was up for about 150ms before the next cone
    # slid in. A serve with a topping holds about 350ms longer; a plain pour keeps its beat.
    holds = ui["resultHolds"]
    assert set(holds) == {"pub", "topped"}, holds
    assert all("+" in h["said"] for h in holds.values()), holds
    assert 1100 <= holds["pub"]["ms"] <= 1200, holds
    assert holds["topped"]["ms"] >= holds["pub"]["ms"] + 300, holds


def test_sprinkles_cover_the_tip_and_two_turns(ui):
    # Owner picked spread A (2026-10-26): the sprinkles reach about 40% down the swirl, not just
    # the tip, and none sits above the top of the serve.
    s = ui["sprinkles"]
    assert len(s["ys"]) >= 80, s  # 46 strands, two ends each
    tip, lowest = min(s["tops"]), max(s["tops"])
    assert min(s["ys"]) >= tip - 1, s
    assert max(s["ys"]) - min(s["ys"]) >= 0.3 * (lowest - tip), s


def _lean(pts):
    # The bar's long axis, from its points' spread, in degrees off upright (positive leans right).
    n = len(pts)
    mx = sum(p[0] for p in pts) / n
    my = sum(p[1] for p in pts) / n
    sxx = sum((p[0] - mx) ** 2 for p in pts)
    syy = sum((p[1] - my) ** 2 for p in pts)
    sxy = sum((p[0] - mx) * (p[1] - my) for p in pts)
    axis = 0.5 * math.atan2(2 * sxy, sxx - syy)
    ux, uy = math.cos(axis), math.sin(axis)
    if uy > 0:  # point it up the screen
        ux, uy = -ux, -uy
    return math.degrees(math.atan2(ux, -uy))


def test_the_flake_goes_in_like_a_real_one(ui):
    # P2.0y, look E (owner, 2026-10-26): the 99's flake is pushed into the side of the swirl a
    # turn below the top, leaning out about 25 degrees, behind the turns; and, short or on the
    # line, no part of it ever rises above the top of the serve (it once stood over a short one).
    # A serve too short to stand one in under its top goes without (Codex, round 1).
    runs = ui["flakes"]
    assert len(runs) >= 12, runs
    for run in runs:
        seen = [f for f in run["frames"] if f["flake"] and f["top"] is not None]
        assert seen or run["hold"] < 500, run["hold"]
        for f in seen:
            assert f["flake"]["top"] >= f["top"] - 0.6, (
                run["hold"],
                f["flake"]["top"],
                f["top"],
            )
        if not seen:
            continue
        last = seen[-1]
        bar = last["flake"]
        assert bar["at"] < last["firstTurn"], run["hold"]  # behind the turns
        lean = _lean(bar["pts"])
        assert 18 <= lean <= 32, (run["hold"], lean)
        assert (bar["top"] + bar["bottom"]) / 2 > last["top"], run["hold"]
        # its foot is well down the swirl, not at the top turn
        assert bar["bottom"] >= last["top"] + 0.35 * (last["bottom"] - last["top"]), (
            run["hold"],
            bar,
            last,
        )
        assert sum(p[0] for p in bar["pts"]) / len(bar["pts"]) > last["middle"], run[
            "hold"
        ]


def test_the_scene_holds_still_when_the_result_replaces_the_hint(ui):
    # Owner, 2026-10-23 (again): the base still shifted down as a serve finished. The whippy's
    # hint is a serve's name and two lines; the result is two short ones. The line under the
    # scene shrank, the stage grew 16px and the scene was refitted, cone and all. The line now
    # keeps the tallest it has been, so the stage, and every turn below the top, stay put.
    runs = ui["whippyReflow"]
    assert len(runs) >= 5, runs
    for run in runs:
        assert run["result"] and run["poured"], run["hold"]
        assert run["stages"][0] == run["stages"][1], run
        for frame in run["finish"]:
            assert frame, run["hold"]
            assert frame[0] == run["poured"][0], (
                run["hold"],
                frame[0],
                run["poured"][0],
            )


def test_the_top_of_the_serve_is_the_height_scored(ui):
    # Tilted turns once rose above the scored height: at 0.60 the stack read 0.64, past a
    # 0.62 line the engine still called short (Codex, round 1 of the coils).
    measured = [p for p in ui["whippyPeaks"] if p["scored"] is not None]
    assert len(measured) >= 10, ui["whippyPeaks"]
    for peak in measured:
        assert peak["top"] is not None and abs(peak["top"] - peak["scored"]) < 0.6, peak


def test_the_tip_tops_out_at_the_height_scored_while_it_forms(ui):
    # D-030, look b: the tip grows out of the top turn after release; at every stage of it,
    # nothing drawn rises above the height the result measures.
    for peak in (p for p in ui["whippyPeaks"] if p["scored"] is not None):
        assert peak["frames"], peak
        assert all(top >= peak["scored"] - 0.6 for top in peak["frames"]), peak


def test_a_serve_on_a_whole_turn_still_gets_its_finish(ui):
    # At exactly 0.6 of five turns the tip and the sauce were skipped (Codex, round 1 of look b).
    seen = ui["whippyWholeTurn"]
    assert seen["finish"], seen


def test_the_finish_arrives_after_its_served(ui):
    # D-030, look b: no flake, sauce or sprinkles on the frame the result lands; all of it
    # within a second; one light over the stack, not a drop shadow under every turn.
    staged = ui["whippyStaged"]
    assert len(staged) == len(_whippy()["rounds"])
    for n, round_ in enumerate(staged):
        assert not round_["shadowed"], (n, round_)
        if round_["topping"]:
            assert not round_["atRelease"], (n, round_)
            assert round_["bySecond"], (n, round_)


def _the_line(frame):
    # The line to pour to: the dashed line nothing clips.
    lines = [d for d in frame["dashes"] if not d["clipped"]]
    assert len(lines) == 1, frame["dashes"]
    return lines[0]


def test_the_whippys_line_is_as_wide_on_every_serve(ui):
    # D-030, line look (c): the line was as wide as the swirl's hidden taper, a stub on the
    # tall serves (about 40px on a twist, 25px at 320). It is one width, as mocked: 0.9 of the
    # serve's width, about half the span the pub's line is drawn across.
    pub = max(d["x1"] - d["x0"] for d in ui["pubLine"])
    widths = set()
    for n, round_ in enumerate(ui["whippyLine"]):
        for when in ("rest", "pouring"):
            line = _the_line(round_[when])
            widths.add(round(line["x1"] - line["x0"], 1))
            assert line["x1"] - line["x0"] >= 0.45 * pub, (n, when, line, pub)
    assert len(widths) == 1, widths


def test_the_whippys_line_is_drawn_over_the_swirl(ui):
    # The rope ran straight through the line just when it was needed.
    for n, round_ in enumerate(ui["whippyLine"]):
        frame = round_["pouring"]
        assert _the_line(frame)["at"] > frame["coils"][1], (n, frame["coils"])


def test_a_faint_swirl_stands_where_the_pub_has_its_glass(ui):
    # D-030, line look (c): the line no longer floats over an empty cone; a soft silhouette of
    # the finished swirl stands up to it, under the coils.
    ink = _whippy()["theme"]["ink"].lstrip("#")
    ghost = "rgba({},{},{},0.09)".format(*(int(ink[i : i + 2], 16) for i in (0, 2, 4)))
    for n, round_ in enumerate(ui["whippyLine"]):
        assert any(c == ghost for c, _ in round_["rest"]["colours"]), n
        frame = round_["pouring"]
        assert any(
            c == ghost and at < frame["coils"][0] for c, at in frame["colours"]
        ), n


# --- P2.0w: the whippy's stream, out of the machine ------------------------------------


def _rope(frame, rest):
    # The stream's circles, top to bottom: not the badge or the lever (there at rest), not a
    # turn's rim light (drawn turned, at y 0), not the little bead left on the nozzle.
    return sorted(
        (a for a in frame["arcs"] if a not in rest and a[1] > 10 and a[2] >= 3),
        key=lambda a: a[1],
    )


def test_the_whippys_stream_is_a_rope_like_its_turns(ui):
    # Owner, 2026-10-22: the plain band "feels slightly out of place". It is now a rope of
    # circles, grooved and lit like the turns (mock B).
    seen = ui["whippyStream"]
    for frame in (f for f in seen["pouring"] if f["held"] > 200):
        assert len(_rope(frame, seen["rest"])) >= 20, frame["held"]


def test_the_whippys_stream_swings_towards_the_turn_being_laid(ui):
    # Mock B: halfway down, it is already most of the way across to where it lands.
    seen = ui["whippyStream"]
    swung = 0
    for frame in (f for f in seen["pouring"] if f["held"] > 200):
        rope = _rope(frame, seen["rest"])
        top, bottom = rope[0], rope[-1]
        if abs(bottom[0] - top[0]) <= 10:
            continue
        half = (top[1] + bottom[1]) / 2
        middle = min(rope, key=lambda a: abs(a[1] - half))
        assert (middle[0] - top[0]) / (bottom[0] - top[0]) > 0.5, frame["held"]
        swung += 1
    assert swung >= 5, swung


def test_the_whippys_stream_swells_in_a_surge(ui):
    # At the nozzle the rope is as fat as the flow: a peak of the first round's surge against
    # the trough after it (each a little after the engine's, as the drawing eases towards it).
    seen = ui["whippyStream"]
    hz = _whippy()["rounds"][0]["surgeHz"]

    def width(at_ms):
        frame = min(seen["pouring"], key=lambda f: abs(f["held"] - at_ms))
        return _rope(frame, seen["rest"])[0][2]

    peak, trough = width(1250 / hz + 60), width(1750 / hz + 60)
    assert peak > 1.3 * trough, (peak, trough)


def test_the_whippys_stream_snaps_off_when_let_go(ui):
    # On release it necks at the nozzle and snaps; the last of it drops onto the top turn,
    # and then there's no stream at all.
    seen = ui["whippyStream"]
    top_while_pouring = _rope(seen["pouring"][-1], seen["rest"])[0][1]
    falling = [
        f
        for f in seen["after"]
        if (r := _rope(f, seen["rest"])) and r[0][1] > top_while_pouring + 10
    ]
    assert falling, "the stream never came away from the nozzle"
    assert not _rope(seen["after"][-1], seen["rest"])


def _luminance(hex_colour):
    h = hex_colour[1:]
    if len(h) == 3:
        h = "".join(c * 2 for c in h)

    def channel(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4

    r, g, b = (channel(int(h[i : i + 2], 16)) for i in (0, 2, 4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _contrast(a, b):
    hi, lo = sorted((_luminance(a), _luminance(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


@pytest.mark.parametrize("path", SKINS, ids=lambda p: p.stem)
def test_every_shipped_accent_reads_against_the_room(path):
    # The accent is text too (the kicker, the offer, the prize), on the room and its
    # panels: Giddy Puffin's first coral was 1.75:1 on its panel (Codex, round 1).
    theme = json.loads(path.read_text(encoding="utf-8"))["theme"]
    for ground in ("bg", "panel"):
        assert _contrast(theme["accent"], theme[ground]) >= 4, ground
    assert _contrast(theme["accentInk"], theme["accent"]) >= 4.5


def _opaque(colour):
    return isinstance(colour, str) and re.fullmatch(
        r"#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}", colour
    )


@pytest.mark.parametrize("venue", ["pub", "?skin=icecream"])
def test_a_pours_score_reads_over_whatever_is_behind_it(ui, venue):
    # P2.0z: the whippy's "+N" faded into a grey smudge over the white machine: a half-black
    # outline, and the whole float fading out. Every frame it is drawn, it is drawn whole, with
    # a solid outline; over the machine's metal and over the room, the outline or the fill
    # stands 3:1 off what is behind it.
    skin = "giddy-puffin" if venue != "pub" else "wobbly-gull"
    theme = json.loads(
        (REPO_ROOT / "play" / "pour" / "skins" / f"{skin}.json").read_text(
            encoding="utf-8"
        )
    )["theme"]
    seen = ui["floats"][venue]
    drawn = [f for f in seen["frames"] if f]
    assert len(drawn) > 30, seen["say"]  # it is up for most of a second
    assert not seen["frames"][-1], "the float has gone by 1.6 s"
    for frame in drawn:
        outline = [x for x in frame if x["op"] == "strokeText"]
        fill = [x for x in frame if x["op"] == "fillText"]
        assert outline and fill
        for x in frame:
            assert x["alpha"] == 1, x
        for x in outline:
            assert _opaque(x["stroke"]), x
            size = float(re.match(r"\d+ ([\d.]+)px", x["font"]).group(1))
            assert x["width"] >= size * 0.15, x
            for ground in ("metal", "bg", "panel"):
                if ground in theme:
                    best = max(
                        _contrast(x["stroke"], theme[ground]),
                        _contrast(fill[0]["fill"], theme[ground]),
                    )
                    assert best >= 3, (ground, x)
            assert _contrast(x["stroke"], fill[0]["fill"]) >= 3, x


def _rule(css, selector):
    m = re.search(re.escape(selector) + r"\{([^}]*)\}", css)
    assert m, selector
    return dict(p.split(":", 1) for p in m.group(1).split(";") if ":" in p)


@pytest.mark.parametrize("path", SKINS, ids=lambda p: p.stem)
def test_the_waiting_button_stays_in_the_venues_own_colours(path):
    # P2.0z: between pours the button sat at 45% opacity over the room, a muddy mauve on every
    # venue. Waiting, it is painted in the skin's own solid colours, and its words still read.
    theme = json.loads(path.read_text(encoding="utf-8"))["theme"]
    wait = _rule(_text("play/pour/index.html"), ".btn.wait")
    assert "opacity" not in wait or float(wait["opacity"]) >= 1, wait
    colours = {}
    for prop in ("background", "color"):
        key = re.fullmatch(r"var\(--(\w+)\)", wait.get(prop, "").strip())
        assert key, (prop, wait)
        colours[prop] = theme[key.group(1)]
        assert _opaque(colours[prop]), (prop, colours[prop])
    assert _contrast(colours["color"], colours["background"]) >= 4.5
