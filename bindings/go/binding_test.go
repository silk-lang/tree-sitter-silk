package tree_sitter_silk_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_silk "github.com/silk-lang/tree-sitter-silk/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_silk.Language())
	if language == nil {
		t.Errorf("Error loading Silk grammar")
	}
}
