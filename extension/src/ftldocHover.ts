import { findFtlCommentEnd, ftlCommentRanges } from "./comments";

type TagHelp = {
  description: string;
  example: string;
};

const BLOCK_TAGS: Record<string, TagHelp> = {
  lang: {
    description: "Marks the embedded language of the next capture assignment. Currently only SQL highlighting is supported (because I wanted it that way :)). More languages may be added later, but there are no plans yet. Put this in its own comment immediately above an angle-syntax #assign, #local, or #global capture block; blank lines are allowed. A normal assignment consumes the marker without enabling SQL. A documentation comment above the marker still attaches to the declaration.",
    example: "<#-- @lang sql -->\n<#assign query>\nSELECT id FROM orders WHERE id = @orderId\n</#assign>",
  },
  file: {
    description: "Starts documentation for this template file. It must be the first tag in the first comment, at the top of the file or immediately after its #ftl header. Hover a literal #import or #include path in another template to read it. This comment does not attach to the first declaration.",
    example: "<#--\n  @file Shared account header.\n  @requires account.displayName\n  @usage Include where the heading belongs.\n-->",
  },
  nodoc: {
    description: "Suppresses documentation when it is the first token of a comment. It does not hide a symbol from completion or navigation. A later @nodoc tag only skips its own tag body. Use this for an implementation comment that should not become the adjacent declaration's documentation.",
    example: "<#-- @nodoc Temporary result used for the next step. -->\n<#assign result = compute()>",
  },
  param: {
    description: "Documents a macro or function parameter. Match the declared name. Optional {type}, [name], [name=default], and dotted properties are supported. Descriptions may continue on following lines. Duplicate names and names whose root is not a declared parameter produce Information diagnostics by default. Type labels are documentation only.",
    example: "<#--\n  Selects a display label.\n  @param {hash} user User record.\n  @param {string} user.name Preferred name.\n  @param {string} [fallback=Guest] Missing-name label.\n-->\n<#function label user fallback=\"Guest\">\n  <#return (user.name)!fallback>\n</#function>",
  },
  return: {
    description: "Documents a function's returned value. An optional single-line {type} labels the result. Descriptions may span multiple lines; a multiline body starting with { can describe a result shape. @returns is an alias. Use a macro's summary to describe rendered output.",
    example: "<#--\n  @return {string} Display name or fallback.\n-->\n<#function label name>\n  <#return name>\n</#function>",
  },
  deprecated: {
    description: "Marks a declaration as deprecated and explains its replacement. The documentation displays a Deprecated section, and uses of documented deprecated symbols can receive warnings.",
    example: "<#--\n  @deprecated Use displayLabel instead.\n-->\n<#function oldLabel name>\n  <#return name>\n</#function>",
  },
  see: {
    description: "Adds a related reference. Repeat the tag for multiple references. HTTP(S) links can be made clickable with an inline {@link ...} tag. Symbol names are displayed as text and do not create definition links.",
    example: "<#--\n  Formats a label.\n  @see displayLabel\n  @see {@link https://freemarker.apache.org/ FreeMarker}\n-->",
  },
  since: {
    description: "Records the version or milestone when the documented API became available. The value is descriptive text.",
    example: "<#--\n  Formats a label.\n  @since 2.0\n-->",
  },
  stop: {
    description: "Documents a condition that can invoke FreeMarker's #stop directive. Repeat the tag to describe multiple stop conditions.",
    example: "<#--\n  Validates a request.\n  @stop When the request has no route.\n-->",
  },
  example: {
    description: "Shows a usage example as an FTL code block. Write the code directly after the tag or on following lines. The body ends at the next line-start @tag.",
    example: "<#--\n  @example\n    <#import \"lib.ftl\" as lib>\n    <@lib.card title=\"Summary\" />\n-->",
  },
  note: {
    description: "Adds a note to the documentation. Markdown, lists, and inline ftldoc tags are supported.",
    example: "<#--\n  @note Pass normalized keys.\n-->",
  },
  remarks: {
    description: "Adds details about the documented behavior. Markdown and multiline text are supported.",
    example: "<#--\n  @remarks An empty input produces an empty sequence.\n-->",
  },
  todo: {
    description: "Records unfinished work in a TODO documentation section.",
    example: "<#--\n  @todo Add support for archived entries.\n-->",
  },
  author: {
    description: "Records the author as descriptive metadata, displayed after the main documentation.",
    example: "<#--\n  @author Project team\n-->",
  },
  version: {
    description: "Records a documentation or API version as descriptive metadata.",
    example: "<#--\n  @version 2.0\n-->",
  },
  requires: {
    description: "Describes data model values or dependencies a template needs. Commonly used inside @file documentation. This tag documents requirements without validating the caller's data.",
    example: "<#--\n  @file Account header.\n  @requires account.displayName in the data model.\n-->",
  },
  exports: {
    description: "Lists public macros, functions, or values supplied by a template library. Commonly used inside @file documentation; it does not change symbol visibility.",
    example: "<#--\n  @file Card library.\n  @exports card(title, tone) and label(text).\n-->",
  },
  usage: {
    description: "Describes when and how to use a template or declaration. Use @example for FTL code that should be displayed in a code block.",
    example: "<#--\n  @file Shared heading.\n  @usage Include this file where the heading belongs.\n-->",
  },
};

