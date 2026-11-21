"""Fill the stamp card pack for one shop: counter sign, staff guide, visit notes, QR and a card render.

    py internal/stamp-pack/make_pack.py internal/<shop>/shop.json [--out DIR]

Reads the shop's `shop.json` (see `example-shop.json` and README.md) and writes, beside it or to
`--out`:

    sign.html       A6 counter sign for a 10x15cm frame, with the live QR
    leaflet.html    A4 staff guide, to laminate
    briefing.html   the owner's notes for the visit (not for the shop)
    qr.svg          the counter QR in the shop's ink, no quiet zone (the sign adds the white)
    <slug>-stamp-card-qr.png   1184px QR with its quiet zone, for posts and menus
    card.png        the card at a few stamps, drawn by the loyalty repo's own renderer

The QR points at https://stamps.aidoo.biz/s/<slug>/new. It only works once the owner has created
the shop on stamps.aidoo.biz/owner with exactly that slug.

Needs Pillow and qrcode (`py -m pip install pillow qrcode`) and the loyalty repo checked out beside
this one (or LOYALTY_SRC pointing at its `src`).
"""

import argparse
import html
import json
import os
import shutil
import sys
from io import BytesIO
from pathlib import Path
from string import Template

import qrcode
from PIL import Image

HERE = Path(__file__).resolve().parent
TEMPLATES = HERE / "templates"
LOYALTY_SRC = Path(os.environ.get("LOYALTY_SRC", HERE.parents[2] / "loyalty" / "src"))

WORDS = {
    3: "three",
    4: "four",
    5: "five",
    6: "six",
    7: "seven",
    8: "eight",
    9: "nine",
    10: "ten",
    11: "eleven",
    12: "twelve",
    13: "thirteen",
    14: "fourteen",
    15: "fifteen",
}
ORDINALS = {
    3: "third",
    4: "fourth",
    5: "fifth",
    6: "sixth",
    7: "seventh",
    8: "eighth",
    9: "ninth",
    10: "tenth",
    11: "eleventh",
    12: "twelfth",
    13: "thirteenth",
    14: "fourteenth",
    15: "fifteenth",
}

DEFAULT_BAG = [
    "The framed counter sign",
    "The laminated leaflet",
    "Both phones, charged, and a charger",
    "Notebook and pen",
    "The gift bag to put it all in",
]
QR_QUIET, QR_SCALE = (
    4,
    32,
)  # the post PNG: 4 white modules each side, 32px a module (1184px at version 3)


def card_url(slug: str) -> str:
    return f"https://stamps.aidoo.biz/s/{slug}/new"


def qr_matrix(text: str) -> list[list[bool]]:
    """Level M, mask chosen by the library: the same symbol Davison's sign carries."""
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0)
    qr.add_data(text)
    qr.make(fit=True)
    return qr.get_matrix()


def qr_svg(matrix, ink: str) -> str:
    n = len(matrix)
    d = "".join(
        f"M{x} {y}h1v1h-1z"
        for y, row in enumerate(matrix)
        for x, dark in enumerate(row)
        if dark
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}" shape-rendering="crispEdges">'
        f'<path fill="{ink}" d="{d}"/></svg>\n'
    )


def qr_png(matrix, ink: str) -> bytes:
    n = len(matrix) + 2 * QR_QUIET
    small = Image.new("RGB", (n, n), "#FFFFFF")
    for y, row in enumerate(matrix):
        for x, dark in enumerate(row):
            if dark:
                small.putpixel((x + QR_QUIET, y + QR_QUIET), hex_rgb(ink))
    out = BytesIO()
    small.resize((n * QR_SCALE, n * QR_SCALE), Image.NEAREST).save(
        out, "PNG", optimize=True
    )
    return out.getvalue()


def hex_rgb(colour: str) -> tuple[int, int, int]:
    c = colour.lstrip("#")
    return int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)


def mix(a: str, b: str, t: float) -> str:
    """`t` of the way from colour a to colour b."""
    ra, rb = hex_rgb(a), hex_rgb(b)
    return "#" + "".join(f"{round(x + (y - x) * t):02x}" for x, y in zip(ra, rb))


def plain_png(data: bytes) -> bytes:
    """The loyalty renderer reads 8-bit RGB(A), not interlaced, no tRNS: re-save anything else as RGBA."""
    sys.path.insert(0, str(LOYALTY_SRC))
    from loyalty import render

    if render.read_png(data) is not None:
        return data
    out = BytesIO()
    Image.open(BytesIO(data)).convert("RGBA").save(out, "PNG")
    return out.getvalue()


def render_card(shop: dict, folder: Path) -> bytes:
    sys.path.insert(0, str(LOYALTY_SRC))
    from loyalty import render

    logo = plain_png((folder / shop["logo"]).read_bytes()) if shop.get("logo") else None
    wm_file = shop.get("card_wordmark") or shop.get("wordmark")
    wordmark = plain_png((folder / wm_file).read_bytes()) if wm_file else None
    card = shop["card"]
    return render.stamp_boxes_png(
        card["bg"],
        card["fg"],
        shop["stamps"],
        shop.get("card_count", 4),
        logo,
        wordmark=wordmark,
    )


