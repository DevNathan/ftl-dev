import { DIRECTIVES } from "./catalog";
import { offsetToLineCharacter } from "./symbols";

export type FtlDiagnostic = {
  offset: number;
  length: number;
  message: string;
  severity: "error" | "warning";
};

const KNOWN_DIRECTIVES = new Set(DIRECTIVES);

/**
 * Lightweight FreeMarker checks (not a full parser).
 * Catches common mistakes like `${boo?}` (dangling built-in operator).
 */
export function validateFtl(text: string): FtlDiagnostic[] {
  const out: FtlDiagnostic[] = [];
  const inComment = { v: false };
  let inString: '"' | "'" | null = null;
  let i = 0;

  while (i < text.length) {
    // FTL comment <#-- ... -->
    if (
      !inComment.v &&
      !inString &&
      text.startsWith("<#--", i)
    ) {
      inComment.v = true;
      i += 4;
      continue;
    }
    if (inComment.v) {
      if (text.startsWith("-->", i)) {
        inComment.v = false;
        i += 3;
      } else {
        i++;
      }
      continue;
    }

    // HTML comment — skip
    if (!inString && text.startsWith("<!--", i)) {
      const end = text.indexOf("-->", i + 4);
      i = end === -1 ? text.length : end + 3;
      continue;
    }

    const ch = text[i]!;

    if (inString) {
      if (ch === "\\" && i + 1 < text.length) {
        i += 2;
        continue;
      }
      if (ch === inString) {
        inString = null;
      }
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
      i++;
      continue;
    }

    // Dangling ? (not ??) — must be followed by builtin identifier
    if (ch === "?") {
      const next = text[i + 1];
      if (next === "?") {
        // existential ??
        i += 2;
        continue;
      }
      if (next && /[a-zA-Z_]/.test(next)) {
        // valid ?builtin start
        i++;
        continue;
      }
      // allow ?.  — not FreeMarker; still flag as dangling unless we want to ignore
      out.push({
        offset: i,
        length: 1,
        message:
          "Expected a built-in name after '?' (e.g. ?c, ?has_content). Use '??' to test for missing values.",
        severity: "error",
      });
      i++;
      continue;
    }

    i++;
  }

  // Unclosed ${ ... }
  out.push(...findUnclosedInterpolations(text));

  // Unclosed <#-- 
  if (text.includes("<#--") && !balancedComments(text)) {
    const start = text.lastIndexOf("<#--");
    const after = text.slice(start);
    if (!after.includes("-->")) {
      out.push({
        offset: start,
        length: 4,
        message: "Unclosed FreeMarker comment; expected '-->'.",
        severity: "error",
      });
    }
  }

  out.push(...findDirectiveIssues(text));

  return out;
}

const BLOCK_DIRECTIVES = new Set([
  "if",
  "list",
  "macro",
  "function",
  "attempt",
  "compress",
  "escape",
  "noescape",
  "autoesc",
  "noautoesc",
  "transform",
  "switch",
]);

/** May be short (`<#assign x=1>`) or capture-block (`<#assign x>…</#assign>`). */
const CAPTURE_ASSIGN_DIRECTIVES = new Set(["assign", "local", "global"]);

type DirTok = {
  offset: number;
  length: number;
  sigil: "#" | "@";
  name: string;
  kind: "open" | "close" | "empty";
  selfClose: boolean;
  /** Inner text between name and close bracket */
  inner: string;
  bracket: "<" | "[";
};

