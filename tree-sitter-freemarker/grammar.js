/**
 * tree-sitter grammar scaffold for FreeMarker (ftl-dev).
 * Build: npm i && npx tree-sitter generate && npx tree-sitter build
 * Neovim: install as a custom parser; use queries in queries/
 */
module.exports = grammar({
  name: "freemarker",

  extras: ($) => [/\s+/],

  conflicts: ($) => [[$.angle_comment], [$.square_comment]],

  rules: {
    source_file: ($) => repeat($._node),

    _node: ($) =>
      choice(
        $.angle_comment,
        $.square_comment,
        $.interpolation,
        $.angle_directive,
        $.square_directive,
        $.text
      ),

    angle_comment: ($) =>
      seq("<#--", repeat(choice($.angle_comment, $.square_comment, /[^-]|-[^-]|--[^>]/)), "-->"),

    square_comment: ($) =>
      seq("[#--", repeat(choice($.angle_comment, $.square_comment, /[^-]|-[^-]|--[^\]]/)), "--]"),

    interpolation: ($) => seq("${", optional($.expression), "}"),

    angle_directive: ($) =>
      seq(
        choice("<#", "</#", "<@", "</@"),
        $.directive_name,
        optional($.expression),
        choice(">", "/>")
      ),

    square_directive: ($) =>
      seq(
        choice("[#", "[/#", "[@", "[/@"),
        $.directive_name,
        optional($.expression),
        choice("]", "/]")
      ),

    directive_name: (_) => /[a-zA-Z_][\w.]*/,

    expression: (_) => /[^}\]>]+/,

    text: (_) => /[^<\$\[]+|[<\$\[]/,
  },
});