const INLINE_TAGS: Record<string, TagHelp> = {
  code: {
    description: "Displays the enclosed text as inline code.",
    example: "<#-- Uses {@code account.name} as the label. -->",
  },
  literal: {
    description: "Displays the enclosed text with Markdown punctuation escaped. Use this to write a literal @word at the start of a documentation line.",
    example: "<#--\n  {@literal @name} is literal text.\n-->",
  },
  link: {
    description: "Displays a reference, with an optional label separated by a space or |. HTTP(S) targets become clickable links. Symbol targets display as code or label text.",
    example: "<#-- See {@link https://freemarker.apache.org/ FreeMarker}. -->",
  },
  linkplain: {
    description: "Displays a reference as plain text, or as a clickable link for an HTTP(S) target. An optional label may follow the target.",
    example: "<#-- See {@linkplain displayLabel label helper}. -->",
  },
  linkcode: {
    description: "Displays a reference or its label as inline code. HTTP(S) targets also create a clickable link.",
    example: "<#-- See {@linkcode displayLabel}. -->",
  },
};

export type FtldocTagHover = {
  start: number;
  end: number;
  markdown: string;
};

function helpMarkdown(tag: string, inline: boolean): string {
  const key = tag.toLowerCase();
  const catalog = inline ? INLINE_TAGS : BLOCK_TAGS;
  const canonical = key === "returns" && !inline ? "return" : key;
  const help = Object.prototype.hasOwnProperty.call(catalog, canonical)
    ? catalog[canonical]
    : undefined;
  const title = inline ? `{@${tag} …}` : `@${tag}`;
  if (!help) {
    return `\`${title}\` — custom ftldoc tag\n\nDisplays its body as an @${tag} documentation section. It has no built-in validation or control behavior. Each block tag starts on its own line; its body continues until the next tag.`;
  }
  return `\`${title}\` — ftldoc\n\n${help.description}\n\n**Example**\n\n\`\`\`ftl\n${help.example}\n\`\`\``;
}

/** Tag syntax help within FTL comments, shared by the editor and LSP host. */
export function ftldocTagHoverAt(
  text: string,
  offset: number,
  comments = ftlCommentRanges(text)
): FtldocTagHover | undefined {
  const comment = comments.find(([start, end]) => start <= offset && offset < end);
  if (!comment) {
    return undefined;
  }
  const [commentStart, commentEnd] = comment;
  const closedEnd = findFtlCommentEnd(text, commentStart);
  const bodyStart = commentStart + 4;
  const bodyEnd = closedEnd === -1 ? commentEnd : closedEnd - 3;
  const lineStart = Math.max(bodyStart, text.lastIndexOf("\n", offset - 1) + 1);
  const newline = text.indexOf("\n", offset);
  const lineEnd = Math.min(bodyEnd, newline === -1 ? text.length : newline);
  const line = text.slice(lineStart, lineEnd);
  const block = /^[ \t]*(?:\*[ \t]?)?(@[A-Za-z][\w-]*)/.exec(line);
  if (block) {
    const start = lineStart + block[0].length - block[1]!.length;
    const end = start + block[1]!.length;
    if (start <= offset && offset < end) {
      return { start, end, markdown: helpMarkdown(block[1]!.slice(1), false) };
    }
  }
  for (const match of line.matchAll(/\{@([A-Za-z][\w-]*)\b/g)) {
    const start = lineStart + match.index! + 1;
    const end = start + match[1]!.length + 1;
    if (
      start <= offset && offset < end &&
      Object.prototype.hasOwnProperty.call(INLINE_TAGS, match[1]!.toLowerCase())
    ) {
      return { start, end, markdown: helpMarkdown(match[1]!, true) };
    }
  }
  return undefined;
}
