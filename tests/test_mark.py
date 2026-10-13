"""D-020: the mark is the ball from the wordmark. The head-and-brain logo is retired."""

import json
import re
import struct
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", "_docs_build", "docs", "overrides", "node_modules"}


def _text(rel):
    return (REPO_ROOT / rel).read_text(encoding="utf-8")


def _pages():
    for path in sorted(REPO_ROOT.rglob("*.html")):
        if not SKIP_DIRS.intersection(path.relative_to(REPO_ROOT).parts):
            yield path


def _png_size(rel):
    data = (REPO_ROOT / rel).read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", rel
    return struct.unpack(">II", data[16:24])


def test_the_favicon_is_three_flat_shapes():
    svg = _text("favicon.svg")
    assert len(svg) < 700
    assert 'viewBox="0 0 64 64"' in svg
    # flat: nothing a 16px tab icon can't hold
    for banned in ("Gradient", "<filter", "<mask", "<image", "<text", "<script"):
        assert banned not in svg, banned
    shapes = re.findall(r"<(circle|ellipse|path|rect)\b", svg)
    assert shapes == ["circle", "path", "ellipse"]
    assert set(re.findall(r'fill="(#[0-9a-f]{6})"', svg)) == {
        "#f5b544",
        "#e09a2e",
        "#ffe9b8",
    }


def test_the_head_is_gone_from_every_page():
    for path in _pages():
        html = path.read_text(encoding="utf-8")
        body = html[html.index("<body") :] if "<body" in html else html
        assert 'class="logoMark"' not in body, path.relative_to(REPO_ROOT)
        # the mark is never an <img> beside the wordmark any more: the wordmark's dot is it
        assert not re.search(r'<img src="[^"]*favicon\.svg"', body), path.relative_to(
            REPO_ROOT
        )


def test_the_studio_wordmark_carries_the_mark_and_rests_amber():
    css = _text("style.css")
    assert "body.studio .wm-dot{" in css
    rule = css[css.index("body.studio .wm-dot{") :].split("}")[0]
    assert "url('/favicon.svg')" in rule
    js = _text("studio.js")
    # the dot is not recoloured at rest: colour belongs to the ball while it bounces
    assert "dot.style.background" not in js
    assert '"#f5b544"' in js


def test_the_avatars_exist_at_the_sizes_platforms_want():
    assert _png_size("apple-touch-icon.png") == (180, 180)
    assert _png_size("images/brand/ai-doo-logo-512.png") == (512, 512)
    assert _png_size("images/brand/ai-doo-avatar-1024.png") == (1024, 1024)
    assert _png_size("images/brand/ai-doo-ball-512.png") == (512, 512)
    avatar = _text("images/brand/ai-doo-avatar.svg")
    assert "#141312" in avatar and "#f5b544" in avatar and "Gradient" not in avatar


def test_search_engines_are_pointed_at_a_real_image_of_the_mark():
    html = _text("index.html")
    block = re.search(
        r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL
    ).group(1)
    logo = json.loads(block)["logo"]
    assert logo == "https://aidoo.biz/images/brand/ai-doo-logo-512.png"
    assert (REPO_ROOT / logo.replace("https://aidoo.biz/", "")).is_file()
