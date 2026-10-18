# tree-sitter-silk

A [tree-sitter](https://tree-sitter.github.io/) grammar for [Silk](https://github.com/silk-lang/silk).
Editors built on tree-sitter (Neovim, Helix, Zed, Emacs) use it for highlighting, folding,
indentation, symbol outlines and structural selection.

The grammar follows the native parser in
[`compiler/src/parser`](https://github.com/silk-lang/silk/tree/main/compiler/src/parser) and the
lexer in [`compiler/src/lexer`](https://github.com/silk-lang/silk/tree/main/compiler/src/lexer).
Node names mirror the parser's `NodeKind` names in snake case, so `StructLiteralExpression`
becomes `struct_literal_expression`. CI parses every `.silk` file in `compiler/`, `stdlib/` and
`examples/` of silk-lang/silk and fails on any error node.

## Develop

```sh
bun install
bun run generate          # grammar.js -> src/parser.c
bun run test              # test/corpus trees
bun run parse-silk ../silk  # parse a silk-lang/silk checkout
```

`src/parser.c` is generated but committed, because editors build the grammar straight from this
repository. Regenerate it after every change to `grammar.js`; CI checks that it is up to date.
Generation takes a minute or two.

## Layout

| Path                     | Contents                                                     |
| ------------------------ | ------------------------------------------------------------ |
| `grammar.js`             | The grammar                                                  |
| `src/scanner.c`          | Keeps an index `[` on its operand's line                     |
| `queries/highlights.scm` | Highlight captures (standard names shared by most editors)   |
| `queries/locals.scm`     | Scopes, definitions and references                           |
| `queries/tags.scm`       | Symbol outline and code navigation                           |
| `queries/folds.scm`      | Fold regions                                                 |
| `queries/indents.scm`    | Indentation                                                  |
| `test/corpus/`           | Expected parse trees                                         |
| `bindings/`              | Generated C, Go, Node, Python, Rust and Swift bindings       |

## Notes on the grammar

- Silk has no statement terminator. A statement ends where the next one begins, as in the native
  parser, so `a\n(b)` is a call and `a\n-1` is a subtraction. Indexing is the exception: `[`
  cannot start an index on a new line.
- `f<T>(x)`, `Option<T>.Some` and `Box<T> {..}` are resolved against comparisons with GLR
  conflicts, the way the native parser's angle-bracket lookahead does.
- Contextual words (`where`, `in`, `provides`, `from`, `at`, `use`, `some`, `with`, `module`,
  `test`, `place`, `typeof`, `Without`, `align`, `addrspace`) are keywords only where the grammar
  expects them, and identifiers everywhere else.

## Editors

Point your editor's tree-sitter configuration at this repository and copy or link `queries/`.

Neovim with nvim-treesitter:

```lua
vim.filetype.add({ extension = { silk = "silk" } })
require("nvim-treesitter.parsers").get_parser_configs().silk = {
  install_info = {
    url = "https://github.com/silk-lang/tree-sitter-silk",
    files = { "src/parser.c", "src/scanner.c" },
    branch = "main",
  },
  filetype = "silk",
}
```

Then run `:TSInstall silk` and copy `queries/*.scm` to `queries/silk/` on your runtime path.

Helix (`languages.toml`):

```toml
[[language]]
name = "silk"
scope = "source.silk"
file-types = ["silk"]
comment-token = "//"
indent = { tab-width = 2, unit = "  " }

[[grammar]]
name = "silk"
source = { git = "https://github.com/silk-lang/tree-sitter-silk", rev = "<commit sha>" }
```

Then run `hx --grammar fetch && hx --grammar build` and copy `queries/` to
`runtime/queries/silk/`.
