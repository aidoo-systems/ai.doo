"""Tests for building chatbot context from the public site."""

import os
import sys
from pathlib import Path


sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "api"))
from site_context import load_site_context


def test_loads_pages_and_links_from_sitemap(tmp_path):
    (tmp_path / "labs").mkdir()
    (tmp_path / "sitemap.xml").write_text(
        """<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://aidoo.biz/labs/</loc></url>
        </urlset>""",
        encoding="utf-8",
    )
    (tmp_path / "labs" / "index.html").write_text(
        """<html><head><style>hidden style</style></head><body>
        <nav>hidden navigation</nav>
        <main>
          <h1>ai.doo Labs</h1>
          <p>Things we build for the fun of it.</p>
          <a href="https://play.google.com/store/apps/details?id=com.aidoo.thunee">Google Play</a>
          <script>hidden script</script>
        </main>
        </body></html>""",
        encoding="utf-8",
    )

    context = load_site_context(tmp_path)

    assert "PAGE: https://aidoo.biz/labs/" in context
    assert "ai.doo Labs" in context
    assert "Things we build for the fun of it." in context
    assert "https://play.google.com/store/apps/details?id=com.aidoo.thunee" in context
    assert "hidden style" not in context
    assert "hidden script" not in context
    assert "hidden navigation" not in context


def test_missing_sitemap_returns_empty_context(tmp_path):
    assert load_site_context(tmp_path) == ""


def test_includes_canonical_noindex_pages_not_listed_in_sitemap(tmp_path):
    (tmp_path / "privacy-thunee").mkdir()
    (tmp_path / "sitemap.xml").write_text(
        """<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" />""",
        encoding="utf-8",
    )
    (tmp_path / "privacy-thunee" / "index.html").write_text(
        """<html><head>
        <link rel="canonical" href="https://aidoo.biz/privacy-thunee/">
        <meta name="robots" content="noindex">
        </head><body><div><h1>Thunee Privacy Policy</h1></div></body></html>""",
        encoding="utf-8",
    )

    context = load_site_context(tmp_path)

    assert "PAGE: https://aidoo.biz/privacy-thunee/" in context
    assert "Thunee Privacy Policy" in context


def test_public_site_context_includes_labs_products_and_download_link():
    site_root = Path(__file__).resolve().parents[1]

    context = load_site_context(site_root)

    for product in (
        "Reactor Panic",
        "Submarine Panic",
        "Orbital Panic",
        "Thunee",
        "Pomodorable",
        "Reality Check",
        "SPICE",
    ):
        assert product in context
    assert "https://play.google.com/store/apps/details?id=com.aidoo.thunee" in context
