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
SKINS = sorted((GAME / "skins").glob("*.json"))
DRIVER = REPO_ROOT / "tests" / "pint_driver.cjs"
# What the shipped code may not know about: any shipped skin's venue or drink.
SKIN_WORDS = re.compile(
    r"wobbly|gull|pint|\bpub\b|beer|lager|dozy|otter|latte|coffee|caf[eé]",
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


def test_two_skins_ship():
    assert [p.stem for p in SKINS] == ["dozy-otter", "wobbly-gull"]


def test_the_skin_list_names_files_that_exist_and_ids_match_file_names():
    listing = _text("play/pint/skins/default.js")
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
    ],
)
def test_a_broken_skin_is_refused(latte, change):
    assert run(latte(change), ["line", "line"])["problems"] != []


def test_a_skin_says_what_pours_the_drink_and_what_colour_it_pours(latte):
    jug = latte(lambda s: s["drink"].update(pourer="jug", stream="#fffaf0"))
    assert run(jug, ["line", "line"])["problems"] == []
    assert run(latte(), ["line", "line"])["problems"] == []


def test_the_two_shipped_venues_do_not_pour_from_the_same_thing():
    pourers = {
        path.stem: json.loads(path.read_text(encoding="utf-8"))["drink"].get(
            "pourer", "tap"
        )
        for path in SKINS
    }
    assert pourers == {"wobbly-gull": "tap", "dozy-otter": "jug"}


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


@pytest.mark.parametrize("path", SKINS, ids=lambda p: p.stem)
def test_every_shipped_skin_names_a_made_up_venue_and_no_alcohol_only_prize(path):
    # D-024: a drink may be the prize only if soft drinks count; never a pint or a beer.
    skin = json.loads(path.read_text(encoding="utf-8"))
    assert "made up" in skin["fictional"].lower() or "made-up" in skin["fictional"]
    text = json.dumps(skin)
    assert not re.search(
        r"free (pint|beer|lager)|wins? (a|the) (pint|beer|lager)", text, re.I
    )
    for key in ("offer", "prize", "claim"):
        if re.search(r"\bdrinks?\b", skin["copy"][key], re.I):
            assert "soft drinks" in skin["copy"][key], key


def test_deploy_serves_the_game_and_its_skin():
    served = check_site.served_files(REPO_ROOT, check_site.deploy_excludes(REPO_ROOT))
    for rel in (
        "play/pint/index.html",
        "play/pint/engine.js",
        "play/pint/game.js",
        "play/pint/skins/default.js",
        "play/pint/skins/wobbly-gull.json",
        "play/pint/skins/dozy-otter.json",
        "images/promo/pint-qr.svg",
    ):
        assert rel in served, rel


# --- the offer page ------------------------------------------------------------


def test_the_offer_page_leads_with_the_playable_example():
    html = _text("promo-games/index.html")
    assert 'href="/play/pint/"' in html
    assert 'href="/play/pint/?skin=dozy-otter"' in html
    assert 'src="../images/promo/pint-qr.svg"' in html
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
    for rel in ("play/pint/index.html", "play/pint/game.js", "play/pint/engine.js"):
        assert "analytics" not in _text(rel), rel
    offer = _text("promo-games/index.html")
    assert "analytics.aidoo.biz/script.js" in offer
    for event in ("play-demo-hero", "play-demo-pub", "play-demo-cafe", "email-contact"):
        assert f'data-umami-event="{event}"' in offer, event
    assert 'data-umami-event="whatsapp-contact"' in offer
    # Coming back from the game is visible as its own page view.
    assert 'href="/promo-games/?from=demo#price"' in _text("play/pint/index.html")


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


def test_the_demo_shows_an_example_winners_screen_labelled_as_one():
    html = _text("play/pint/index.html")
    assert 'id="claimOpen"' in html and 'id="claim"' in html
    assert "An example." in html
    for path in SKINS:
        assert json.loads(path.read_text(encoding="utf-8"))["copy"]["claim"], path.stem


def test_the_winners_screen_claims_only_what_it_does():
    # P2.0n: a moving clock is beaten by a screen recording, so nothing may say it proves
    # the win. The line says what a live game would do instead: a one-off code staff mark used.
    html = _text("play/pint/index.html")
    claim = html[html.index('id="claim"') :]
    faq = _text("promo-games/index.html")
    for text in (claim, faq, _text("play/pint/game.js")):
        for phrase in (
            "isn't a screenshot",
            "can't be a screenshot",
            "shows it isn't",
            "proves",
            "proof",
        ):
            assert phrase not in text, phrase
    assert "one-off code" in claim and "one-off code" in faq
    assert "Example" in claim[: claim.index('id="claimVenue"')]


def test_the_pub_offers_a_drink_soft_drinks_included_as_an_example():
    # P2.0p (D-024): the made-up pub's prize is the one a real pub would offer, and every
    # place it's named says soft drinks count; the title line says it's an example.
    copy_ = json.loads(
        (GAME / "skins" / "wobbly-gull.json").read_text(encoding="utf-8")
    )["copy"]
    for key in ("offer", "prize", "claim"):
        assert "a drink on us" in copy_[key].lower(), key
        assert "soft drinks" in copy_[key], key
    assert "example" in copy_["offer"].lower()
    for key, line in copy_.items():
        assert "crisps" not in line, key


def test_the_title_screen_leads_with_the_prize_and_labels_it_an_example():
    html = _text("play/pint/index.html")
    assert 'id="offer"' in html
    assert "The names and the prize are examples" in html
    for path in SKINS:
        skin = json.loads(path.read_text(encoding="utf-8"))
        assert skin["copy"]["rivalTop"].count("{gap}") == 1, path.stem
        assert skin["copy"]["offer"], path.stem


# --- the screen code itself, run against a stand-in page ----------------------------


@pytest.fixture(scope="module")
def ui():
    node = shutil.which("node")
    assert node, "Node.js is needed to run play/pint/game.js in the tests"
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
    html = _text("play/pint/index.html")
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
    assert ui["plainSwitch"] == ["?skin=dozy-otter"]


def test_a_long_name_wraps_and_is_never_cut_off():
    # 32 wide letters need three lines in a name row at 320px (Codex, round 1).
    html = _text("play/pint/index.html")
    for selector in (r"\.brand span", r"\.venue"):
        rule = re.search(selector + r"\{([^}]*)\}", html).group(1)
        assert "overflow-wrap:anywhere" in rule, selector
        assert not re.search(r"line-clamp|ellipsis|nowrap", rule), selector


def test_the_name_stays_in_the_demo_and_goes_nowhere_else(ui):
    # Switching venue keeps it; the offer page's links never carry it, and the page
    # sends no referrer, so the offer page's analytics can't see it (D-017).
    assert ui["namedSwitch"] == ["?skin=dozy-otter&name=Noa%20Bakehouse"]
    html = _text("play/pint/index.html")
    assert re.search(r'<meta name="referrer" content="no-referrer"', html)
    offers = re.findall(r'href="(/promo-games/[^"]*)"', html)
    assert offers and not [h for h in offers if "name" in h]
    js = _text("play/pint/game.js")
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
        "aidoo.biz/play/pint/",
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
