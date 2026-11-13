"""The Reactor Panic v8.3 video: "It starts at the end" (24.3s, 1080x1920, with the game's own sound).

Cuts the footage that reactor-panic's tools/promo_film.gd records (360x640 PNG frames, f.wav and
marks.json) and scales it 3x with hard pixels. Everything up to the report is one run of the game:
the video opens on its meltdown countdown, goes back to the quiet night, and plays on through the
ejections, the Overdrive press and the climb to the countdown again, so the score and clock agree
throughout. The captions are one sentence told in pieces, in the game's own stencil face; nothing
else is drawn on the game. Each cut hands over in its own way (see CUTS): a freeze in silence, the
klaxon arriving early, a dip to black.

    python reactor.py <film folder> <out.mp4>            the video
    python reactor.py <film folder> <strip.jpg> --strip  stills only, three a second, to check a layout

Needs: pip install av pillow numpy fonttools brotli  (PyAV carries its own ffmpeg).
"""

import json
import sys
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
W, H, FPS, RATE, SCALE = 1080, 1920, 60, 48000, 3
INK, AMBER = (244, 241, 234), (245, 181, 68)

# The timeline. Each cut: a mark in marks.json, where it starts from that mark (seconds; before
# it if negative), how long it runs, the caption over it, and how it hands over to the next cut:
#   freeze   the picture holds on its last frame, in silence, then cuts
#   runs on  the same take carries on; only the words change
#   lead     the next cut's sound comes in early, under the end of this one
#   dip      down to black, and the next cut comes up out of it
#   loop     the last cut: its sound eases out so the loop back to the start is clean
# One sentence, told in pieces: "Earlier that night you were supposed to sort the cores."
CUTS = [
    # MELTDOWN IN 5 to 3, from the end of the same run, once the runway has gone.
    ("countdown_start", 4.5, 1.9, "This is your fault.", "freeze"),
    ("night", 0.0, 1.4, "Earlier that night", "runs on"),
    ("night", 1.4, 1.2, "you were supposed", "runs on"),
    ("night", 2.6, 1.3, "to sort the cores.", "runs on"),
    ("night", 3.9, 2.5, "Nice and steady.", "runs on"),
    # Overdrive is live after the ejections; the button waits, then is pressed at 7.8s.
    ("night", 6.4, 1.4, "But then", "runs on"),
    ("night", 7.8, 2.3, "You hit Overdrive.", "runs on"),
    # What Overdrive did, with no words: mismatches, CAUTION, CRITICAL, MELTDOWN IMMINENT.
    ("night", 10.1, 4.8, None, "lead"),
    # The countdown reaches zero; the report is the joke, so no words. It runs until the grade
    # is stamped, then dips.
    ("zero", -0.35, 4.4, None, "dip"),
    ("title", 0.0, 2.8, None, "loop"),  # the last line goes over the sky window instead
]
FREEZE = 0.3  # seconds held, silent
LEAD = 0.33  # seconds of the next cut's sound under this one
LEAD_DUCK = 0.55  # what this cut's own sound falls to under the lead
DIP = 0.3  # seconds down to black, and the same back up
LOOP_TAIL = 0.35
# Captions sit in one band, clear of what the apps cover (top 12%, bottom 25%). They are on
# after a cut and off before the next one, so every cut is on a clean picture.
BAND_TOP, BAND_H, BAND_ALPHA = 1152, 186, 150
CAPTION_IN, CAPTION_RISE, CAPTION_OUT = 0.32, 28, 0.14
CAPTION_OPEN, CAPTION_AFTER, CAPTION_BEFORE, CAPTION_SWAP = 0.1, 0.2, 0.15, 0.04
# The title screen's sky window, in output pixels, and what goes over it.
SKY = (24, 228, 1056, 480)
LAST_LINE, LAST_Y = "On Google Play and the App Store", 312
MARK_SIZE, MARK_Y = 84, 410
LAST_AT, MARK_AT, BALL_AT = 0.35, 0.6, 0.85  # seconds into the title cut
GAIN, CEILING = 1.5, 0.97  # the game's mix is quiet for a phone feed

