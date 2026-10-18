(function_declaration
  name: (identifier) @name) @definition.function

(struct_declaration
  name: (type_identifier) @name) @definition.class

(tuple_declaration
  name: (type_identifier) @name) @definition.class

(enum_declaration
  name: (type_identifier) @name) @definition.class

(union_declaration
  name: (type_identifier) @name) @definition.class

(type_alias_declaration
  name: (type_identifier) @name) @definition.type

(service_declaration
  name: (type_identifier) @name) @definition.interface

(interface_declaration
  name: (type_identifier) @name) @definition.interface

(role_declaration
  name: (type_identifier) @name) @definition.interface

(constant_declaration
  name: (identifier) @name) @definition.constant

(call_expression
  function: [
    (identifier) @name
    (field_projection_expression
      field: (field_identifier) @name)
  ]) @reference.call
