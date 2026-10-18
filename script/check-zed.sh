#!/bin/sh
# Checks the Zed extension in zed/: its highlights are generated from queries/, every query
# compiles against this grammar, and the grammar rev it pins exists in this repository.
set -eu

node script/zed-queries.js --check

sample=$(mktemp)
trap 'rm -f "$sample"' EXIT
cat test/corpus/*.txt > "$sample"
for query in zed/languages/silk/*.scm; do
  tree-sitter query "$query" "$sample" > /dev/null
  echo "$query compiles"
done

rev=$(sed -n 's/^rev = "\(.*\)"$/\1/p' zed/extension.toml)
git cat-file -e "$rev^{commit}"
echo "zed/extension.toml pins grammar rev $rev"
