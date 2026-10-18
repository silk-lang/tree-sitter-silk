#!/bin/sh
# Parses every Silk source in a silk-lang/silk checkout and fails on any ERROR or MISSING node.
#
# Usage: sh script/parse-silk.sh [path-to-silk-checkout]   (default: ../silk)
#
# The lexer fixtures are token lists rather than programs, and parser/recovery.silk is
# deliberately malformed, so those are skipped.
set -eu

silk=${1:-../silk}
list=$(mktemp)
trap 'rm -f "$list"' EXIT

find "$silk/compiler" "$silk/stdlib" "$silk/examples" -name '*.silk' \
  | grep -v -e '/compiler/fixtures/keywords.silk$' \
            -e '/compiler/fixtures/literals-lifetimes.silk$' \
            -e '/compiler/fixtures/numbers-durations.silk$' \
            -e '/compiler/fixtures/trivia-punctuation.silk$' \
            -e '/compiler/fixtures/unsupported.silk$' \
            -e '/compiler/fixtures/parser/recovery.silk$' \
  | sort > "$list"

echo "Parsing $(wc -l < "$list" | tr -d ' ') files from $silk"
tree-sitter parse --quiet --stat --paths "$list"
