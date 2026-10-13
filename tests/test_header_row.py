"""The header's row must be a class something styles, or the bar falls apart (vera/changelog, 2026-10)."""

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", "_docs_build", "docs", "overrides", "node_modules"}
HEADER_ROW = re.compile(r'<header[^>]*>\s*<div class="([^"]+)"')


def _pages():
    for path in sorted(REPO_ROOT.rglob("*.html")):
        if not SKIP_DIRS.intersection(path.relative_to(REPO_ROOT).parts):
            yield path


def test_every_header_row_has_a_style_rule():
    shared = (REPO_ROOT / "style.css").read_text(encoding="utf-8")
    checked = 0
    for path in _pages():
        html = path.read_text(encoding="utf-8")
        row = HEADER_ROW.search(html)
        if not row:
            continue
        checked += 1
        css = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", html, re.S))
        if (
            'href="../style.css"' in html
            or 'href="/style.css"' in html
            or 'href="style.css"' in html
        ):
            css += shared
        for name in row.group(1).split():
            rule = re.compile(r"\." + re.escape(name) + r"\s*[{,]")
            assert rule.search(css), (
                f"{path.relative_to(REPO_ROOT)}: no rule for .{name}"
            )
    assert checked >= 4
