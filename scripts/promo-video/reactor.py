"""The Reactor Panic v8.3 video: "It starts at the end" (17.8s, 1080x1920, with the game's own sound).

Cuts the footage that reactor-panic's tools/promo_film.gd records (360x640 PNG frames, f.wav and
marks.json) into six beats, scales it 3x with hard pixels, and lays the captions and the last line
over it. Nothing else is drawn on the game.

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

# The timeline. Each cut: the take it comes from (a mark in marks.json), where in the take it
# starts (seconds), how long it runs, and the caption over it. The night take runs on through
# two cuts: the quiet, then the sorting.
CUTS = [
    ("countdown", 0.05, 2.0, "This is your fault."),
    ("night", 0.0, 2.0, "Earlier that night."),
    ("night", 2.0, 4.0, "Sort the cores."),
    ("storm", 0.0, 2.8, "Keep it stable."),
    (
        "end",
        0.5,
        4.2,
        None,
    ),  # the countdown reaches zero; the report is the joke, so no words
    ("title", 0.0, 2.8, None),  # the last line goes over the sky window instead
]
# Captions sit in one band, clear of what the apps cover (top 12%, bottom 25%).
BAND_TOP, BAND_H, BAND_ALPHA = 1152, 186, 150
CAPTION_SIZE, CAPTION_IN, CAPTION_RISE, CAPTION_OUT = 86, 0.32, 28, 0.14
# The title screen's sky window, in output pixels, and what goes over it.
SKY = (24, 228, 1056, 480)
LAST_LINE, LAST_SIZE, LAST_Y = "On Google Play and the App Store", 54, 312
MARK_SIZE, MARK_Y = 84, 410
LAST_AT, MARK_AT, BALL_AT = 0.35, 0.6, 0.85  # seconds into the title cut
GAIN, CEILING = 1.5, 0.97  # the game's mix is quiet for a phone feed


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


_sprites = {}


def sprite(text, size, weight=800, fill=INK, tracking=0.0):
    """A line of type with a soft shadow under it, and the x of its ink's left edge and baseline."""
    key = (text, size, weight, fill, tracking)
    if key not in _sprites:
        f, pad = font(size, weight), 36
        widths = [f.getlength(ch) + tracking * size for ch in text]
        ascent, descent = f.getmetrics()
        im = Image.new(
            "RGBA",
            (int(sum(widths)) + 2 * pad, ascent + descent + 2 * pad),
            (0, 0, 0, 0),
        )
        for colour, dy, blur in (((0, 0, 0, 170), 4, 7), ((*fill, 255), 0, 0)):
            layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
            d, x = ImageDraw.Draw(layer), float(pad)
            for ch, w in zip(text, widths):
                d.text((x, pad + dy), ch, font=f, fill=colour)
                x += w
            im = Image.alpha_composite(
                im, layer.filter(ImageFilter.GaussianBlur(blur)) if blur else layer
            )
        _sprites[key] = (im, pad, pad + ascent, sum(widths))
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


def timeline():
    """(cut index, seconds into the cut, seconds into the video) for every output frame."""
    out, t0 = [], 0.0
    for i, (_, _, length, _) in enumerate(CUTS):
        for n in range(round(length * FPS)):
            out.append((i, n / FPS, t0 + n / FPS))
        t0 += length
    return out


def overlay(cut, t):
    """Everything of ours for this frame, on a clear canvas: the caption band, or the last line."""
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    take, _, length, caption = CUTS[cut]
    if caption:
        # The band runs through every captioned cut; only the first one brings it in, the last takes it out.
        first = cut == 0 or not CUTS[cut - 1][3]
        last = cut == len(CUTS) - 1 or not CUTS[cut + 1][3]
        band = (ease(t / 0.25) if first else 1.0) * (
            ease((length - t) / 0.2) if last else 1.0
        )
        ImageDraw.Draw(canvas).rectangle(
            (0, BAND_TOP, W, BAND_TOP + BAND_H), fill=(0, 0, 0, int(BAND_ALPHA * band))
        )
        im, pad, base, width = sprite(caption, CAPTION_SIZE)
        start = 0.1 if first else 0.04
        a = ease((t - start) / CAPTION_IN) * min(
            1.0, max(0.0, (length - t) / CAPTION_OUT)
        )
        y = (
            BAND_TOP
            + BAND_H / 2
            + CAPTION_SIZE * 0.33
            - base
            + (1 - ease((t - start) / CAPTION_IN)) * CAPTION_RISE
        )
        paste(canvas, im, ((W - width) / 2 - pad, y), a)
    elif take == "title":
        scrim = ease((t - LAST_AT + 0.1) / 0.4)
        ImageDraw.Draw(canvas).rectangle(SKY, fill=(4, 8, 20, int(150 * scrim)))
        im, pad, base, width = sprite(LAST_LINE, LAST_SIZE, 700)
        a = ease((t - LAST_AT) / 0.4)
        paste(canvas, im, ((W - width) / 2 - pad, LAST_Y - base + (1 - a) * 22), a)
        # The wordmark: "ai", the ball on the baseline where the full stop would be, "doo".
        left, lpad, lbase, lw = sprite("ai", MARK_SIZE, 700, tracking=-0.02)
        right, _, _, rw = sprite("doo", MARK_SIZE, 700, tracking=-0.02)
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


