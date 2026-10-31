"""Tests for the pour demo's weekly board (api/board.py)."""

import json
import os
import sqlite3
import sys
from pathlib import Path

import pytest

os.environ.setdefault("OPENAI_API_KEY", "test-key")

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "api"))
import board  # noqa: E402
import chat  # noqa: E402

PUB = "wobbly-gull"
BEST = (
    len(
        json.loads(
            (REPO_ROOT / "play/pour/skins" / f"{PUB}.json").read_text(encoding="utf-8")
        )["rounds"]
    )
    * 100
)


@pytest.fixture
def db(tmp_path, monkeypatch):
    path = tmp_path / "board.db"
    monkeypatch.setenv("AIDOO_BOARD_DB", str(path))
    board._posts.clear()
    monkeypatch.setattr(board, "_global_posts", [])
    return path


@pytest.fixture
def client(db):
    chat.app.config["TESTING"] = True
    with chat.app.test_client() as c:
        yield c


def post(client, name="Brave Heron", score=300, skin=PUB, ip="203.0.113.5"):
    return client.post(
        "/api/pour/score",
        json={"skin": skin, "name": name, "score": score},
        environ_base={"REMOTE_ADDR": ip},
    )


def test_a_score_goes_on_this_weeks_board(client):
    resp = post(client)
    assert resp.status_code == 200
    assert resp.get_json()["scores"] == [{"name": "Brave Heron", "score": 300}]
    got = client.get(f"/api/pour/board?skin={PUB}").get_json()
    assert got["scores"] == [{"name": "Brave Heron", "score": 300}]
    assert got["week"] == board._week()


WORDS = json.loads((REPO_ROOT / "play/pour/nicknames.json").read_text(encoding="utf-8"))
NAMES = [f"{a} Heron" for a in WORDS["adjectives"]]


def test_the_board_is_the_top_ten_highest_first(client):
    for i in range(12):
        post(client, name=NAMES[i], score=i * 10, ip=f"203.0.113.{i}")
    scores = [
        row["score"]
        for row in client.get(f"/api/pour/board?skin={PUB}").get_json()["scores"]
    ]
    assert scores == [110, 100, 90, 80, 70, 60, 50, 40, 30, 20]


def test_each_skin_has_its_own_board(client):
    post(client, skin=PUB)
    other = next(
        p.stem for p in (REPO_ROOT / "play/pour/skins").glob("*.json") if p.stem != PUB
    )
    assert client.get(f"/api/pour/board?skin={other}").get_json()["scores"] == []


@pytest.mark.parametrize(
    "name",
    ["Keith", "brave heron", "Brave  Heron", "Brave Heron x", "", None, 7, "Rude Word"],
)
def test_only_a_name_the_game_gives_is_taken(client, name):
    assert post(client, name=name).status_code == 400


@pytest.mark.parametrize("score", [-1, BEST + 1, 3.5, "300", True, None])
def test_a_score_the_game_cannot_make_is_refused(client, score):
    assert post(client, score=score).status_code == 400


def test_the_best_possible_score_is_taken(client):
    assert post(client, score=BEST).status_code == 200


@pytest.mark.parametrize("skin", ["nope", "../skins/wobbly-gull", "", None])
def test_an_unknown_skin_is_refused(client, skin):
    assert post(client, skin=skin).status_code == 404


def test_scores_are_rate_limited_per_visitor(client):
    codes = [post(client).status_code for _ in range(board.POST_LIMIT + 1)]
    assert codes[:-1] == [200] * board.POST_LIMIT
    assert codes[-1] == 429
    assert post(client, ip="198.51.100.9").status_code == 200


def test_only_the_skin_name_score_and_week_are_stored(client, db):
    post(client)
    conn = sqlite3.connect(db)
    columns = [row[1] for row in conn.execute("PRAGMA table_info(scores)")]
    assert columns == ["skin", "week", "name", "score"]
    assert conn.execute("SELECT * FROM scores").fetchall() == [
        (PUB, board._week(), "Brave Heron", 300)
    ]
    conn.close()


def test_last_weeks_scores_go_when_this_weeks_first_arrives(client, db, monkeypatch):
    monkeypatch.setattr(board, "_week", lambda: "2026-W43")
    post(client, score=500)
    monkeypatch.setattr(board, "_week", lambda: "2026-W44")
    assert client.get(f"/api/pour/board?skin={PUB}").get_json()["scores"] == []
    post(client, score=100)
    conn = sqlite3.connect(db)
    assert conn.execute("SELECT week, score FROM scores").fetchall() == [
        ("2026-W44", 100)
    ]
    conn.close()


def test_the_nickname_words_are_clean_and_short():
    words = json.loads(
        (REPO_ROOT / "play/pour/nicknames.json").read_text(encoding="utf-8")
    )
    for key in ("adjectives", "animals"):
        assert len(words[key]) == len(set(words[key])) >= 20
        assert all(w.isalpha() and w[0].isupper() for w in words[key])
    longest = max(map(len, words["adjectives"])) + 1 + max(map(len, words["animals"]))
    assert longest <= 20


@pytest.mark.parametrize("body", [[1], "hello", 7, None])
def test_a_body_that_is_not_an_object_is_refused(client, body):
    resp = client.post(
        "/api/pour/score", json=body, environ_base={"REMOTE_ADDR": "203.0.113.5"}
    )
    assert resp.status_code in (400, 404)


