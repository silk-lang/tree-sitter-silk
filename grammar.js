/**
 * @file Tree-sitter grammar for the Silk programming language.
 * @license MIT
 *
 * The grammar follows the native parser in silk-lang/silk (`compiler/src/parser`) and the lexer
 * in `compiler/src/lexer`. Node names mirror the parser's `NodeKind` names in snake case where a
 * node exists in both. Silk has no statement terminator: statements and declarations end where
 * the next one begins, as they do in the native parser.
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// Infix precedence from `Grammar.precedence` in the native parser. Pipeline is weakest.
const PREC = {
  run: 0,
  pipeline: 1,
  or: 2,
  and: 3,
  equality: 4,
  comparison: 5,
  bit_or: 6,
  bit_xor: 7,
  bit_and: 8,
  additive: 9,
  multiplicative: 10,
  prefix: 11,
  postfix: 12,
};

const DURATION_UNIT = '(w|d|h|m|s|ms|us|ns)';
const DIGITS = '[0-9][0-9_]*';

/**
 * @param {RuleOrLiteral} rule
 * @param {RuleOrLiteral} separator
 */
function sepBy1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}

/**
 * A comma-separated list that admits a trailing comma.
 * @param {RuleOrLiteral} rule
 */
function commaSep(rule) {
  return optional(seq(sepBy1(rule, ','), optional(',')));
}

/** @param {RuleOrLiteral} rule */
function commaSep1(rule) {
  return seq(sepBy1(rule, ','), optional(','));
}