function findDirectiveIssues(text: string): FtlDiagnostic[] {
  const diags: FtlDiagnostic[] = [];
  const tokens = scanDirectives(text);

  // Unclosed open-tag (started <#name but never saw > or ])
  diags.push(...findUnclosedDirectiveOpens(text));

  const stack: DirTok[] = [];
  /** Offsets of `#if` opens that already have an `#else`. */
  const elseSeenForIf = new Set<number>();

  for (const tok of tokens) {
    if (tok.sigil === "@") {
      // user macros: only track non-self-close open/close for mismatch later if needed
      continue;
    }

    if (!KNOWN_DIRECTIVES.has(tok.name)) {
      diags.push({
        offset: tok.offset,
        length: tok.length,
        message: `Unknown directive '#${tok.name}'.`,
        severity: "error",
      });
      // Still process structure below so mismatch/unclosed stay useful.
    }

    if (tok.name === "elseif") {
      const parentIf = [...stack].reverse().find((t) => t.name === "if");
      if (!parentIf) {
        diags.push({
          offset: tok.offset,
          length: tok.length,
          message: `'#elseif' without an enclosing '#if'.`,
          severity: "error",
        });
      }
      if (!tok.inner.trim()) {
        diags.push({
          offset: tok.offset,
          length: tok.length,
          message: `'#elseif' requires a condition expression.`,
          severity: "error",
        });
      }
      continue;
    }

    if (tok.name === "else") {
      const parentIf = [...stack].reverse().find((t) => t.name === "if");
      if (!parentIf) {
        diags.push({
          offset: tok.offset,
          length: tok.length,
          message: `'#else' without an enclosing '#if'.`,
          severity: "error",
        });
      } else if (elseSeenForIf.has(parentIf.offset)) {
        diags.push({
          offset: tok.offset,
          length: tok.length,
          message: `Duplicate '#else' in the same '#if'.`,
          severity: "error",
        });
      } else {
        elseSeenForIf.add(parentIf.offset);
      }
      continue;
    }

    if (tok.kind === "close") {
      let matched = false;
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i]!.name === tok.name) {
          stack.splice(i, 1);
          matched = true;
          break;
        }
      }
      if (!matched) {
        diags.push({
          offset: tok.offset,
          length: tok.length,
          message: `Unexpected '</#${tok.name}>': no matching '#${tok.name}'.`,
          severity: "error",
        });
      }
      continue;
    }

    if (
      tok.name === "list" &&
      tok.kind === "open" &&
      !tok.selfClose &&
      !/\bas\b/.test(tok.inner)
    ) {
      diags.push({
        offset: tok.offset,
        length: tok.length,
        message:
          `'#list' classic form requires 'as' (e.g. <#list seq as x>).`,
        severity: "error",
      });
    }

    if (tok.selfClose || tok.kind === "empty") {
      continue;
    }

    if (isBlockDirectiveOpen(tok)) {
      stack.push(tok);
    }
  }

  for (const open of stack) {
    diags.push({
      offset: open.offset,
      length: open.length,
      message: `Unclosed '#${open.name}'; expected '</#${open.name}>'.`,
      severity: "error",
    });
  }

  return diags;
}

function isBlockDirectiveOpen(tok: DirTok): boolean {
  if (BLOCK_DIRECTIVES.has(tok.name)) {
    return true;
  }
  if (!CAPTURE_ASSIGN_DIRECTIVES.has(tok.name)) {
    return false;
  }
  // Capture form: no `=` / `++` / `+=` … in the open tag.
  // `<#assign x>` / `<#assign x in ns>` / bare `<#assign>` (still paired with `</#assign>`).
  const inner = tok.inner.replace(/\/\s*$/, "").trim();
  return !/(=|\+\+|--|\+=|-=|\*=|\/=|%=)/.test(inner);
}

