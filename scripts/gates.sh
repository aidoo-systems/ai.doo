#!/usr/bin/env bash
# studio - quality gates for the ai.doo site (static HTML + Flask chat API + MkDocs).
# No studio profile fits this stack; this runner honours the gate contract in
# studio/profiles/README.md. The docs gate is the shared one, copied verbatim.
# Runs cheapest-first. Exit 0 only when every selected gate passes.
#
#   scripts/gates.sh            # all gates
#   scripts/gates.sh tests      # one gate
#   SKIP_SLOW=1 scripts/gates.sh

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

ONLY="${1:-}"
# The Python in this repo: the chat API, the changelog builder, their tests.
PY_PATHS=(api build-changelog.py tests)

FAILED=()
run_gate() {
  local name="$1"; shift
  [ -n "$ONLY" ] && [ "$ONLY" != "$name" ] && return 0
  local start; start=$(date +%s)
  local out; out=$("$@" 2>&1); local code=$?
  local secs=$(( $(date +%s) - start ))
  if [ $code -eq 0 ]; then
    printf '  [PASS] %-10s (%ss)\n' "$name" "$secs"
  else
    printf '  [FAIL] %-10s (%ss)\n' "$name" "$secs"
    echo "$out" | tail -40 | sed 's/^/      /'
    FAILED+=("$name")
  fi
}

echo
echo "ai.doo gates - ai.doo site"
echo

run_gate lint    python -m ruff check "${PY_PATHS[@]}"
run_gate format  python -m ruff format --check "${PY_PATHS[@]}"
run_gate tests   python -m pytest tests -q --tb=short -p no:cacheprovider

# The docs site must build exactly as deploy builds it, with --strict so a
# broken nav entry or internal link fails here rather than on docs.aidoo.biz.
# It builds into a throwaway directory: _docs_build/ is deploy's, not ours.
# build-changelog.py is not run here: it rewrites pika/changelog.html in place
# and needs PIKA's CHANGELOG.md; its renderer is covered by the tests gate.
check_build() {
  local out; out="$(mktemp -d)"
  python -m mkdocs build --strict -q -f mkdocs.yml -d "$out"
  local code=$?
  rm -rf "$out"
  return $code
}
run_gate build check_build

# Slow tier. There is no pyproject.toml: the chat API's requirements.txt is
# the only dependency manifest that ships to production.
if [ "${SKIP_SLOW:-0}" != "1" ]; then
  command -v pip-audit >/dev/null 2>&1 \
    && run_gate audit pip-audit --strict --progress-spinner off -r api/requirements.txt \
    || echo "  [SKIP] audit      (pip-audit not installed)"
fi

# Docs gate: a roadmap row marked Complete must carry acceptance evidence.
check_docs() {
  local problems=0
  for doc in README.md docs/CURRENT_SPRINT.md docs/ROADMAP.md; do
    [ -f "$doc" ] || continue
    local dir; dir="$(dirname "$doc")"
    while IFS= read -r target; do
      [ -z "$target" ] && continue
      local resolved="$target"
      [ "$dir" != "." ] && resolved="$dir/$target"
      if [ ! -f "$resolved" ]; then
        echo "$doc -> missing link target '$target'"; problems=$((problems + 1))
      fi
    done < <(grep -oE '\]\([^)#:]+\.md' "$doc" 2>/dev/null | sed 's/^](//')
  done
  # The sprint file is the resume point; if source has moved on without it,
  # the next session inherits a false account of where the work stands.
  if [ -f docs/CURRENT_SPRINT.md ] && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    local claimed last_src
    claimed=$(head -20 docs/CURRENT_SPRINT.md | grep -oE '^Last updated:[[:space:]]*[0-9]{4}-[0-9]{2}-[0-9]{2}' | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
    # Source commits only - a docs-only commit touching this very line must not
    # make the file look stale against itself.
    last_src=$(git log -1 --format=%ad --date=short -- . ':(exclude)docs' ':(exclude)*.md' 2>/dev/null)
    if [ -n "$claimed" ] && [ -n "$last_src" ] && [[ "$last_src" > "$claimed" ]]; then
      echo "CURRENT_SPRINT.md claims $claimed but source changed $last_src - the resume point is stale"
      problems=$((problems + 1))
    fi
  fi

  # 'Complete' is a claim about evidence, not about code having been written.
  # The evidence column is located from each table's header, not a fixed index:
  # roadmaps carry either 4 columns or 5 (with 'Gate'), and a hardcoded index
  # silently reads the wrong column instead of failing. The whole file is walked
  # rather than grepping Complete rows, because the header must be seen first.
  if [ -f docs/ROADMAP.md ]; then
    while IFS= read -r problem; do
      echo "$problem"
      problems=$((problems + 1))
    done < <(awk -F'|' '
      /^[[:space:]]*\|/ {
        for (i = 1; i <= NF; i++) gsub(/^[[:space:]]+|[[:space:]]+$/, "", $i)
        hdr = 0
        for (i = 1; i <= NF; i++) {
          if (tolower($i) ~ /^acceptance/ || tolower($i) == "evidence") { ev = i; hdr = 1 }
          if (tolower($i) == "id") idc = i
        }
        if (hdr) next
        done_row = 0
        for (i = 1; i <= NF; i++) if ($i == "Complete") done_row = 1
        if (!done_row) next
        if (ev == 0) {
          print "ROADMAP: a Complete row appears before any header naming an acceptance column"
          next
        }
        if (NF < ev || $ev == "") {
          id = (idc > 0 && NF >= idc) ? $idc : "?"
          printf "ROADMAP: %c%s%c is Complete with no acceptance evidence\n", 39, id, 39
        }
      }
    ' docs/ROADMAP.md 2>/dev/null)
  fi
  [ "$problems" -eq 0 ]
}
run_gate docs check_docs

echo
echo "----------------------------------------------------------"
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "GATES FAILED: ${FAILED[*]}"
  echo
  exit 1
fi
echo "All gates passed."
echo
exit 0