module.exports = grammar({
  name: 'silk',

  word: $ => $.identifier,

  // An index projection's `[` must share a line with its operand (see src/scanner.c).
  externals: $ => [$._index_bracket],

  extras: $ => [/\s/, $.line_comment, $.doc_comment, $.module_doc_comment],

  supertypes: $ => [$._declaration, $._statement, $._expression, $._type, $._pattern],

  conflicts: $ => [
    // `a < b` against a generic suffix `f<T>(x)`, `Option<T>.Some`, or `Box<T> {..}`.
    [$._expression, $.type_path],
    // Inside `a < ...`, the right side may also be the start of a generic suffix's type.
    [$.unit_type, $.unit_expression],
    [$.callable_type, $.parameter_list],
    // After an operand, `<` is either a comparison or a generic call suffix `f<T>(x)`.
    [$.call_expression, $.infix_expression, $.unsafe_expression],
    [$.call_expression, $.infix_expression, $.move_expression],
    [$.call_expression, $.infix_expression, $.borrow_expression],
    [$.call_expression, $.infix_expression, $.prefix_expression],
    [$.call_expression, $.infix_expression],
  ],

  rules: {
    source_file: $ => repeat($._declaration),

    // ---------------------------------------------------------------------------------------
    // Trivia

    module_doc_comment: _ => token(seq('//!', /.*/)),
    doc_comment: _ => token(seq('///', optional(seq(/[^/\n]/, /.*/)))),
    line_comment: _ => token(choice(seq('//', /[^/!\n]/, /.*/), '//', seq('////', /.*/))),

    // ---------------------------------------------------------------------------------------
    // Declarations

    _declaration: $ => choice(
      $.import_declaration,
      $.constant_declaration,
      $.package_parameter_declaration,
      $.struct_declaration,
      $.tuple_declaration,
      $.enum_declaration,
      $.union_declaration,
      $.type_alias_declaration,
      $.service_declaration,
      $.interface_declaration,
      $.role_declaration,
      $.impl_declaration,
      $.function_declaration,
      $.foreign_static_declaration,
      $.export_static_declaration,
      $.static_conditional_declaration,
      $.module_property_declaration,
    ),

    visibility: _ => 'pub',

    import_declaration: $ => seq(
      optional($.visibility),
      'import',
      field('path', $.import_path),
      optional(field('alias', $.import_alias)),
      optional(field('members', $.import_member_list)),
    ),

    // Module path segments are contextual, so keyword spellings are admitted as segments.
    import_path: $ => sepBy1(choice($.identifier, alias($._import_keyword_segment, $.identifier)), '.'),

    _import_keyword_segment: _ => choice(
      'pub', 'struct', 'enum', 'union', 'type', 'service', 'interface', 'role', 'effect', 'fn',
      'run', 'fail', 'drop', 'unsafe', 'impl', 'for', 'return', 'import', 'as', 'let', 'const',
      'mut', 'once', 'move', 'match', 'if', 'else', 'while', 'break', 'continue', 'true', 'false',
    ),

    import_alias: $ => seq('as', field('name', $.identifier)),

    import_member_list: $ => seq('{', commaSep($.import_member), '}'),

    import_member: $ => seq(field('name', $.identifier), optional(field('alias', $.import_alias))),

    constant_declaration: $ => seq(
      optional($.visibility),
      'const',
      field('name', $.identifier),
      ':',
      field('type', $._type),
      '=',
      field('value', $._expression),
    ),

    package_parameter_declaration: $ => prec.right(seq(
      optional($.visibility),
      'param',
      field('name', $.identifier),
      ':',
      field('type', $._type),
      optional(seq('=', field('default', $._expression))),
      optional($.package_parameter_validation),
    )),

    package_parameter_validation: $ => seq('where', $._expression),

    struct_declaration: $ => seq(
      optional($.visibility),
      optional(seq('extern', field('library', $.string_literal))),
      'struct',
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.type_parameter_list)),
      field('body', $.struct_field_list),
    ),

    // Declaration fields are whitespace-separated, not comma-separated.
    struct_field_list: $ => seq('{', repeat($.struct_field), '}'),

    struct_field: $ => seq(
      optional($.visibility),
      field('name', alias($.identifier, $.field_identifier)),
      ':',
      field('type', $._type),
    ),

    tuple_declaration: $ => seq(
      optional($.visibility),
      'tuple',
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.type_parameter_list)),
      '(',
      commaSep($._type),
      ')',
    ),

    enum_declaration: $ => seq(
      optional($.visibility),
      'enum',
      optional(seq('(', field('representation', $._type), ')')),
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.type_parameter_list)),
      '{',
      commaSep($.enum_member),
      '}',
    ),

    enum_member: $ => seq(
      field('name', $.identifier),
      optional(seq('=', field('value', alias($._signed_integer, $.integer_literal)))),
    ),

    _signed_integer: $ => seq(optional('-'), $._integer),

    union_declaration: $ => seq(
      optional($.visibility),
      'union',
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.type_parameter_list)),
      '{',
      commaSep($.union_variant),
      '}',
    ),

    union_variant: $ => seq(
      field('name', $.identifier),
      optional(seq('{', commaSep($.union_variant_field), '}')),
    ),

    union_variant_field: $ => seq(
      optional($.visibility),
      field('name', alias($.identifier, $.field_identifier)),
      ':',
      field('type', $._type),
    ),

    type_alias_declaration: $ => seq(
      optional($.visibility),
      'type',
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.type_parameter_list)),
      '=',
      field('type', $._type),
    ),

    service_declaration: $ => seq(
      optional($.visibility),
      'service',
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.type_parameter_list)),
      field('body', $.declaration_list),
    ),

    interface_declaration: $ => seq(
      optional($.visibility),
      'interface',
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.type_parameter_list)),
      field('body', $.declaration_list),
    ),

    declaration_list: $ => seq('{', repeat($.function_declaration), '}'),

    role_declaration: $ => seq(
      optional($.visibility),
      'role',
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.type_parameter_list)),
    ),

    impl_declaration: $ => seq(
      'impl',
      optional(field('type_parameters', $.type_parameter_list)),
      field('trait', $._type),
      optional(seq('for', field('type', $._type))),
      optional($.where_clause),
      field('body', $.impl_body),
    ),

    impl_body: $ => seq('{', repeat(choice($.impl_operation, $.function_declaration)), '}'),

    // `name: Path` binds an interface operation to an existing function.
    impl_operation: $ => seq(field('name', $.identifier), ':', field('target', $.type_path)),

    function_declaration: $ => seq(
      optional($.visibility),
      optional($.test_marker),
      optional('static'),
      optional('unsafe'),
      optional($.foreign_marker),
      optional(seq('effect', optional(field('environment', $.effect_environment)))),
      'fn',
      field('name', choice($.identifier, alias('drop', $.identifier))),
      optional(field('type_parameters', $.type_parameter_list)),
      field('parameters', $.parameter_list),
      optional(field('return_type', $.return_type)),
      optional(field('failures', $.failure_row)),
      optional(field('requirements', $.requirement_row)),
      optional($.where_clause),
      optional($.symbol_name),
      repeat($.function_property_clause),
      optional(field('body', $.block)),
    ),

    test_marker: _ => 'test',

    foreign_marker: $ => seq(choice('extern', 'export'), field('abi', $.string_literal)),

    symbol_name: $ => seq('as', $.string_literal),

    foreign_static_declaration: $ => seq(
      'unsafe',
      'extern',
      field('library', $.string_literal),
      'static',
      field('name', $.identifier),
      ':',
      field('type', $._type),
      optional($.symbol_name),
      repeat($.function_property_clause),
    ),

    export_static_declaration: $ => seq(
      'export',
      field('abi', $.string_literal),
      'static',
      field('name', $.identifier),
      ':',
      field('type', $._type),
      optional($.symbol_name),
      '=',
      field('value', $._expression),
    ),

    static_conditional_declaration: $ => seq(
      'static',
      'if',
      field('condition', $._expression),
      field('consequence', $.declaration_group),
      optional(seq('else', field('alternative', choice($.static_conditional_declaration, $.declaration_group)))),
    ),

    declaration_group: $ => seq('{', repeat($._declaration), '}'),

    module_property_declaration: $ => seq('module', $.function_property_clause),

    // `with Namespace.operation(name: value, ...)`
    function_property_clause: $ => seq(
      'with',
      field('namespace', $.identifier),
      '.',
      field('operation', $.identifier),
      '(',
      commaSep($.function_property),
      ')',
    ),

    function_property: $ => seq(field('name', $.identifier), ':', field('value', $._expression)),

    // ---------------------------------------------------------------------------------------
    // Callable contracts

    parameter_list: $ => seq(
      '(',
      optional(choice(
        seq(commaSep1($.parameter), optional($.variadic_marker)),
        $.variadic_marker,
      )),
      ')',
    ),

    parameter: $ => seq(
      optional(choice('static', 'mut')),
      field('name', $.identifier),
      ':',
      field('type', $._type),
    ),

    variadic_marker: _ => '...',

    return_type: $ => seq('->', choice($._type, $.opaque_result_type)),

    opaque_result_type: $ => seq('some', field('parameters', $.type_parameter_list), field('type', $._type)),

    failure_row: $ => seq('!', $._type),

    requirement_row: $ => prec.right(seq('?', sepBy1($._requirement_row_member, '|'))),

    _requirement_row_member: $ => choice($.requirement, $._type_primary),

    requirement: $ => prec.right(choice(
      seq('&', optional('mut'), $._type_primary, optional(seq('at', $.type_path))),
      seq($._type_primary, 'at', $.type_path),
    )),

    where_clause: $ => prec.right(seq('where', sepBy1(choice($.membership_constraint, $.provider_constraint), ','))),

    membership_constraint: $ => seq($._type, 'in', $._type),

    provider_constraint: $ => seq($._type, 'provides', $._type, 'from', $._type),

    // ---------------------------------------------------------------------------------------
    // Generic parameters and arguments

    type_parameter_list: $ => seq('<', commaSep($._generic_parameter), '>'),

    _generic_parameter: $ => choice($.type_parameter, $.lifetime_parameter, $.row_parameter),

    type_parameter: $ => seq(
      field('name', alias($.identifier, $.type_identifier)),
      optional(seq(':', sepBy1(choice($._type, $.lifetime), '+'))),
    ),

    lifetime_parameter: $ => seq(
      optional('use'),
      field('name', $.lifetime),
      optional(seq(':', sepBy1(choice($._type, $.lifetime), '+'))),
    ),

    row_parameter: $ => seq('?', field('name', alias($.identifier, $.type_identifier))),

    type_arguments: $ => seq(
      '<',
      optional($._effect_environment_prefix),
      commaSep(choice($._type, $.lifetime, $.requirement_selector)),
      optional($.failure_row),
      optional($.requirement_row),
      '>',
    ),

    _effect_environment_prefix: $ => seq(alias($._lifetime_set, $.effect_environment), ';'),

    _lifetime_set: $ => sepBy1($.lifetime, '&'),

    // `T at Path` selects which provider satisfies a role in a call's type arguments.
    requirement_selector: $ => seq($._type, 'at', $.type_path),

    effect_environment: $ => seq('<', $._lifetime_set, '>'),

    callable_environment: $ => seq('<', $.lifetime, '>'),

    // ---------------------------------------------------------------------------------------
    // Types

    _type: $ => choice($._type_primary, $.union_type),

    union_type: $ => prec.right(1, seq($._type_primary, repeat1(seq('|', $._type_primary)))),

    _type_primary: $ => choice(
      $.type_path,
      $.applied_type,
      $.mode_qualified_type,
      $.unit_type,
      $.parenthesized_type,
      $.reference_type,
      $.slice_type,
      $.pointer_type,
      $.fixed_array_type,
      $.callable_type,
      $.foreign_function_type,
      $.row_without,
      $.exact_representation_type,
    ),

    type_path: $ => choice(
      alias($.identifier, $.type_identifier),
      seq(field('namespace', alias($.identifier, $.namespace_identifier)), '.', field('name', alias($.identifier, $.type_identifier))),
    ),

    applied_type: $ => seq(field('type', $.type_path), field('arguments', $.type_arguments)),

    mode_qualified_type: $ => prec(-1, seq(
      field('mode', choice('mut', 'once')),
      field('type', choice($.type_path, $.applied_type)),
    )),

    unit_type: _ => seq('(', ')'),

    parenthesized_type: $ => seq('(', $._type, ')'),

    reference_type: $ => prec.right(2, seq(
      '&',
      optional($.lifetime),
      optional('mut'),
      field('type', $._type_primary),
      optional(seq('@', field('region', $.identifier))),
    )),

    slice_type: $ => seq('&', optional($.lifetime), optional('mut'), '[', field('element', $._type), ']'),

    pointer_type: $ => prec(2, seq(
      // `?*` and `?[*]` are nullable; the `?` touches the pointer as the native parser expects.
      choice('*', seq('[', '*', ']'), alias(token(seq('?', '*')), '?*'), seq(alias(token(seq('?', '[')), '?['), '*', ']')),
      choice('mut', 'const'),
      repeat($.pointer_qualifier),
      field('type', $._type_primary),
    )),

    pointer_qualifier: $ => seq(choice('align', 'addrspace'), '(', $._integer, ')'),

    fixed_array_type: $ => seq('[', field('element', $._type), ';', field('length', $._expression), ']'),

    callable_type: $ => prec.right(seq(
      optional(seq('for', field('binders', $.type_parameter_list))),
      optional('unsafe'),
      optional($.callable_mode),
      'fn',
      optional($.callable_environment),
      '(',
      commaSep($._type),
      ')',
      '->',
      field('return_type', $._type),
    )),

    callable_mode: _ => choice('mut', 'once'),

    foreign_function_type: $ => prec.right(seq(
      'extern',
      field('abi', $.string_literal),
      optional('unsafe'),
      'fn',
      '(',
      commaSep($._type),
      ')',
      '->',
      field('return_type', $._type),
      repeat($.function_property_clause),
    )),

    row_without: $ => seq('Without', token.immediate('<'), $._row_operand, ',', $._row_operand, '>'),

    _row_operand: $ => sepBy1(choice($.requirement, $._type_primary), '|'),

    exact_representation_type: $ => seq('typeof', token.immediate('('), choice($.type_path, $.applied_type), ')'),

    // ---------------------------------------------------------------------------------------
    // Statements

    block: $ => seq('{', repeat($._statement), '}'),

    _statement: $ => choice(
      $.binding_statement,
      $.pattern_binding_statement,
      $.conditional_statement,
      $.pattern_conditional_statement,
      $.static_conditional_statement,
      $.static_for_statement,
      $.while_statement,
      $.break_statement,
      $.continue_statement,
      $.return_statement,
      $.fail_statement,
      $.drop_statement,
      $.unsafe_statement,
      $.assignment_statement,
      $.expression_statement,
    ),

    binding_statement: $ => seq(
      'let',
      optional(choice('mut', 'static')),
      field('name', $.identifier),
      optional(seq(':', field('type', $._type))),
      '=',
      field('value', $._expression),
    ),

    pattern_binding_statement: $ => seq('let', field('pattern', $._pattern), '=', field('value', $._expression)),

    conditional_statement: $ => seq(
      'if',
      field('condition', $._expression),
      field('consequence', $.block),
      optional($._else_clause),
    ),

    pattern_conditional_statement: $ => seq(
      'if',
      'let',
      field('pattern', $._pattern),
      '=',
      field('value', $._expression),
      field('consequence', $.block),
      optional($._else_clause),
    ),

    _else_clause: $ => seq(
      'else',
      field('alternative', choice($.block, $.conditional_statement, $.pattern_conditional_statement)),
    ),

    static_conditional_statement: $ => seq(
      'static',
      'if',
      field('condition', $._expression),
      field('consequence', $.block),
      optional(seq('else', field('alternative', $.block))),
    ),

    static_for_statement: $ => seq(
      'static',
      'for',
      field('name', $.identifier),
      'in',
      field('value', $._expression),
      field('body', $.block),
    ),

    while_statement: $ => seq('while', field('condition', $._expression), field('body', $.block)),

    break_statement: _ => 'break',

    continue_statement: _ => 'continue',

    return_statement: $ => prec.right(seq('return', optional($._expression))),

    fail_statement: $ => seq('fail', optional('move'), $._expression),

    drop_statement: $ => seq('drop', $._expression),

    unsafe_statement: $ => seq('unsafe', $.block),

    assignment_statement: $ => seq(field('left', $._expression), '=', field('right', $._expression)),

    expression_statement: $ => $._expression,

    // ---------------------------------------------------------------------------------------
    // Expressions

    _expression: $ => choice(
      $.identifier,
      $.integer_literal,
      $.floating_literal,
      $.duration_literal,
      $.string_literal,
      $.raw_string_literal,
      $.byte_string_literal,
      $.character_literal,
      $.boolean_literal,
      $.unit_expression,
      $.grouped_expression,
      $.tuple_literal_expression,
      $.array_literal_expression,
      $.struct_literal_expression,
      $.contextual_record_literal_expression,
      $.applied_member_expression,
      $.anonymous_callable_expression,
      $.effect_expression,
      $.match_expression,
      $.compile_error_expression,
      $.run_expression,
      $.move_expression,
      $.borrow_expression,
      $.unsafe_expression,
      $.prefix_expression,
      $.infix_expression,
      $.pipeline_expression,
      $.call_expression,
      $.field_projection_expression,
      $.referent_projection_expression,
      $.ordinal_projection_expression,
      $.index_projection_expression,
    ),

    unit_expression: _ => seq('(', ')'),

    grouped_expression: $ => seq('(', $._expression, ')'),

    tuple_literal_expression: $ => seq('(', $._expression, ',', commaSep($._expression), ')'),

    array_literal_expression: $ => seq('[', commaSep($._expression), ']'),

    struct_literal_expression: $ => seq(
      field('type', choice($.type_path, $.applied_type)),
      field('fields', $.field_initializer_list),
    ),

    contextual_record_literal_expression: $ => seq('.', field('fields', $.field_initializer_list)),

    field_initializer_list: $ => seq('{', commaSep($.struct_field_initializer), '}'),

    struct_field_initializer: $ => seq(field('name', alias($.identifier, $.field_identifier)), ':', field('value', $._expression)),

    // `Option<T>.Some` or `Vector<Element>.make`, optionally with record fields.
    applied_member_expression: $ => prec.right(seq(
      field('selector', $.applied_member_selector),
      optional(field('fields', $.field_initializer_list)),
    )),

    applied_member_selector: $ => seq(
      field('type', $.applied_type),
      '.',
      field('member', $.identifier),
    ),

    anonymous_callable_expression: $ => seq(
      optional('effect'),
      'fn',
      field('parameters', $.parameter_list),
      field('return_type', $.return_type),
      optional(field('failures', $.failure_row)),
      optional(field('requirements', $.requirement_row)),
      field('body', $.block),
    ),

    effect_expression: $ => seq('effect', $.block),

    match_expression: $ => seq(
      'match',
      optional(alias('place', $.match_access)),
      field('value', $._expression),
      field('body', $.match_block),
    ),

    match_block: $ => seq('{', repeat($.match_arm), '}'),

    match_arm: $ => seq(
      field('pattern', $._pattern),
      optional(seq('if', field('guard', $._expression))),
      '=>',
      field('value', choice($.block, $._expression)),
    ),

    compile_error_expression: $ => seq('compileError', '(', $._expression, ')'),

    run_expression: $ => prec.right(PREC.run, seq('run', $._expression)),

    move_expression: $ => prec(PREC.prefix, seq('move', $._expression)),

    borrow_expression: $ => prec(PREC.prefix, seq('&', optional('mut'), $._expression)),

    unsafe_expression: $ => prec(PREC.prefix, seq('unsafe', $._expression)),

    prefix_expression: $ => prec(PREC.prefix, seq(field('operator', choice('-', '!', '~')), $._expression)),

    infix_expression: $ => {
      /** @type {[number, string, (r: Rule) => Rule][]} */
      const table = [
        [PREC.or, '||', prec.left],
        [PREC.and, '&&', prec.left],
        [PREC.equality, '==', prec.left],
        [PREC.equality, '!=', prec.left],
        [PREC.comparison, '<', prec.left],
        [PREC.comparison, '<=', prec.left],
        [PREC.comparison, '>', prec.left],
        [PREC.comparison, '>=', prec.left],
        [PREC.bit_or, '|', prec.left],
        [PREC.bit_xor, '^', prec.left],
        [PREC.bit_and, '&', prec.left],
        [PREC.additive, '+', prec.left],
        [PREC.additive, '-', prec.left],
        [PREC.multiplicative, '*', prec.left],
        [PREC.multiplicative, '/', prec.left],
        [PREC.multiplicative, '%', prec.left],
      ];
      return choice(...table.map(([precedence, operator]) => prec.left(precedence, seq(
        field('left', $._expression),
        field('operator', operator),
        field('right', $._expression),
      ))));
    },

    pipeline_expression: $ => prec.left(PREC.pipeline, seq(
      field('left', $._expression),
      '|>',
      field('right', $._expression),
    )),

    call_expression: $ => prec(PREC.postfix, seq(
      field('function', $._expression),
      optional(field('type_arguments', $.type_arguments)),
      field('arguments', $.argument_list),
    )),

    argument_list: $ => seq('(', commaSep($._expression), ')'),

    field_projection_expression: $ => prec(PREC.postfix, seq(
      field('value', $._expression),
      '.',
      field('field', choice(alias($.identifier, $.field_identifier), alias('drop', $.field_identifier))),
    )),

    referent_projection_expression: $ => prec(PREC.postfix, seq(field('value', $._expression), '.', '*')),

    ordinal_projection_expression: $ => prec(PREC.postfix, seq(
      field('value', $._expression),
      '.',
      field('ordinal', alias($._decimal_ordinal, $.integer_literal)),
    )),

    _decimal_ordinal: _ => /[0-9]+/,

    index_projection_expression: $ => prec(PREC.postfix, seq(
      field('value', $._expression),
      alias($._index_bracket, '['),
      field('index', $._expression),
      ']',
    )),

    // ---------------------------------------------------------------------------------------
    // Patterns

    _pattern: $ => choice(
      $.universal_pattern,
      $.integer_pattern,
      $.union_variant_pattern,
      $.enum_member_pattern,
      $.binding_pattern,
      $.nominal_pattern,
    ),

    universal_pattern: _ => '_',

    integer_pattern: $ => $._signed_integer,

    union_variant_pattern: $ => prec.right(seq(
      field('selector', $.applied_member_selector),
      optional(field('fields', $.field_pattern_list)),
    )),

    enum_member_pattern: $ => seq(
      field('type', alias($.identifier, $.type_identifier)),
      '.',
      field('member', $.identifier),
    ),

    binding_pattern: $ => seq(field('type', $._type_primary), field('name', $.identifier)),

    nominal_pattern: $ => seq(field('type', $._type_primary), field('fields', $.field_pattern_list)),

    field_pattern_list: $ => seq('{', commaSep(choice($.pattern_field, $.rest_pattern)), '}'),

    pattern_field: $ => seq(
      field('name', alias($.identifier, $.field_identifier)),
      optional(seq(':', field('pattern', choice($.identifier, $._pattern)))),
    ),

    rest_pattern: _ => '..',

    // ---------------------------------------------------------------------------------------
    // Literals and names

    boolean_literal: _ => choice('true', 'false'),

    integer_literal: $ => $._integer,

    _integer: _ => token(choice(
      /0[bB][01](_?[01])*/,
      /0[oO][0-7](_?[0-7])*/,
      /0[xX][0-9a-fA-F](_?[0-9a-fA-F])*/,
      /[0-9](_?[0-9])*/,
    )),

    floating_literal: _ => token(choice(
      /[0-9](_?[0-9])*\.[0-9](_?[0-9])*([eE][+-]?[0-9](_?[0-9])*)?/,
      /[0-9](_?[0-9])*[eE][+-]?[0-9](_?[0-9])*/,
    )),

    duration_literal: _ => token(new RegExp(`(${DIGITS}${DURATION_UNIT})+`)),

    string_literal: $ => choice(
      seq('"', repeat(choice($.string_content, $.escape_sequence)), token.immediate('"')),
      $._triple_quoted_string,
    ),

    _triple_quoted_string: _ => token(seq('"""', repeat(choice(/[^"\\]/, /\\(.|\n)/, /"[^"]/, /""[^"]/)), '"""')),

    string_content: _ => token.immediate(prec(1, /[^"\\\n]+/)),

    escape_sequence: _ => token.immediate(seq('\\', choice(
      /[nrt0"'\\]/,
      /x[0-9a-fA-F]{2}/,
      /u\{[0-9a-fA-F]+\}/,
    ))),

    raw_string_literal: _ => token(choice(
      seq('r"""', repeat(choice(/[^"]/, /"[^"]/, /""[^"]/)), '"""'),
      seq('r"', /[^"\n]*/, '"'),
    )),

    byte_string_literal: $ => choice(
      seq('b"', repeat(choice($.string_content, $.escape_sequence)), token.immediate('"')),
      token(seq('b"""', repeat(choice(/[^"\\]/, /\\(.|\n)/, /"[^"]/, /""[^"]/)), '"""')),
    ),

    character_literal: _ => token(seq(
      "'",
      choice(/[^'\\\n]/, /\\[nrt0"'\\]/, /\\x[0-9a-fA-F]{2}/, /\\u\{[0-9a-fA-F]+\}/),
      "'",
    )),

    lifetime: _ => token(seq("'", /[A-Za-z_][A-Za-z0-9_]*/)),

    identifier: _ => /[A-Za-z_][A-Za-z0-9_]*/,

  },
});
