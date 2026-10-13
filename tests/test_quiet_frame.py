"""D-018: the studio pages sit on a flat, quiet frame; PIKA and VERA keep the old chrome."""

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
STUDIO_PAGES = ("index.html", "promo-games/index.html")
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
    assert selectors
    for selector in selectors:
        assert all(
            part.strip().startswith("body.studio") for part in selector.split(",")
        ), selector
    assert "gradient" not in frame.replace("-webkit-background-clip", "")
    assert "box-shadow:0 " not in frame


def test_the_chat_opens_from_a_footer_link_not_a_floating_button():
    html = _text("index.html")
    footer = html[html.index("<footer>") : html.index("</footer>")]
    assert 'id="chatFab"' in footer
    assert "Ask the site a question" in footer
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
