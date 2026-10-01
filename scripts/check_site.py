"""Site integrity check for aidoo.biz: the `site` gate in scripts/gates.sh.

Every local href/src (and og:image) in every served HTML page must resolve to a
served file, and every sitemap URL must map to a page whose canonical matches it.

"Served" means what the deploy rsync publishes: the repo minus the --exclude
patterns in .github/workflows/deploy.yml, read from there so the two can't drift.
A link to a file deploy excludes is broken in production, so it fails here too.
File names are matched exactly, so a case mismatch that Windows forgives fails.

    python scripts/check_site.py [root]
"""

import fnmatch
import os
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

SITE = "https://aidoo.biz"
OWN_HOSTS = {"aidoo.biz", "www.aidoo.biz"}
# Meta tags whose content is an asset URL a share card will fetch.
META_ASSETS = {"og:image", "twitter:image"}
SITEMAP_NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
DEPLOY = Path(".github/workflows/deploy.yml")


def deploy_excludes(root):
    text = (Path(root) / DEPLOY).read_text(encoding="utf-8")
    return re.findall(r"--exclude='([^']+)'", text)


def _excluded(parts, patterns):
    """rsync semantics for the patterns deploy uses: a pattern with no leading '/'
    matches at any depth; a trailing '/' matches directories only."""
    for pattern in patterns:
        anchored = pattern.startswith("/")
        dir_only = pattern.endswith("/")
        pat = pattern.strip("/").split("/")
        starts = [0] if anchored else range(len(parts))
        for start in starts:
            end = start + len(pat)
            if end > len(parts) or (dir_only and end == len(parts)):
                continue
            if all(fnmatch.fnmatchcase(p, q) for p, q in zip(parts[start:end], pat)):
                return True
    return False


def served_files(root, patterns):
    """Every file deploy publishes, as a set of '/'-separated paths from the root."""
    served = set()
    for dirpath, dirnames, filenames in os.walk(root):
        rel = Path(dirpath).relative_to(root).parts
        dirnames[:] = [d for d in dirnames if not _excluded((*rel, d, ""), patterns)]
        for name in filenames:
            if not _excluded((*rel, name), patterns):
                served.add("/".join((*rel, name)))
    return served


class _Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.refs = []  # (attribute, value)
        self.canonical = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for name in ("href", "src"):
            if a.get(name):
                self.refs.append((name, a[name].strip()))
        if tag == "link" and "canonical" in (a.get("rel") or "").lower().split():
            self.canonical = (a.get("href") or "").strip()
        if (
            tag == "meta"
            and (a.get("property") or a.get("name")) in META_ASSETS
            and a.get("content")
        ):
            self.refs.append(("content", a["content"].strip()))


def _parse(root, rel):
    page = _Page()
    page.feed((Path(root) / rel).read_text(encoding="utf-8"))
    return page


def _local_path(value):
    """The site path a reference points at, or None when it isn't this site's."""
    if not value or value.startswith("#"):
        return None
    url = urlsplit(value)
    if url.scheme or url.netloc:
        if url.scheme in ("http", "https", "") and url.netloc in OWN_HOSTS:
            return url.path or "/"
        return None
    return url.path or None


def _resolve(page_rel, path, served):
    """The served file a site path lands on, or None. Mirrors the web server:
    '/x/' is x/index.html, and an extensionless '/x' may be x.html."""
    path = unquote(path)
    base = [] if path.startswith("/") else page_rel.split("/")[:-1]
    parts = list(base)
    for part in path.split("/"):
        if part in ("", "."):
            continue
        if part == "..":
            if not parts:
                return None  # climbs above the site root
            parts.pop()
        else:
            parts.append(part)
    target = "/".join(parts)
    if path.endswith("/") or not parts:
        candidates = [f"{target}/index.html".lstrip("/")]
    else:
        candidates = [target, f"{target}.html", f"{target}/index.html"]
    return next((c for c in candidates if c in served), None)


def check(root):
    root = Path(root)
    try:
        patterns = deploy_excludes(root)
    except OSError as exc:
        return [f"{DEPLOY}: cannot read ({exc})"]
    if not patterns:
        return [
            f"{DEPLOY}: no rsync --exclude patterns found; the check can't tell what is served"
        ]
    served = served_files(root, patterns)
    pages = sorted(f for f in served if f.endswith(".html"))
    problems = []

    for rel in pages:
        for attr, value in _parse(root, rel).refs:
            path = _local_path(value)
            if path is not None and _resolve(rel, path, served) is None:
                problems.append(f"{rel}: {attr} '{value}' -> no served file")

    sitemap = root / "sitemap.xml"
    if not sitemap.is_file():
        return problems + ["sitemap.xml: missing"]
    for loc in ET.parse(sitemap).getroot().iter(f"{SITEMAP_NS}loc"):
        url = (loc.text or "").strip()
        parsed = urlsplit(url)
        if f"{parsed.scheme}://{parsed.netloc}" != SITE:
            problems.append(f"sitemap.xml: '{url}' is not on {SITE}")
            continue
        target = _resolve("", parsed.path or "/", served)
        if target is None or not target.endswith(".html"):
            problems.append(f"sitemap.xml: '{url}' -> no served page")
            continue
        canonical = _parse(root, target).canonical
        if canonical != url:
            problems.append(
                f"sitemap.xml: '{url}' -> {target} has canonical {canonical!r}, expected the sitemap URL"
            )
    return problems


def main(argv):
    root = Path(argv[1]) if len(argv) > 1 else Path(__file__).resolve().parent.parent
    problems = check(root)
    for problem in problems:
        print(problem)
    if problems:
        print(f"{len(problems)} site problem(s)")
        return 1
    print(
        "site: every local link resolves; every sitemap URL has a matching canonical page"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
