#!/usr/bin/env python3
"""Encode a folder of rendered frames into an MP4, for machines with no ffmpeg.

render.mjs encodes with ffmpeg when it is on the PATH and otherwise leaves the
frames in out/<name>/. This turns those frames into the same MP4 using PyAV,
which carries its own ffmpeg (pip install av).

    python encode.py out/submarine-full-9x16
    python encode.py out/submarine-full-9x16 out/submarine.mp4 --fps 30
"""

import argparse
import pathlib
import sys

import av

FPS = 30


def encode(frames_dir: pathlib.Path, out: pathlib.Path, fps: int) -> None:
    frames = sorted(frames_dir.glob("f*.png"))
    if not frames:
        sys.exit(f"no f*.png frames in {frames_dir}")

    # The renderer screenshots at 2x, so the first frame sets the real size. yuv420p
    # needs even dimensions, which 2x of a 540x960 page already is.
    with av.open(str(frames[0])) as probe:
        first = next(probe.decode(video=0))
        width, height = first.width, first.height
    if width % 2 or height % 2:
        sys.exit(f"frames are {width}x{height}; yuv420p needs even dimensions")

    out.parent.mkdir(parents=True, exist_ok=True)
    with av.open(str(out), mode="w") as container:
        stream = container.add_stream("libx264", rate=fps)
        stream.width, stream.height = width, height
        stream.pix_fmt = "yuv420p"
        # crf 18 and a slow preset, to match what render.mjs asks ffmpeg for
        stream.options = {"crf": "18", "preset": "slow", "movflags": "+faststart"}
        for path in frames:
            with av.open(str(path)) as src:
                frame = next(src.decode(video=0))
            for packet in stream.encode(av.VideoFrame.from_image(frame.to_image())):
                container.mux(packet)
        for packet in stream.encode():
            container.mux(packet)

    secs = len(frames) / fps
    print(f"{out}  ({len(frames)} frames, {secs:.1f}s, {width}x{height})")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("frames", type=pathlib.Path, help="folder of f0000.png frames")
    ap.add_argument(
        "out", type=pathlib.Path, nargs="?", help="MP4 to write (default: <folder>.mp4)"
    )
    ap.add_argument("--fps", type=int, default=FPS)
    a = ap.parse_args()
    encode(a.frames, a.out or a.frames.with_suffix(".mp4"), a.fps)


if __name__ == "__main__":
    main()