def fields(shop: dict, folder: Path) -> dict:
    stamps = int(shop["stamps"])
    if stamps not in WORDS:
        sys.exit("stamps must be 3 to 15 (the stamps service's range)")
    name_html = html.escape(shop["name"], quote=False)
    reward = shop["reward"]
    reward_lower = reward[0].lower() + reward[1:]
    p = shop["print"]
    ink, accent = p["ink"], p["accent"]
    talking = Path(shop.get("talking_points", TEMPLATES / "talking-points.html"))
    if not talking.is_absolute():
        talking = folder / talking
    bag = shop.get("in_the_bag", DEFAULT_BAG)
    bag_html = (
        '  <h2>In the bag</h2>\n  <ul class="check">\n'
        + "".join(f"    <li>{i}</li>\n" for i in bag)
        + "  </ul>\n\n"
    )
    return {
        "slug": shop["slug"],
        "name_html": name_html,
        "name_poss": html.escape(
            shop.get("name_possessive", shop["name"] + "'s"), quote=False
        ),
        "card_url": card_url(shop["slug"]),
        "stamps": stamps,
        "Stamps_word": WORDS[stamps].capitalize(),
        "stamps_ordinal": ORDINALS[stamps],
        "reward": reward,
        "reward_lower": reward_lower,
        "reward_noun": shop["reward_noun"],
        "headline_html": shop.get(
            "headline_html", f"Collect {stamps} stamps,<br>get {reward_lower}"
        ),
        "card_bg": shop["card"]["bg"],
        "card_fg": shop["card"]["fg"],
        "ink": ink,
        "ink_rgb": ",".join(str(v) for v in hex_rgb(ink)),
        "accent": accent,
        "wash": p.get("wash", mix(accent, "#FFFFFF", 0.9)),
        "deep": p.get("deep", mix(ink, "#000000", 0.25)),
        "backdrop": p.get("backdrop", "#e9ecec"),
        "paper": p.get("paper", "#fff"),
        "sign_wordmark_mm": shop.get("sign_wordmark_mm", 64),
        "leaflet_wordmark_mm": shop.get("leaflet_wordmark_mm", 62),
        "counters_line": shop.get(
            "counters_line",
            "You can pair a second phone too, for a busy counter. Both stamp the same cards.",
        ),
        "occasion": shop.get("occasion", "visit"),
        "notes_kind": shop.get("notes_kind", "visit notes"),
        "when_html": shop.get("when_html", "Walk-in"),
        "logo_file": shop.get("logo_upload", Path(shop.get("logo", "")).name),
        "wordmark_upload": shop.get(
            "wordmark_upload", "their name logo, <b>wordmark.png</b>"
        ),
        "notes_comment": shop.get(
            "notes_comment",
            f"Keith's own notes for {name_html}, {shop.get('occasion', 'visit')}. Not for the shop.",
        ),
        "logo_desc": shop.get("logo_desc", "their mark"),
        "wordmark_desc": shop.get("wordmark_desc", "their name logo"),
        "in_the_bag": bag_html,
        "talking_points": talking.read_text(encoding="utf-8"),
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("shop", type=Path, help="the shop's shop.json")
    ap.add_argument(
        "--out", type=Path, help="where to write (default: beside shop.json)"
    )
    ap.add_argument(
        "--no-card", action="store_true", help="skip card.png (it takes a few seconds)"
    )
    args = ap.parse_args()

    folder = args.shop.resolve().parent
    shop = json.loads(args.shop.read_text(encoding="utf-8"))
    out = (args.out or folder).resolve()
    out.mkdir(parents=True, exist_ok=True)
    values = fields(shop, folder)

    for name in ("sign.html", "leaflet.html", "briefing.html"):
        text = Template((TEMPLATES / name).read_text(encoding="utf-8")).substitute(
            values
        )
        (out / name).write_text(text, encoding="utf-8", newline="\n")
    wordmark = folder / shop["wordmark"] if shop.get("wordmark") else None
    if wordmark and wordmark.resolve() != (out / "wordmark.png").resolve():
        shutil.copyfile(
            wordmark, out / "wordmark.png"
        )  # the sign and leaflet load wordmark.png

    matrix = qr_matrix(card_url(shop["slug"]))
    ink = shop["print"]["ink"]
    (out / "qr.svg").write_text(
        qr_svg(matrix, ink).rstrip("\n"), encoding="utf-8", newline="\n"
    )
    (out / f"{shop['slug']}-stamp-card-qr.png").write_bytes(qr_png(matrix, ink))
    if not args.no_card:
        (out / "card.png").write_bytes(render_card(shop, folder))
    print(f"{shop['name']}: pack written to {out}")


if __name__ == "__main__":
    main()
