"""The pour demo's weekly board: POST a score, GET the week's top ten.

Each row is a skin, a name the game assigned from play/pour/nicknames.json, a score
and the week. Nothing else is stored: no address, no device, no time of day. A name
nobody could be given, or a score the skin can't produce, is refused. A name has one
row per skin per week, its best, so a replay only lifts its own score.
"""

import json
import os
import re
import sqlite3
import threading
import time
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

from flask import Blueprint, jsonify, request

from site_context import _find_site_root

board = Blueprint("board", __name__)

TOP = 10
POST_LIMIT = 6  # scores per visitor per window: a game takes longer than ten seconds
GLOBAL_POST_LIMIT = 120
WINDOW = 60
SKIN_ID = re.compile(r"^[a-z0-9-]{1,32}$")

_lock = threading.Lock()
_posts = {}
_global_posts = []


def _db_path():
    configured = os.environ.get("AIDOO_BOARD_DB")
    if configured:
        return Path(configured)
    # Outside /opt/aidoo-api, which every deploy rsyncs over.
    return Path.home() / ".local" / "share" / "aidoo-api" / "board.db"


def _connect():
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS scores (skin TEXT NOT NULL, week TEXT NOT NULL, name TEXT NOT NULL, score INTEGER NOT NULL)"
    )
    # One row per name, held by the database so two workers can't both add one. A board
    # made before that kept every score, so it keeps each name's best first.
    if not conn.execute(
        "SELECT 1 FROM sqlite_master WHERE name = 'one_per_name'"
    ).fetchone():
        conn.execute(
            "DELETE FROM scores WHERE EXISTS (SELECT 1 FROM scores b WHERE b.skin = scores.skin"
            " AND b.week = scores.week AND b.name = scores.name"
            " AND (b.score > scores.score OR (b.score = scores.score AND b.rowid < scores.rowid)))"
        )
        conn.execute("CREATE UNIQUE INDEX one_per_name ON scores (skin, week, name)")
        conn.commit()
    return conn


def _week():
    year, week, _ = datetime.now(timezone.utc).isocalendar()
    return f"{year}-W{week:02d}"


def _game_dir():
    root = _find_site_root()
    return root / "play" / "pour" if root else None


def _names():
    game = _game_dir()
    if not game:
        return set(), set()
    words = json.loads((game / "nicknames.json").read_text(encoding="utf-8"))
    return set(words["adjectives"]), set(words["animals"])


def _best_possible(skin):
    """The most a skin's game can score, or None if there's no such skin."""
    game = _game_dir()
    if not game or not SKIN_ID.match(skin):
        return None
    path = game / "skins" / f"{skin}.json"
    if not path.is_file():
        return None
    return len(json.loads(path.read_text(encoding="utf-8"))["rounds"]) * 100


def _is_nickname(name):
    adjectives, animals = _names()
    parts = name.split(" ") if isinstance(name, str) else []
    return len(parts) == 2 and parts[0] in adjectives and parts[1] in animals


def _too_many(visitor):
    global _global_posts
    now = time.monotonic()
    with _lock:
        for key in [k for k, ts in _posts.items() if now - ts[-1] >= WINDOW]:
            del _posts[key]
        mine = [t for t in _posts.get(visitor, []) if now - t < WINDOW]
        _global_posts = [t for t in _global_posts if now - t < WINDOW]
        if len(mine) >= POST_LIMIT or len(_global_posts) >= GLOBAL_POST_LIMIT:
            return True
        _posts[visitor] = mine + [now]
        _global_posts.append(now)
    return False


def _top(conn, skin, week):
    rows = conn.execute(
        "SELECT name, score FROM scores WHERE skin = ? AND week = ? ORDER BY score DESC, rowid LIMIT ?",
        (skin, week, TOP),
    ).fetchall()
    return [{"name": name, "score": score} for name, score in rows]


@board.route("/api/pour/board", methods=["GET"])
def get_board():
    skin = request.args.get("skin", "")
    if _best_possible(skin) is None:
        return jsonify({"error": "Unknown skin"}), 404
    week = _week()
    with _lock, closing(_connect()) as conn:
        return jsonify({"week": week, "scores": _top(conn, skin, week)})


@board.route("/api/pour/score", methods=["POST"])
def post_score():
    from chat import _visitor_key  # chat registers this blueprint, so import it late

    if _too_many(_visitor_key(request.remote_addr)):
        return jsonify({"error": "Too many scores. Please try again later."}), 429
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Send a JSON object"}), 400
    skin, name, score = data.get("skin"), data.get("name"), data.get("score")
    best = _best_possible(skin) if isinstance(skin, str) else None
    if best is None:
        return jsonify({"error": "Unknown skin"}), 404
    if not _is_nickname(name):
        return jsonify({"error": "Not a name the game gives"}), 400
    if type(score) is not int or not 0 <= score <= best:
        return jsonify({"error": "Not a score the game can make"}), 400
    week = _week()
    with _lock, closing(_connect()) as conn, conn:
        conn.execute(
            "INSERT INTO scores VALUES (?, ?, ?, ?) ON CONFLICT (skin, week, name)"
            " DO UPDATE SET score = excluded.score WHERE excluded.score > score",
            (skin, week, name, score),
        )
        conn.execute(
            "DELETE FROM scores WHERE week < ?", (week,)
        )  # the board starts empty each Monday
        return jsonify({"week": week, "scores": _top(conn, skin, week)})
