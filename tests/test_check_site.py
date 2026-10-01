"""Tests for scripts/check_site.py, the site integrity gate."""

import os
import sys
from pathlib import Path

sys.path.insert(
    0,
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts"
    ),
)
import check_site  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent

DEPLOY = """\
jobs:
  deploy:
    steps:
      - run: |
          rsync -avz --delete \\
            --exclude='.git' \\
            --exclude='docs/' \\
            --exclude='CLAUDE.md' \\
            ./ host:/var/www/aidoo.biz/
"""


def page(body="", canonical=None, head=""):
    link = f'<link rel="canonical" href="{canonical}">' if canonical else ""
    return f"<!doctype html><html><head>{link}{head}</head><body>{body}</body></html>"


def make_site(tmp_path, files, sitemap_locs=("https://aidoo.biz/",)):
    """A minimal site: a homepage, style.css, the given files and a sitemap."""
    tree = {
        ".github/workflows/deploy.yml": DEPLOY,
        "index.html": page('<a href="style.css">s</a>', canonical="https://aidoo.biz/"),
        "style.css": "",
        **files,
    }
    urls = "".join(f"<url><loc>{loc}</loc></url>" for loc in sitemap_locs)
    tree["sitemap.xml"] = (
        f'<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>'
    )
    for rel, text in tree.items():
        path = tmp_path / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    return tmp_path


def problems(root):
    return check_site.check(root)


class TestLinks:
    def test_clean_site_passes(self, tmp_path):
        assert problems(make_site(tmp_path, {})) == []

    def test_broken_relative_href_fails_naming_page_and_target(self, tmp_path):
        root = make_site(
            tmp_path, {"pika/index.html": page('<a href="../missing/">x</a>')}
        )
        found = problems(root)
        assert len(found) == 1
        assert "pika/index.html" in found[0]
        assert "../missing/" in found[0]

    def test_broken_src_fails(self, tmp_path):
        root = make_site(tmp_path, {"a.html": page('<img src="logo.png">')})
        assert any("logo.png" in p for p in problems(root))

    def test_directory_link_resolves_to_index(self, tmp_path):
        root = make_site(
            tmp_path,
            {
                "a.html": page('<a href="pika/">p</a><a href="/pika/">p</a>'),
                "pika/index.html": page(),
            },
        )
        assert problems(root) == []

    def test_extensionless_link_resolves_to_html(self, tmp_path):
        root = make_site(
            tmp_path,
            {
                "pika/index.html": page('<a href="changelog">c</a>'),
                "pika/changelog.html": page(),
            },
        )
        assert problems(root) == []

    def test_root_relative_resolves_against_root(self, tmp_path):
        root = make_site(
            tmp_path,
            {"pika/index.html": page('<link rel="stylesheet" href="/style.css">')},
        )
        assert problems(root) == []

    def test_query_and_fragment_are_ignored(self, tmp_path):
        root = make_site(
            tmp_path,
            {
                "a.html": page(
                    '<a href="style.css?v=2#top">s</a><a href="./#contact">c</a>'
                )
            },
        )
        assert problems(root) == []

    def test_external_and_special_links_are_skipped(self, tmp_path):
        body = (
            '<a href="https://github.com/x">g</a><a href="//cdn.example.com/x.js">c</a>'
            '<a href="mailto:hello@aidoo.biz">m</a><a href="tel:123">t</a><a href="#top">t</a>'
            '<img src="data:image/png;base64,AAAA"><a href="https://docs.aidoo.biz/missing/">d</a>'
        )
        assert problems(make_site(tmp_path, {"a.html": page(body)})) == []

    def test_absolute_own_domain_link_is_checked(self, tmp_path):
        root = make_site(
            tmp_path, {"a.html": page('<a href="https://aidoo.biz/gone/">x</a>')}
        )
        assert any("https://aidoo.biz/gone/" in p for p in problems(root))

    def test_link_to_unserved_file_fails(self, tmp_path):
        root = make_site(
            tmp_path,
            {"a.html": page('<a href="/docs/guide.md">x</a>'), "docs/guide.md": "# hi"},
        )
        assert any("/docs/guide.md" in p for p in problems(root))

    def test_link_escaping_the_site_root_fails(self, tmp_path):
        root = make_site(tmp_path, {"a.html": page('<a href="../../etc/passwd">x</a>')})
        assert any("../../etc/passwd" in p for p in problems(root))

    def test_unserved_pages_are_not_scanned(self, tmp_path):
        root = make_site(tmp_path, {"docs/x.html": page('<a href="nowhere">x</a>')})
        assert problems(root) == []

    def test_missing_og_image_fails(self, tmp_path):
        head = '<meta property="og:image" content="https://aidoo.biz/og-image.png">'
        root = make_site(tmp_path, {"a.html": page(head=head)})
        assert any("og-image.png" in p for p in problems(root))

    def test_percent_encoded_path_resolves(self, tmp_path):
        root = make_site(
            tmp_path, {"a.html": page('<img src="my%20logo.png">'), "my logo.png": ""}
        )
        assert problems(root) == []


class TestSitemap:
    def test_sitemap_url_without_page_fails(self, tmp_path):
        root = make_site(
            tmp_path, {}, sitemap_locs=("https://aidoo.biz/", "https://aidoo.biz/vera/")
        )
        assert any("https://aidoo.biz/vera/" in p for p in problems(root))

    def test_sitemap_page_without_canonical_fails(self, tmp_path):
        root = make_site(
            tmp_path,
            {"vera/index.html": page()},
            sitemap_locs=("https://aidoo.biz/", "https://aidoo.biz/vera/"),
        )
        assert any("canonical" in p and "vera/index.html" in p for p in problems(root))

    def test_sitemap_page_with_mismatched_canonical_fails(self, tmp_path):
        files = {"vera/index.html": page(canonical="https://aidoo.biz/vera")}
        root = make_site(
            tmp_path,
            files,
            sitemap_locs=("https://aidoo.biz/", "https://aidoo.biz/vera/"),
        )
        assert any("canonical" in p for p in problems(root))

    def test_extensionless_sitemap_url_maps_to_html(self, tmp_path):
        files = {
            "pika/changelog.html": page(canonical="https://aidoo.biz/pika/changelog")
        }
        root = make_site(
            tmp_path,
            files,
            sitemap_locs=("https://aidoo.biz/", "https://aidoo.biz/pika/changelog"),
        )
        assert problems(root) == []

    def test_sitemap_url_on_another_host_fails(self, tmp_path):
        root = make_site(
            tmp_path, {}, sitemap_locs=("https://aidoo.biz/", "https://example.com/")
        )
        assert any("example.com" in p for p in problems(root))


class TestDeployExcludes:
    def test_reads_excludes_from_deploy_workflow(self, tmp_path):
        make_site(tmp_path, {})
        assert check_site.deploy_excludes(tmp_path) == [".git", "docs/", "CLAUDE.md"]

    def test_no_excludes_found_is_an_error(self, tmp_path):
        root = make_site(tmp_path, {".github/workflows/deploy.yml": "jobs: {}\n"})
        assert any("deploy.yml" in p for p in problems(root))


def test_the_real_site_is_clean():
    assert problems(REPO_ROOT) == []
