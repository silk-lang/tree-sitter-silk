// External scanner for Silk.
//
// Silk has no statement terminator. An index projection `value[index]` cannot cross a line
// break, so a `[` that starts a new line begins the next statement or match arm instead. This
// scanner emits the index-opening bracket only when no line break separates it from the operand.

#include "tree_sitter/parser.h"

enum TokenType {
  INDEX_BRACKET,
  ERASED_ANY,
};

void *tree_sitter_silk_external_scanner_create(void) { return NULL; }

void tree_sitter_silk_external_scanner_destroy(void *payload) { (void)payload; }

unsigned tree_sitter_silk_external_scanner_serialize(void *payload, char *buffer) {
  (void)payload;
  (void)buffer;
  return 0;
}

void tree_sitter_silk_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  (void)payload;
  (void)buffer;
  (void)length;
}

bool tree_sitter_silk_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  (void)payload;
  if (!valid_symbols[INDEX_BRACKET] && !valid_symbols[ERASED_ANY]) return false;
  while (lexer->lookahead == ' ' || lexer->lookahead == '\t' || lexer->lookahead == '\r') {
    lexer->advance(lexer, true);
  }
  if (lexer->lookahead == '[' && valid_symbols[INDEX_BRACKET]) {
    lexer->advance(lexer, false);
    lexer->mark_end(lexer);
    lexer->result_symbol = INDEX_BRACKET;
    return true;
  }

  // `any` remains an identifier unless a type path follows. Look through trivia while
  // leaving the next token and any intervening comments for the ordinary lexer.
  if (!valid_symbols[ERASED_ANY]) return false;
  while (lexer->lookahead == '\n' || lexer->lookahead == ' ' ||
         lexer->lookahead == '\t' || lexer->lookahead == '\r') lexer->advance(lexer, true);
  for (const char *word = "any"; *word; ++word) {
    if (lexer->lookahead != *word) return false;
    lexer->advance(lexer, false);
  }
  lexer->mark_end(lexer);
  bool separated = false;
  for (;;) {
    if (lexer->lookahead == ' ' || lexer->lookahead == '\t' ||
        lexer->lookahead == '\r' || lexer->lookahead == '\n') {
      lexer->advance(lexer, false);
    } else if (lexer->lookahead == '/') {
      lexer->advance(lexer, false);
      if (lexer->lookahead != '/') return false;
      while (lexer->lookahead && lexer->lookahead != '\n') lexer->advance(lexer, false);
    } else break;
    separated = true;
  }
  int32_t c = lexer->lookahead;
  if (!separated || !(c == '_' || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'))) return false;
  lexer->result_symbol = ERASED_ANY;
  return true;
}
