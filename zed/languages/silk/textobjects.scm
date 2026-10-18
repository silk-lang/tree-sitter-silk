(function_declaration
  body: (block "{" (_)* @function.inside "}")) @function.around

(anonymous_callable_expression
  body: (block "{" (_)* @function.inside "}")) @function.around

(struct_declaration
  body: (struct_field_list "{" (_)* @class.inside "}")) @class.around

(union_declaration) @class.around
(enum_declaration) @class.around
(service_declaration body: (declaration_list "{" (_)* @class.inside "}")) @class.around
(interface_declaration body: (declaration_list "{" (_)* @class.inside "}")) @class.around
(impl_declaration body: (impl_body "{" (_)* @class.inside "}")) @class.around

[(line_comment) (doc_comment) (module_doc_comment)] @comment.inside @comment.around
