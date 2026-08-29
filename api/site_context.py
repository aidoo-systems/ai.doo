"""Build chatbot context from the public ai.doo website."""

import os
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse
from xml.etree import ElementTree


MAX_PAGE_CHARS = 15_000
MAX_CONTEXT_CHARS = 60_000

_BLOCK_TAGS = {
    "address",
    "article",
    "aside",
    "blockquote",
    "div",
    "footer",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "header",
    "li",
    "main",
    "nav",
    "ol",
    "p",
    "section",
    "table",
    "td",
    "th",
    "tr",
    "ul",
}
_SKIP_TAGS = {"noscript", "script", "style", "svg", "template"}
_NON_PUBLIC_DIRECTORIES = {
    ".git",
    ".github",
    ".claude",
    "_docs_build",
    "api",
    "docs",
    "internal",
    "overrides",
    "tests",
}


class _CanonicalParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.url = None

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "link":
            return
        attributes = dict(attrs)
        rel = attributes.get("rel", "").lower().split()
        if "canonical" in rel and attributes.get("href"):
            self.url = attributes["href"].strip()


class _MainContentParser(HTMLParser):
    """Extract main content, falling back to the body for simpler pages."""

    def __init__(self, page_url):
        super().__init__(convert_charrefs=True)
        self.page_url = page_url
        self.body_depth = 0
        self.main_depth = 0
        self.skip_depth = 0
        self.current_href = None
        self.body_chunks = []
        self.main_chunks = []

    def _append(self, value):
        if self.body_depth:
            self.body_chunks.append(value)
        if self.main_depth:
            self.main_chunks.append(value)

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag == "body":
            self.body_depth += 1
            self.body_chunks.append("\n")
            return
        if tag == "main":
            self.main_depth += 1
            self._append("\n")
            return
        if not self.body_depth:
            return
        if tag in _SKIP_TAGS:
            self.skip_depth += 1
            return
        if self.skip_depth:
            return
        if tag in _BLOCK_TAGS or tag == "br":
            self._append("\n")
        if tag == "a":
            self.current_href = dict(attrs).get("href")

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in _SKIP_TAGS and self.skip_depth:
            self.skip_depth -= 1
            return
        if tag == "main":
            self._append("\n")
            self.main_depth = max(0, self.main_depth - 1)
            return
        if tag == "body":
            self.body_chunks.append("\n")
            self.body_depth = max(0, self.body_depth - 1)
            return
        if not self.body_depth or self.skip_depth:
            return
        if tag == "a" and self.current_href:
            href = self.current_href.strip()
            if href and not href.startswith(("#", "javascript:")):
                self._append(f" ({urljoin(self.page_url, href)})")
            self.current_href = None
        if tag in _BLOCK_TAGS:
            self._append("\n")

    def handle_data(self, data):
        if self.body_depth and not self.skip_depth:
            self._append(data)

    def text(self):
        chunks = self.main_chunks or self.body_chunks
        lines = []
        for raw_line in "".join(chunks).splitlines():
            line = re.sub(r"\s+", " ", raw_line).strip()
            if line and (not lines or line != lines[-1]):
                lines.append(line)
        return "\n".join(lines)


def _find_site_root():
    configured_root = os.environ.get("AIDOO_SITE_ROOT")
    candidates = []
    if configured_root:
        candidates.append(Path(configured_root))
    candidates.extend(
        [
            Path(__file__).resolve().parent.parent,
            Path("/var/www/aidoo.biz"),
        ]
    )
    for candidate in candidates:
        if (candidate / "sitemap.xml").is_file():
            return candidate
    return None


def _page_file(site_root, page_url):
    relative_url = unquote(urlparse(page_url).path).lstrip("/")
    relative_path = Path(relative_url)
    if ".." in relative_path.parts:
        return None

    if not relative_url or relative_url.endswith("/"):
        candidate = site_root / relative_path / "index.html"
    else:
        candidate = site_root / relative_path
        if not candidate.suffix:
            candidate = candidate.with_suffix(".html")
    return candidate if candidate.is_file() else None


def _canonical_url(html):
    parser = _CanonicalParser()
    parser.feed(html)
    if not parser.url:
        return None
    url = urljoin("https://aidoo.biz/", parser.url)
    return url if urlparse(url).netloc in ("aidoo.biz", "www.aidoo.biz") else None


def _public_pages(site_root, sitemap):
    pages = []
    seen_urls = set()

    for loc in sitemap.findall(".//{*}loc"):
        page_url = (loc.text or "").strip()
        page_file = _page_file(site_root, page_url)
        if page_url and page_file and page_url not in seen_urls:
            pages.append((page_url, page_file))
            seen_urls.add(page_url)

    # Privacy and support pages deliberately use noindex, so they are not in the
    # sitemap. Their canonical URLs still identify them as public site content.
    for page_file in site_root.rglob("*.html"):
        relative_parts = page_file.relative_to(site_root).parts
        if relative_parts and relative_parts[0] in _NON_PUBLIC_DIRECTORIES:
            continue
        try:
            html = page_file.read_text(encoding="utf-8")
        except OSError:
            continue
        page_url = _canonical_url(html)
        if page_url and page_url not in seen_urls:
            pages.append((page_url, page_file))
            seen_urls.add(page_url)

    return pages


def load_site_context(site_root=None):
    """Return visible content from every local page in the public sitemap."""

    root = Path(site_root) if site_root else _find_site_root()
    if not root:
        return ""

    try:
        sitemap = ElementTree.parse(root / "sitemap.xml")
    except (ElementTree.ParseError, OSError):
        return ""

    pages = []
    for page_url, page_file in _public_pages(root, sitemap):
        try:
            html = page_file.read_text(encoding="utf-8")
        except OSError:
            continue

        parser = _MainContentParser(page_url)
        parser.feed(html)
        page_text = parser.text()[:MAX_PAGE_CHARS]
        if page_text:
            pages.append(f"PAGE: {page_url}\n{page_text}")

    return "\n\n".join(pages)[:MAX_CONTEXT_CHARS]