/** `<#assign` … EOF without `>` / `/>` */
function findUnclosedDirectiveOpens(text: string): FtlDiagnostic[] {
  const diags: FtlDiagnostic[] = [];
  let i = 0;
  let inString: '"' | "'" | null = null;
  let inComment = false;

  while (i < text.length) {
    if (!inComment && !inString && text.startsWith("<#--", i)) {
      inComment = true;
      i += 4;
      continue;
    }
    if (inComment) {
      if (text.startsWith("-->", i)) {
        inComment = false;
        i += 3;
      } else {
        i++;
      }
      continue;
    }
    if (inString) {
      if (text[i] === "\\" && i + 1 < text.length) {
        i += 2;
        continue;
      }
      if (text[i] === inString) {
        inString = null;
      }
      i++;
      continue;
    }
    if (text[i] === '"' || text[i] === "'") {
      inString = text[i] as '"' | "'";
      i++;
      continue;
    }

    const angle = text.slice(i).match(/^(<\/?[#@][a-zA-Z_][\w\.]*)/);
    const square = text.slice(i).match(/^(\[\/?[#@][a-zA-Z_][\w\.]*)/);
    const m = angle ?? square;
    if (!m) {
      i++;
      continue;
    }

    const start = i;
    const openCh = m[1]![0]!;
    const closeCh = openCh === "[" ? "]" : ">";
    i += m[1]!.length;

    // scan until close bracket (respect strings / paren depth) or HTML / next FTL tag
    let closed = false;
    let paren = 0;
    let brace = 0;
    while (i < text.length) {
      if (!inString && text.startsWith("<#--", i)) {
        const endc = text.indexOf("-->", i + 4);
        if (endc === -1) {
          i = text.length;
          break;
        }
        i = endc + 3;
        continue;
      }
      const c = text[i]!;
      if (inString) {
        if (c === "\\" && i + 1 < text.length) {
          i += 2;
          continue;
        }
        if (c === inString) {
          inString = null;
        }
        i++;
        continue;
      }
      if (c === '"' || c === "'") {
        inString = c;
        i++;
        continue;
      }
      if (c === "(") {
        paren++;
        i++;
        continue;
      }
      if (c === ")" && paren > 0) {
        paren--;
        i++;
        continue;
      }
      if (c === "{") {
        brace++;
        i++;
        continue;
      }
      if (c === "}" && brace > 0) {
        brace--;
        i++;
        continue;
      }
      // HTML tag or another FTL directive before this one closed
      if (c === "<" || c === "[") {
        const rest = text.slice(i);
        if (
          rest.startsWith("<#") ||
          rest.startsWith("</#") ||
          rest.startsWith("<@") ||
          rest.startsWith("</@") ||
          rest.startsWith("[#") ||
          rest.startsWith("[/#") ||
          rest.startsWith("[@") ||
          rest.startsWith("[/@") ||
          /^<\/?[a-zA-Z]/.test(rest)
        ) {
          break;
        }
      }
      if (c === closeCh && paren === 0 && brace === 0) {
        closed = true;
        i++;
        break;
      }
      i++;
    }

    if (!closed) {
      diags.push({
        offset: start,
        length: Math.min(m[1]!.length, text.length - start),
        message: `Unclosed directive tag; expected '${closeCh}' or '/${closeCh}'.`,
        severity: "error",
      });
    }
  }

  return diags;
}

function scanDirectives(text: string): DirTok[] {
  const tokens: DirTok[] = [];
  let i = 0;
  let inString: '"' | "'" | null = null;
  let inComment = false;

  while (i < text.length) {
    if (!inComment && !inString && text.startsWith("<#--", i)) {
      inComment = true;
      i += 4;
      continue;
    }
    if (inComment) {
      if (text.startsWith("-->", i)) {
        inComment = false;
        i += 3;
      } else {
        i++;
      }
      continue;
    }
    if (inString) {
      if (text[i] === "\\" && i + 1 < text.length) {
        i += 2;
        continue;
      }
      if (text[i] === inString) {
        inString = null;
      }
      i++;
      continue;
    }
    if (text[i] === '"' || text[i] === "'") {
      inString = text[i] as '"' | "'";
      i++;
      continue;
    }

    const head = text.slice(i).match(/^([<\[])(\/)?([#@])([a-zA-Z_][\w\.]*)\b/);
    if (!head) {
      i++;
      continue;
    }

    const start = i;
    const bracket = head[1] as "<" | "[";
    const isClose = head[2] === "/";
    const sigil = head[3] as "#" | "@";
    const name = head[4]!;
    const closeCh = bracket === "[" ? "]" : ">";
    i += head[0].length;

    const innerStart = i;
    let closed = false;
    let paren = 0;
    let brace = 0;
    while (i < text.length) {
      if (!inString && text.startsWith("<#--", i)) {
        const endc = text.indexOf("-->", i + 4);
        if (endc === -1) {
          i = text.length;
          break;
        }
        i = endc + 3;
        continue;
      }
      const c = text[i]!;
      if (inString) {
        if (c === "\\" && i + 1 < text.length) {
          i += 2;
          continue;
        }
        if (c === inString) {
          inString = null;
        }
        i++;
        continue;
      }
      if (c === '"' || c === "'") {
        inString = c;
        i++;
        continue;
      }
      if (c === "(") {
        paren++;
        i++;
        continue;
      }
      if (c === ")" && paren > 0) {
        paren--;
        i++;
        continue;
      }
      if (c === "{") {
        brace++;
        i++;
        continue;
      }
      if (c === "}" && brace > 0) {
        brace--;
        i++;
        continue;
      }
      // Nested `[`…`]` inside angle-bracket tags (e.g. <#list [1,2,3] as i>)
      if (c === "[" && bracket === "<" && paren === 0 && brace === 0) {
        let depth = 1;
        i++;
        while (i < text.length && depth > 0) {
          const sc = text[i]!;
          if (inString) {
            if (sc === "\\" && i + 1 < text.length) {
              i += 2;
              continue;
            }
            if (sc === inString) {
              inString = null;
            }
            i++;
            continue;
          }
          if (sc === '"' || sc === "'") {
            inString = sc;
            i++;
            continue;
          }
          if (sc === "[") {
            depth++;
          } else if (sc === "]") {
            depth--;
          }
          i++;
        }
        continue;
      }
      if (c === closeCh && paren === 0 && brace === 0) {
        closed = true;
        break;
      }
      // Bail if another tag starts before close (same as unclosed-open scanner)
      if ((c === "<" || c === "[") && paren === 0 && brace === 0) {
        const rest = text.slice(i);
        if (
          rest.startsWith("<#") ||
          rest.startsWith("</#") ||
          rest.startsWith("<@") ||
          rest.startsWith("</@") ||
          rest.startsWith("[#") ||
          rest.startsWith("[/#") ||
          rest.startsWith("[@") ||
          rest.startsWith("[/@") ||
          /^<\/?[a-zA-Z]/.test(rest)
        ) {
          break;
        }
      }
      i++;
    }

    if (!closed) {
      // Leave for findUnclosedDirectiveOpens; do not emit a partial token.
      continue;
    }

    const inner = text.slice(innerStart, i);
    const selfClose = /\/\s*$/.test(inner);
    i++; // consume close bracket
    tokens.push({
      offset: start,
      length: i - start,
      sigil,
      name,
      kind: isClose ? "close" : "open",
      selfClose,
      inner,
      bracket,
    });
  }

  return tokens;
}

function balancedComments(text: string): boolean {
  let i = 0;
  let open = 0;
  while (i < text.length) {
    if (text.startsWith("<#--", i)) {
      open++;
      i += 4;
      continue;
    }
    if (text.startsWith("-->", i) && open > 0) {
      open--;
      i += 3;
      continue;
    }
    i++;
  }
  return open === 0;
}

function findUnclosedInterpolations(text: string): FtlDiagnostic[] {
  const diags: FtlDiagnostic[] = [];
  let i = 0;
  let inString: '"' | "'" | null = null;
  let inComment = false;

  while (i < text.length) {
    if (!inComment && !inString && text.startsWith("<#--", i)) {
      inComment = true;
      i += 4;
      continue;
    }
    if (inComment) {
      if (text.startsWith("-->", i)) {
        inComment = false;
        i += 3;
      } else {
        i++;
      }
      continue;
    }
    if (inString) {
      if (text[i] === "\\" && i + 1 < text.length) {
        i += 2;
        continue;
      }
      if (text[i] === inString) {
        inString = null;
      }
      i++;
      continue;
    }
    if (text[i] === '"' || text[i] === "'") {
      inString = text[i] as '"' | "'";
      i++;
      continue;
    }

    if (text.startsWith("${", i)) {
      const start = i;
      i += 2;
      let depth = 1;
      let found = false;
      while (i < text.length) {
        if (!inString && text.startsWith("<#--", i)) {
          const endc = text.indexOf("-->", i + 4);
          if (endc === -1) {
            break;
          }
          i = endc + 3;
          continue;
        }
        const c = text[i]!;
        if (inString) {
          if (c === "\\" && i + 1 < text.length) {
            i += 2;
            continue;
          }
          if (c === inString) {
            inString = null;
          }
          i++;
          continue;
        }
        if (c === '"' || c === "'") {
          inString = c;
          i++;
          continue;
        }
        if (c === "{") {
          depth++;
        } else if (c === "}") {
          depth--;
          if (depth === 0) {
            found = true;
            i++;
            break;
          }
        }
        i++;
      }
      if (!found) {
        diags.push({
          offset: start,
          length: 2,
          message: "Unclosed interpolation; expected '}'.",
          severity: "error",
        });
      } else {
        const inner = text.slice(start + 2, i - 1);
        if (!inner.trim()) {
          diags.push({
            offset: start,
            length: i - start,
            message: "Empty interpolation '${}'.",
            severity: "error",
          });
        }
      }
      continue;
    }

    i++;
  }

  return diags;
}

/** Map diagnostics to 0-based line/character for editors or tests. */
export function diagnosticPositions(
  text: string,
  d: FtlDiagnostic
): { line: number; character: number; endLine: number; endCharacter: number } {
  const start = offsetToLineCharacter(text, d.offset);
  const end = offsetToLineCharacter(text, d.offset + d.length);
  return {
    line: start.line,
    character: start.character,
    endLine: end.line,
    endCharacter: end.character,
  };
}