# The words are in the game's 5x7 stencil face (reactor-panic's scripts/StencilFont.gd, the
# letters of its title), drawn in blocks the way the game draws them, in the paper white of its
# incident report (the owner's pick, face B, 2026-11-13). Sizes are block widths in output
# pixels. Only the wordmark is in the studio's Bricolage.
CAPTION_CELL, LAST_CELL, PAPER = 9, 5, (240, 232, 209)
STENCIL = {
    "A": "01110 10001 10001 11111 10001 10001 10001",
    "B": "11110 10001 10001 11110 10001 10001 11110",
    "C": "01111 10000 10000 10000 10000 10000 01111",
    "D": "11110 10001 10001 10001 10001 10001 11110",
    "E": "11111 10000 10000 11110 10000 10000 11111",
    "F": "11111 10000 10000 11110 10000 10000 10000",
    "G": "01111 10000 10000 10111 10001 10001 01110",
    "H": "10001 10001 10001 11111 10001 10001 10001",
    "I": "11111 00100 00100 00100 00100 00100 11111",
    "J": "00111 00010 00010 00010 00010 10010 01100",
    "K": "10001 10010 10100 11000 10100 10010 10001",
    "L": "10000 10000 10000 10000 10000 10000 11111",
    "M": "10001 11011 10101 10101 10001 10001 10001",
    "N": "10001 11001 10101 10011 10001 10001 10001",
    "O": "01110 10001 10001 10001 10001 10001 01110",
    "P": "11110 10001 10001 11110 10000 10000 10000",
    "Q": "01110 10001 10001 10001 10101 10010 01101",
    "R": "11110 10001 10001 11110 10100 10010 10001",
    "S": "01111 10000 10000 01110 00001 00001 11110",
    "T": "11111 00100 00100 00100 00100 00100 00100",
    "U": "10001 10001 10001 10001 10001 10001 01110",
    "V": "10001 10001 10001 10001 10001 01010 00100",
    "W": "10001 10001 10001 10101 10101 11011 10001",
    "X": "10001 01010 00100 00100 00100 01010 10001",
    "Y": "10001 01010 00100 00100 00100 00100 00100",
    "Z": "11111 00001 00010 00100 01000 10000 11111",
    ".": "00000 00000 00000 00000 00000 00110 00110",
    "!": "00100 00100 00100 00100 00100 00000 00100",
}