def frame(film, marks, cut, t):
    take, offset, _, _ = CUTS[cut]
    src = marks[take] + round(offset * FPS) + round(t * FPS)
    game = (
        Image.open(film / f"f{src:08d}.png")
        .convert("RGB")
        .resize((W, H), Image.NEAREST)
        .convert("RGBA")
    )
    game.alpha_composite(overlay(cut, t))
    return game.convert("RGB")


def sound(film, marks):
    """The game's own sound for each cut, joined with a few milliseconds of fade so no cut clicks."""
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
    per_frame, parts, fade = RATE // FPS, [], int(RATE * 0.008)
    for i, (take, offset, length, _) in enumerate(CUTS):
        a = (marks[take] + round(offset * FPS)) * per_frame
        part = raw[a : a + round(length * FPS) * per_frame].copy()
        ramp = np.linspace(0.0, 1.0, fade, dtype=np.float32)[:, None]
        if i == 0 or CUTS[i - 1][0] != take:
            part[:fade] *= ramp
        if i == len(CUTS) - 1:
            tail = int(
                RATE * 0.35
            )  # the title music eases out so the loop back to the klaxon is clean
            part[-tail:] *= np.linspace(1.0, 0.0, tail, dtype=np.float32)[:, None]
        elif CUTS[i + 1][0] != take:
            part[-fade:] *= ramp[::-1]
        parts.append(part)
    mix = np.concatenate(parts) * GAIN
    # Louder for a phone feed, with the few peaks that would clip folded over softly instead.
    over = np.abs(mix) > 0.8
    mix[over] = np.sign(mix[over]) * (
        0.8 + (CEILING - 0.8) * np.tanh((np.abs(mix[over]) - 0.8) / (CEILING - 0.8))
    )
    return mix


def strip(film, marks, out):
    frames = [f for f in timeline() if round(f[1] * FPS) % 20 == 0]
    cols, w, h = 9, W // 4, H // 4
    rows = (len(frames) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (w + 8) + 8, rows * (h + 30) + 8), (20, 19, 18))
    d = ImageDraw.Draw(sheet)
    label = font(18, 500)
    for i, (cut, t, at) in enumerate(frames):
        x, y = 8 + (i % cols) * (w + 8), 8 + (i // cols) * (h + 30)
        sheet.paste(
            frame(film, marks, cut, t).resize((w, h), Image.LANCZOS), (x, y + 24)
        )
        d.text((x, y), f"{at:.2f}s", font=label, fill=AMBER)
    sheet.save(out, quality=88)
    print(out, sheet.size)


def render(film, marks, out):
    import av
    from av.video.reformatter import ColorRange, Colorspace

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
    frames = timeline()
    for n, (cut, t, _) in enumerate(frames):
        vf = av.VideoFrame.from_ndarray(
            np.asarray(frame(film, marks, cut, t)), format="rgb24"
        )
        vf = vf.reformat(
            format="yuv420p",
            dst_colorspace=Colorspace.ITU709,
            dst_color_range=ColorRange.MPEG,
        )
        vf.pts = n
        for p in vs.encode(vf):
            box.mux(p)
        if n % 120 == 0:
            print(f"  {n / FPS:.0f}s of {len(frames) / FPS:.1f}s", flush=True)
    for p in vs.encode():
        box.mux(p)
    mix = np.ascontiguousarray(sound(film, marks).T)
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
    (strip if "--strip" in sys.argv else render)(film, marks, out)
