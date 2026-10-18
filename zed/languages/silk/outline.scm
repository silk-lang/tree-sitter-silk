(function_declaration
  (visibility)? @context
  "fn" @context
  name: (identifier) @name) @item

(struct_declaration
  "struct" @context
  name: (type_identifier) @name) @item

(tuple_declaration
  "tuple" @context
  name: (type_identifier) @name) @item

(enum_declaration
  "enum" @context
  name: (type_identifier) @name) @item

(enum_member
  name: (identifier) @name) @item

(union_declaration
  "union" @context
  name: (type_identifier) @name) @item

(union_variant
  name: (identifier) @name) @item

(struct_field
  name: (field_identifier) @name) @item

(type_alias_declaration
  "type" @context
  name: (type_identifier) @name) @item

(service_declaration
  "service" @context
  name: (type_identifier) @name) @item

(interface_declaration
  "interface" @context
  name: (type_identifier) @name) @item

(role_declaration
  "role" @context
  name: (type_identifier) @name) @item

(impl_declaration
  "impl" @context
  trait: (_) @name
  ("for" @context
    type: (_) @name)?) @item

(constant_declaration
  "const" @context
  name: (identifier) @name) @item

(package_parameter_declaration
  "param" @context
  name: (identifier) @name) @item
