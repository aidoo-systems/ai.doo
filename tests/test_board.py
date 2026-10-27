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


def test_the_board_is_the_top_ten_highest_first(client):
    for i in range(12):
        post(client, score=i * 10, ip=f"203.0.113.{i}")
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
