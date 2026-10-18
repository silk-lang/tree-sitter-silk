; Scopes

[
  (source_file)
  (function_declaration)
  (anonymous_callable_expression)
  (block)
  (match_arm)
  (impl_declaration)
  (static_for_statement)
] @local.scope

; Definitions

(parameter
  name: (identifier) @local.definition)

(binding_statement
  name: (identifier) @local.definition)

(binding_pattern
  name: (identifier) @local.definition)

(pattern_field
  pattern: (identifier) @local.definition)

(static_for_statement
  name: (identifier) @local.definition)

(function_declaration
  name: (identifier) @local.definition)

(constant_declaration
  name: (identifier) @local.definition)

(type_parameter
  name: (type_identifier) @local.definition)

(import_member
  name: (identifier) @local.definition)

(import_alias
  name: (identifier) @local.definition)

; References

(identifier) @local.reference

(type_identifier) @local.reference
