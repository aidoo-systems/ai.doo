#!/usr/bin/env python3
"""
Reads CHANGELOG.md from the pika repo and injects rendered HTML into
pika/changelog.html between the CHANGELOG_START / CHANGELOG_END markers.

Idempotent — safe to run repeatedly. Each run replaces the previous content.

Usage:
    python build-changelog.py
    python build-changelog.py --changelog path/to/CHANGELOG.md
"""

import argparse
import html
import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CHANGELOG = os.path.normpath(
    os.path.join(SCRIPT_DIR, "..", "pika", "CHANGELOG.md")
)
TARGET = os.path.join(SCRIPT_DIR, "pika", "changelog.html")
START_MARKER = "<!-- CHANGELOG_START -->"
END_MARKER = "<!-- CHANGELOG_END -->"


def inline(text: str) -> str:
    """Render inline markdown (bold, links, code) to HTML."""
    text = html.escape(text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        r'<a href="\2" target="_blank" rel="noopener">\1</a>',
        text,
    )
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    return text


def render_changelog(md: str) -> str:
    """Convert CHANGELOG.md content to HTML."""
    lines = md.splitlines()
    out = []
    in_list = False

    skip_patterns = [
        "# Changelog",
        "All notable changes",
        "The format is based",
        "and this project adheres",
    ]

    for line in lines:
        if any(line.startswith(p) for p in skip_patterns):
            continue
        if re.match(r"^\[[\d.]+\]:", line) or line.startswith("[Unreleased]:"):
            continue

        if line.strip() == "":
            if in_list:
                out.append("</ul>")
                in_list = False
            continue

        if line.startswith("## "):
            if in_list:
                out.append("</ul>")
                in_list = False
            text = line.removeprefix("## ")
            text = re.sub(r"\[([^\]]+)\]", r"\1", text)
            out.append(f"<h2>{html.escape(text)}</h2>")
            continue

        if line.startswith("### "):
            if in_list:
                out.append("</ul>")
                in_list = False
            out.append(f"<h3>{html.escape(line.removeprefix('### '))}</h3>")
            continue

        stripped = line.strip()
        if stripped.startswith("- "):
            if not in_list:
                out.append("<ul>")
                in_list = True
            out.append(f"<li>{inline(stripped.removeprefix('- '))}</li>")
            continue

    if in_list:
        out.append("</ul>")

    return "\n      ".join(out)


def main():
    parser = argparse.ArgumentParser(description="Build PIKA changelog page")
    parser.add_argument(
        "--changelog",
        default=DEFAULT_CHANGELOG,
        help=f"Path to CHANGELOG.md (default: {DEFAULT_CHANGELOG})",
    )
    args = parser.parse_args()

    changelog_path = args.changelog
    if not os.path.isfile(changelog_path):
        print(f"Error: {changelog_path} not found", file=sys.stderr)
        sys.exit(1)

    if not os.path.isfile(TARGET):
        print(f"Error: {TARGET} not found", file=sys.stderr)
        sys.exit(1)

    with open(changelog_path, encoding="utf-8") as f:
        md = f.read()

    rendered = render_changelog(md)

    with open(TARGET, encoding="utf-8") as f:
        content = f.read()

    if START_MARKER not in content or END_MARKER not in content:
        print(
            f"Error: markers not found in {TARGET}. "
            f"Expected {START_MARKER} and {END_MARKER}",
            file=sys.stderr,
        )
        sys.exit(1)

    # Replace everything between markers (inclusive of markers, re-insert them)
    pattern = re.escape(START_MARKER) + r".*?" + re.escape(END_MARKER)
    replacement = f"{START_MARKER}\n      {rendered}\n      {END_MARKER}"
    output = re.sub(pattern, replacement, content, flags=re.DOTALL)

    with open(TARGET, "w", encoding="utf-8") as f:
        f.write(output)

    print(f"Changelog injected into {TARGET}")


if __name__ == "__main__":
    main()