def ease(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def font(size, weight):
    """Bricolage Grotesque from the site's own WOFF2 (Pillow reads TTF, so convert once)."""
    ttf = HERE / "out" / "bricolage-grotesque-latin.ttf"
    if not ttf.exists():
        from fontTools.ttLib import TTFont

        ttf.parent.mkdir(exist_ok=True)
        face = TTFont(REPO / "fonts" / "bricolage-grotesque-latin.woff2")
        face.flavor = None
        face.save(ttf)
    f = ImageFont.truetype(str(ttf), size)
    axes = f.get_variation_axes()
    f.set_variation_by_axes(
        [weight if a["name"] in (b"Weight", "Weight") else a["default"] for a in axes]
    )
    return f


def shadowed(size, draw, glow=None):
    """An image of `size` with what `draw(d, dy, colour)` draws, over a soft shadow of the same
    (and, between the two, a glow in the colour `glow`)."""
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    layers = [
        ((0, 0, 0, 170), 4, 7),
        ((*glow, 120), 0, 9) if glow else None,
        (None, 0, 0),
    ]
    for colour, dy, blur in filter(None, layers):
        layer = Image.new("RGBA", size, (0, 0, 0, 0))
        draw(ImageDraw.Draw(layer), dy, colour)
        im = Image.alpha_composite(
            im, layer.filter(ImageFilter.GaussianBlur(blur)) if blur else layer
        )
    return im


_sprites = {}


def sprite(text, size, weight=800, fill=INK, tracking=0.0):
    """A line of Bricolage with a soft shadow under it: the image, the x of its ink's left edge,
    its baseline, its width, and half the height of its capitals."""
    key = (text, size, weight, fill, tracking)
    if key not in _sprites:
        f, pad = font(size, weight), 36
        widths = [f.getlength(ch) + tracking * size for ch in text]
        ascent, descent = f.getmetrics()

        def draw(d, dy, colour):
            x = float(pad)
            for ch, w in zip(text, widths):
                d.text((x, pad + dy), ch, font=f, fill=colour or (*fill, 255))
                x += w

        im = shadowed((int(sum(widths)) + 2 * pad, ascent + descent + 2 * pad), draw)
        _sprites[key] = (im, pad, pad + ascent, sum(widths), size * 0.33)
    return _sprites[key]


def stencil(text, cell, fill):
    """The same, in the game's stencil face, lit the way its title is: capitals only, no full
    stop at the end, each block `cell` wide less a one-pixel gap, a letter six cells and a
    space four."""
    key = ("stencil", text, cell, fill)
    if key not in _sprites:
        pad, text = 36, text.upper().rstrip(".")
        starts = [0]
        for ch in text:
            starts.append(starts[-1] + (4 if ch == " " else 6))
        width = (starts[-1] - 1) * cell - 1

        def draw(d, dy, colour):
            for ch, at in zip(text, starts):
                for r, row in enumerate(STENCIL.get(ch, "").split()):
                    for c, on in enumerate(row):
                        if on == "1":
                            x, y = pad + (at + c) * cell, pad + r * cell + dy
                            d.rectangle(
                                (x, y, x + cell - 2, y + cell - 2),
                                fill=colour or (*fill, 255),
                            )

        im = shadowed((width + 2 * pad, 7 * cell + 2 * pad), draw, glow=fill)
        _sprites[key] = (im, pad, pad + 7 * cell - 1, width, 3.5 * cell)
    return _sprites[key]


def paste(canvas, im, xy, alpha):
    if alpha <= 0.0:
        return
    if alpha < 1.0:
        im = im.copy()
        im.putalpha(im.getchannel("A").point(lambda v: int(v * alpha)))
    canvas.alpha_composite(im, (int(round(xy[0])), int(round(xy[1]))))


_ball = {}


def ball(size):
    """favicon.svg's ball (D-020), drawn to size: the ball, its shaded side, a glint."""
    if size not in _ball:
        s = 8  # supersample
        n = size * s
        im = Image.new("RGBA", (n, n), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        u = n / 64
        d.ellipse((2 * u, 2 * u, 62 * u, 62 * u), fill=(245, 181, 68, 255))
        shade = Image.new("L", (n, n), 0)
        ImageDraw.Draw(shade).ellipse((2 * u, 2 * u, 62 * u, 62 * u), fill=255)
        # The lit part is a circle of the same size, up and to the left; the rest is the shaded side.
        ImageDraw.Draw(shade).ellipse(
            (-10.1 * u, -10.1 * u, 49.9 * u, 49.9 * u), fill=0
        )
        im.paste((224, 154, 46, 255), (0, 0), shade)
        glint = Image.new("RGBA", (n, n), (0, 0, 0, 0))
        ImageDraw.Draw(glint).ellipse(
            (14.5 * u, 14.5 * u, 30.5 * u, 24.5 * u), fill=(255, 233, 184, 255)
        )
        im.alpha_composite(
            glint.rotate(38, center=(22.5 * u, 19.5 * u), resample=Image.BICUBIC)
        )
        _ball[size] = im.resize((size, size), Image.LANCZOS)
    return _ball[size]


def shots(film, marks):
    """CUTS in frames: where each starts in the footage and in the video, how long it runs
    and how long it then holds."""
    out, at = [], 0
    for take, start, length, caption, ends in CUTS:
        shot = dict(
            take=take, first=marks[take] + round(start * FPS), run=round(length * FPS)
        )
        shot.update(caption=caption, ends=ends, at=at)
        shot["hold"] = round(FREEZE * FPS) if ends == "freeze" else 0
        out.append(shot)
        at += shot["run"] + shot["hold"]
    return out


def timeline(plan):
    """(shot index, frame within the shot) for every output frame."""
    return [(i, n) for i, s in enumerate(plan) for n in range(s["run"] + s["hold"])]


def overlay(plan, i, n):
    """Everything of ours for this frame, on a clear canvas: the caption band, or the last line."""
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shot = plan[i]
    t, length = n / FPS, (shot["run"] + shot["hold"]) / FPS
    if shot["caption"]:
        # On after the cut, off before the next. Where the take runs on there is no cut, so the
        # band stays and only the words change.
        swapped_in = i > 0 and plan[i - 1]["ends"] == "runs on"
        swaps_out = (
            shot["ends"] == "runs on" and i + 1 < len(plan) and plan[i + 1]["caption"]
        )
        start = (
            CAPTION_SWAP if swapped_in else CAPTION_OPEN if i == 0 else CAPTION_AFTER
        )
        gone = length - (0.0 if swaps_out else CAPTION_BEFORE)
        band = (1.0 if swapped_in else ease((t - start + 0.1) / 0.25)) * (
            1.0 if swaps_out else ease((gone - t) / 0.2)
        )
        d = ImageDraw.Draw(canvas)
        d.rectangle(
            (0, BAND_TOP, W, BAND_TOP + BAND_H),
            fill=(0, 0, 0, int(BAND_ALPHA * band)),
        )
        im, pad, base, width, half = stencil(shot["caption"], CAPTION_CELL, PAPER)
        arrive = ease((t - start) / CAPTION_IN)
        a = arrive * min(1.0, max(0.0, (gone - t) / CAPTION_OUT))
        y = BAND_TOP + BAND_H / 2 + half - base + (1 - arrive) * CAPTION_RISE
        paste(canvas, im, ((W - width) / 2 - pad, y), a)
    elif shot["take"] == "title":
        scrim = ease((t - LAST_AT + 0.1) / 0.4)
        ImageDraw.Draw(canvas).rectangle(SKY, fill=(4, 8, 20, int(150 * scrim)))
        im, pad, base, width, _ = stencil(LAST_LINE, LAST_CELL, PAPER)
        a = ease((t - LAST_AT) / 0.4)
        paste(canvas, im, ((W - width) / 2 - pad, LAST_Y - base + (1 - a) * 22), a)
        # The wordmark, always in the studio's own face: "ai", the ball on the baseline where
        # the full stop would be, "doo".
        left, lpad, lbase, lw, _ = sprite("ai", MARK_SIZE, 700, tracking=-0.02)
        right, _, _, rw, _ = sprite("doo", MARK_SIZE, 700, tracking=-0.02)
        dot, gap = round(MARK_SIZE * 0.5), MARK_SIZE * 0.13
        x = (W - (lw + rw + dot + 2 * gap)) / 2
        a = ease((t - MARK_AT) / 0.4)
        rise = (1 - a) * 22
        paste(canvas, left, (x - lpad, MARK_Y - lbase + rise), a)
        paste(canvas, right, (x + lw + dot + 2 * gap - lpad, MARK_Y - lbase + rise), a)
        # The ball drops in and settles with one small bounce.
        b = (t - BALL_AT) / 0.5
        if b > 0:
            drop = (
                0.0
                if b >= 1
                else (1 - b / 0.62) ** 2 * -150
                if b < 0.62
                else -14 * np.sin((b - 0.62) / 0.38 * np.pi)
            )
            paste(
                canvas,
                ball(dot),
                (x + lw + gap, MARK_Y - dot + drop),
                min(1.0, b / 0.12),
            )
    return canvas


def frame(film, plan, i, n):
    shot = plan[i]
    src = shot["first"] + min(n, shot["run"] - 1)  # past the run, the picture holds
    game = (
        Image.open(film / f"f{src:08d}.png")
        .convert("RGB")
        .resize((W, H), Image.NEAREST)
    )
    t, left = n / FPS, (shot["run"] + shot["hold"] - n) / FPS
    arrived = plan[i - 1]["ends"] if i else None
    game = game.convert("RGBA")
    game.alpha_composite(overlay(plan, i, n))
    game = game.convert("RGB")
    dark = 0.0
    if shot["ends"] == "dip" and left <= DIP:
        dark = 1 - (left - 1 / FPS) / DIP  # the last frame is black
    elif arrived == "dip" and t < DIP:
        dark = 1 - t / DIP
    if dark > 0:
        game = Image.blend(game, Image.new("RGB", (W, H), (0, 0, 0)), min(1.0, dark))
    return game


def sound(film, marks, plan):
    """The game's own sound for each cut, joined to match the picture: a few milliseconds of
    fade so no cut clicks, silence under a freeze, the next cut's sound early under a lead."""
    with wave.open(str(film / "f.wav")) as wv:
        assert wv.getframerate() == RATE and wv.getnchannels() == 2, (
            "expected the movie writer's 48 kHz stereo"
        )
        kind = {2: np.int16, 4: np.int32}[wv.getsampwidth()]
        raw = (
            np.frombuffer(wv.readframes(wv.getnframes()), dtype=kind).astype(np.float32)
            / np.iinfo(kind).max
        )
    raw = raw.reshape(-1, 2)
    per_frame, parts, click = RATE // FPS, [], int(RATE * 0.008)

    def up(n):
        return np.linspace(0.0, 1.0, n, dtype=np.float32)[:, None]

    for i, shot in enumerate(plan):
        a = shot["first"] * per_frame
        part = raw[a : a + shot["run"] * per_frame].copy()
        arrived = plan[i - 1]["ends"] if i else None
        if arrived == "dip":
            part[: int(RATE * DIP)] *= up(int(RATE * DIP))
        elif arrived not in ("runs on", "lead"):
            part[:click] *= up(click)
        if shot["ends"] == "lead":
            nxt = plan[i + 1]
            b = nxt["first"] * per_frame
            n = min(int(RATE * LEAD), b, len(part))
            part[-n:] *= np.linspace(1.0, LEAD_DUCK, n, dtype=np.float32)[:, None]
            part[-n:] += raw[b - n : b] * up(n)
        elif shot["ends"] == "dip":
            part[-int(RATE * DIP) :] *= up(int(RATE * DIP))[::-1]
        elif shot["ends"] == "loop":
            part[-int(RATE * LOOP_TAIL) :] *= up(int(RATE * LOOP_TAIL))[::-1]
        elif shot["ends"] != "runs on":
            part[-click:] *= up(click)[::-1]
        parts.append(part)
        if shot["hold"]:
            parts.append(np.zeros((shot["hold"] * per_frame, 2), dtype=np.float32))
    mix = np.concatenate(parts) * GAIN
    # Louder for a phone feed, with the few peaks that would clip folded over softly instead.
    over = np.abs(mix) > 0.8
    mix[over] = np.sign(mix[over]) * (
        0.8 + (CEILING - 0.8) * np.tanh((np.abs(mix[over]) - 0.8) / (CEILING - 0.8))
    )
    return mix


def strip(film, marks, out):
    plan = shots(film, marks)
    frames = [(i, n) for i, n in timeline(plan) if n % 20 == 0]
    cols, w, h = 9, W // 4, H // 4
    rows = (len(frames) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (w + 8) + 8, rows * (h + 30) + 8), (20, 19, 18))
    d = ImageDraw.Draw(sheet)
    label = font(18, 500)
    for k, (i, n) in enumerate(frames):
        x, y = 8 + (k % cols) * (w + 8), 8 + (k // cols) * (h + 30)
        sheet.paste(frame(film, plan, i, n).resize((w, h), Image.LANCZOS), (x, y + 24))
        d.text((x, y), f"{(plan[i]['at'] + n) / FPS:.2f}s", font=label, fill=AMBER)
    sheet.save(out, quality=88)
    print(out, sheet.size)


def render(film, marks, out):
    import av
    from av.video.reformatter import ColorRange, Colorspace

    plan = shots(film, marks)
    box = av.open(str(out), "w", options={"movflags": "faststart"})
    vs = box.add_stream("libx264", rate=FPS)
    vs.width, vs.height, vs.pix_fmt = W, H, "yuv420p"
    vs.options = {"crf": "19", "preset": "slow"}
    # Say which colours these are (BT.709, TV range), or players guess and the reds shift.
    vs.codec_context.colorspace, vs.codec_context.color_range = (
        Colorspace.ITU709,
        ColorRange.MPEG,
    )
    vs.codec_context.color_primaries, vs.codec_context.color_trc = 1, 1
    snd = box.add_stream("aac", rate=RATE)
    snd.layout, snd.bit_rate = "stereo", 192000
    frames = timeline(plan)
    for k, (i, n) in enumerate(frames):
        vf = av.VideoFrame.from_ndarray(
            np.asarray(frame(film, plan, i, n)), format="rgb24"
        )
        vf = vf.reformat(
            format="yuv420p",
            dst_colorspace=Colorspace.ITU709,
            dst_color_range=ColorRange.MPEG,
        )
        vf.pts = k
        for p in vs.encode(vf):
            box.mux(p)
        if k % 120 == 0:
            print(f"  {k / FPS:.0f}s of {len(frames) / FPS:.1f}s", flush=True)
    for p in vs.encode():
        box.mux(p)
    mix = np.ascontiguousarray(sound(film, marks, plan).T)
    for s in range(0, mix.shape[1], 1024):
        af = av.AudioFrame.from_ndarray(
            np.ascontiguousarray(mix[:, s : s + 1024]), format="fltp", layout="stereo"
        )
        af.sample_rate, af.pts = RATE, s
        for p in snd.encode(af):
            box.mux(p)
    for p in snd.encode():
        box.mux(p)
    box.close()
    print(out, f"{len(frames) / FPS:.2f}s")


if __name__ == "__main__":
    film, out = Path(sys.argv[1]), Path(sys.argv[2])
    marks = json.loads((film / "marks.json").read_text())["marks"]
    out.parent.mkdir(parents=True, exist_ok=True)
    (strip if "--strip" in sys.argv else render)(film, marks, out)
