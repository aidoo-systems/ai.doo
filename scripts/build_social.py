"""Redraw the profile banners in images/brand/ from internal/social/index.html.

Serves the repo root on a local port, takes one headless Edge screenshot per banner at its
exact size, and writes PNGs. Run it by hand when the wordmark or the line changes; no gate
runs it.
"""

from __future__ import annotations

import functools
import http.server
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "images" / "brand"

BANNERS = {
    "youtube": (2560, 1440),
    "linkedin-company": (1128, 191),
    "linkedin-personal": (1584, 396),
    "header": (1500, 500),
}

EDGE_PATHS = (
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
)


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args) -> None:
        pass


def _edge() -> str:
    for candidate in EDGE_PATHS:
        if Path(candidate).exists():
            return candidate
    found = (
        shutil.which("msedge")
        or shutil.which("microsoft-edge")
        or shutil.which("chromium")
    )
    if not found:
        sys.exit("No Edge or Chromium found to draw the banners with.")
    return found


def main() -> None:
    handler = functools.partial(_Quiet, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    port = server.server_address[1]
    edge = _edge()
    # Its own profile folder: without one, a headless Edge hands the job to any Edge already
    # open and exits without writing the file.
    profile = tempfile.mkdtemp(prefix="aidoo-social-")
    try:
        for kind, (width, height) in BANNERS.items():
            target = OUT / f"ai-doo-banner-{kind}.png"
            target.unlink(missing_ok=True)
            subprocess.run(
                [
                    edge,
                    "--headless=new",
                    "--hide-scrollbars",
                    "--disable-gpu",
                    f"--user-data-dir={profile}",
                    "--force-device-scale-factor=1",
                    f"--window-size={width},{height}",
                    "--virtual-time-budget=3000",
                    f"--screenshot={target}",
                    f"http://127.0.0.1:{port}/internal/social/?kind={kind}",
                ],
                check=True,
                capture_output=True,
                timeout=60,
            )
            # Edge returns before the file is written.
            deadline = time.monotonic() + 30
            while not target.exists() or target.stat().st_size == 0:
                if time.monotonic() > deadline:
                    sys.exit(f"Edge wrote nothing for {kind}.")
                time.sleep(0.25)
            print(f"{target.relative_to(ROOT)}  {width}x{height}")
    finally:
        time.sleep(1)
        server.shutdown()
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == "__main__":
    main()