def test_a_name_keeps_only_its_best_score_of_the_week(client, db):
    for score in (300, 500, 200):
        post(client, score=score)
    post(client, name="Calm Owl", score=400)
    got = client.get(f"/api/pour/board?skin={PUB}").get_json()["scores"]
    assert got == [
        {"name": "Brave Heron", "score": 500},
        {"name": "Calm Owl", "score": 400},
    ]
    conn = sqlite3.connect(db)
    assert conn.execute(
        "SELECT name, score FROM scores ORDER BY score DESC"
    ).fetchall() == [
        ("Brave Heron", 500),
        ("Calm Owl", 400),
    ]
    conn.close()


def test_one_player_cannot_fill_the_board(client):
    for i in range(board.POST_LIMIT):
        post(client, score=100 + i)
    got = client.get(f"/api/pour/board?skin={PUB}").get_json()["scores"]
    assert got == [{"name": "Brave Heron", "score": 100 + board.POST_LIMIT - 1}]


def test_the_same_name_on_another_skin_or_week_is_its_own_row(client, db, monkeypatch):
    other = next(
        p.stem for p in (REPO_ROOT / "play/pour/skins").glob("*.json") if p.stem != PUB
    )
    post(client, score=300)
    post(client, skin=other, score=100)
    assert client.get(f"/api/pour/board?skin={other}").get_json()["scores"] == [
        {"name": "Brave Heron", "score": 100}
    ]
    monkeypatch.setattr(board, "_week", lambda: "2099-W01")
    post(client, score=50)
    assert client.get(f"/api/pour/board?skin={PUB}").get_json()["scores"] == [
        {"name": "Brave Heron", "score": 50}
    ]


def test_a_board_from_before_keeps_each_names_best(client, db):
    conn = sqlite3.connect(db)
    conn.execute(
        "CREATE TABLE scores (skin TEXT NOT NULL, week TEXT NOT NULL, name TEXT NOT NULL, score INTEGER NOT NULL)"
    )
    week = board._week()
    for score in (200, 450, 300):
        conn.execute(
            "INSERT INTO scores VALUES (?, ?, ?, ?)", (PUB, week, "Brave Heron", score)
        )
    conn.commit()
    conn.close()
    assert client.get(f"/api/pour/board?skin={PUB}").get_json()["scores"] == [
        {"name": "Brave Heron", "score": 450}
    ]
    post(client, score=400)
    conn = sqlite3.connect(db)
    assert conn.execute("SELECT name, score FROM scores").fetchall() == [
        ("Brave Heron", 450)
    ]
    conn.close()


def test_workers_opening_a_new_board_at_once_all_get_it(db):
    import threading

    start = threading.Barrier(8)
    errors = []

    def open_it():
        start.wait()
        try:
            board._connect().close()
        except Exception as e:  # noqa: BLE001
            errors.append(e)

    threads = [threading.Thread(target=open_it) for _ in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert errors == []


def test_a_score_back_says_the_names_best_even_off_the_top_ten(client):
    for i in range(10):
        post(client, name=NAMES[i + 1], score=410 + i, ip=f"203.0.113.{i}")
    assert post(client, score=400, ip="198.51.100.1").get_json()["best"] == 400
    got = post(client, score=100, ip="198.51.100.1").get_json()
    assert got["best"] == 400
    assert "Brave Heron" not in [row["name"] for row in got["scores"]]


# P2.0ac: the pub's second way to play, split the mark, keeps a board of its own.
SPLIT_BEST = (
    len(
        json.loads(
            (REPO_ROOT / "play/pour/skins" / f"{PUB}.json").read_text(encoding="utf-8")
        )["mark"]["rounds"]
    )
    * 100
)


def post_split(client, score=200, mode="split", skin=PUB, name="Brave Heron"):
    return client.post(
        "/api/pour/score",
        json={"skin": skin, "mode": mode, "name": name, "score": score},
        environ_base={"REMOTE_ADDR": "203.0.113.5"},
    )


def test_the_split_has_its_own_board_beside_the_pour(client, db):
    assert post_split(client, score=SPLIT_BEST).status_code == 200
    post(client, score=100)
    split = client.get(f"/api/pour/board?skin={PUB}&mode=split").get_json()["scores"]
    pour = client.get(f"/api/pour/board?skin={PUB}").get_json()["scores"]
    assert split == [{"name": "Brave Heron", "score": SPLIT_BEST}]
    assert pour == [{"name": "Brave Heron", "score": 100}]
    rows = (
        sqlite3.connect(db).execute("SELECT skin FROM scores ORDER BY skin").fetchall()
    )
    assert rows == [(PUB,), (f"{PUB}/split",)]


def test_a_split_score_it_cannot_make_is_refused(client):
    assert post_split(client, score=SPLIT_BEST + 1).status_code == 400


@pytest.mark.parametrize("mode", ["pour", "", "Split", 1, ["split"]])
def test_only_the_split_is_a_second_way_to_play(client, mode):
    assert post_split(client, mode=mode).status_code == 404


def test_a_skin_without_a_mark_has_no_split_board(client):
    other = next(
        p.stem
        for p in (REPO_ROOT / "play/pour/skins").glob("*.json")
        if "mark" not in json.loads(p.read_text(encoding="utf-8"))
    )
    assert post_split(client, skin=other).status_code == 404
    assert client.get(f"/api/pour/board?skin={other}&mode=split").status_code == 404
