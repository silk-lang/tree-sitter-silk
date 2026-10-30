; Silk highlight queries.
;
; Capture names follow the tree-sitter convention shared by Neovim, Helix and Zed. Later patterns
; take precedence over earlier ones in Neovim and Zed, so general identifier rules come first.

; Identifiers

(identifier) @variable

(type_identifier) @type

(namespace_identifier) @module

(field_identifier) @property

(lifetime) @label

((identifier) @constant
  (#match? @constant "^[A-Z][A-Z0-9_]+$"))

((type_identifier) @type.builtin
  (#match? @type.builtin "^(bool|char|string|u8|u16|u32|u64|u128|usize|i8|i16|i32|i64|i128|isize|f32|f64)$"))

(type_parameter
  name: (type_identifier) @type.parameter)

(row_parameter
  name: (type_identifier) @type.parameter)

; Declarations

(function_declaration
  name: (identifier) @function)

(parameter
  name: (identifier) @variable.parameter)

(constant_declaration
  name: (identifier) @constant)

(package_parameter_declaration
  name: (identifier) @constant)

(foreign_static_declaration
  name: (identifier) @variable)

(export_static_declaration
  name: (identifier) @variable)

(enum_member
  name: (identifier) @constant)

(union_variant
  name: (identifier) @constructor)

(impl_operation
  name: (identifier) @function)

(import_path
  (identifier) @module)

(import_alias
  name: (identifier) @module)

(import_member
  name: (identifier) @type)

(directive
  "@" @attribute
  name: (identifier) @attribute)

(directive_argument
  name: (identifier) @property)

(reference_type
  role: (identifier) @type)

; Calls and members

(call_expression
  function: (identifier) @function.call)

(call_expression
  function: (field_projection_expression
    field: (field_identifier) @function.method.call))

(call_expression
  function: (applied_member_expression
    selector: (applied_member_selector
      member: (identifier) @function.call)))

(applied_member_selector
  member: (identifier) @constructor)

(enum_member_pattern
  type: (type_identifier) @type
  member: (identifier) @constructor)

(binding_pattern
  name: (identifier) @variable)

(pattern_field
  pattern: (identifier) @variable)

; A capitalized receiver such as `Vector` or `TokenKind` names a type or namespace.
(field_projection_expression
  value: (identifier) @type
  (#match? @type "^[A-Z]"))

((field_projection_expression
  field: (field_identifier) @constant)
  (#match? @constant "^[A-Z]"))

; Keywords

[
  "struct"
  "tuple"
  "enum"
  "union"
  "type"
  "service"
  "interface"
  "role"
  "impl"
  "const"
  "param"
  "let"
] @keyword

[
  "fn"
] @keyword.function

[
  "effect"
  "run"
] @keyword.coroutine

[
  "return"
  "fail"
] @keyword.return

[
  "if"
  "else"
  "match"
] @keyword.conditional

[
  "while"
  "for"
  "break"
  "continue"
] @keyword.repeat

[
  "import"
  "as"
] @keyword.import

[
  "pub"
  "static"
  "unsafe"
  "extern"
  "export"
  "mut"
  "once"
  "move"
  "drop"
  "const"
] @keyword.modifier

(visibility) @keyword.modifier

(callable_mode) @keyword.modifier

(test_marker) @keyword.modifier

(match_access) @keyword.modifier

[
  "where"
  "in"
  "provides"
  "from"
  "at"
  "use"
  "some"
  "typeof"
  "align"
  "addrspace"
] @keyword

"Without" @type.builtin

"compileError" @function.builtin

; Operators and punctuation

[
  "+"
  "-"
  "*"
  "/"
  "%"
  "!"
  "~"
  "&"
  "|"
  "^"
  "&&"
  "||"
  "|>"
  "=="
  "!="
  "<="
  ">="
  "="
  "->"
  "=>"
  "?"
  "?*"
  "#"
] @operator

(infix_expression
  operator: [
    "<"
    ">"
  ] @operator)

(rest_pattern) @operator

(variadic_marker) @operator

[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket

(type_arguments
  [
    "<"
    ">"
  ] @punctuation.bracket)

(type_parameter_list
  [
    "<"
    ">"
  ] @punctuation.bracket)

[
  ","
  "."
  ":"
  ";"
] @punctuation.delimiter

; Literals

(integer_literal) @number

(integer_pattern) @number

(floating_literal) @number.float

(duration_literal) @number

(boolean_literal) @boolean

(character_literal) @character

[
  (string_literal)
  (raw_string_literal)
  (byte_string_literal)
] @string

(escape_sequence) @string.escape

(universal_pattern) @variable.builtin

; Comments

(line_comment) @comment

[
  (doc_comment)
  (module_doc_comment)
] @comment.documentation
