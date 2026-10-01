"""Deploy must build the docs with exactly the versions CI proves (P1.4)."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS_REQS = ROOT / "scripts" / "docs-requirements.txt"
WORKFLOWS = ROOT / ".github" / "workflows"


def test_docs_requirements_pin_exact_versions():
    lines = [ln.strip() for ln in DOCS_REQS.read_text(encoding="utf-8").splitlines()]
    pins = {ln.split("==")[0]: ln for ln in lines if ln and not ln.startswith("#")}
    assert set(pins) == {"mkdocs", "mkdocs-material"}
    assert all(re.fullmatch(r"[a-z-]+==\d+(\.\d+)+", pin) for pin in pins.values()), (
        pins
    )


def test_ci_and_deploy_install_docs_from_the_pinned_file():
    for name in ("ci.yml", "deploy.yml"):
        text = (WORKFLOWS / name).read_text(encoding="utf-8")
        assert "-r scripts/docs-requirements.txt" in text, name
        # No second, unpinned install that could pull a different version.
        assert not re.search(
            r"install[^\n]*\bmkdocs(-material)?\b(?![-\w]*\.txt)", text
        ), name
