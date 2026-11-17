# FTL patterns

## Slice by position or split by delimiter

```ftl
<#assign ticket = "SUP-4821">
${ticket[0..<3]}
${ticket[4..]}
${ticket[4..*8]}
${ticket?keep_before("-")}
${ticket?keep_after("-")}
```

The first slice excludes index 3. The second and third both return `4821`. The third stops at the end of the string even though the length requested is eight. Guard a start index computed from user data or from a search that can return `-1`. A half-open slice with equal bounds can be empty. Inclusive ranges can run backwards, so `0..(size - 1)` is unsafe as an empty-safe loop.

For a delimiter that might not exist, `?keep_before` returns the original string and `?keep_after` returns an empty string. Use the `_last` variants (2.3.22+) when the last delimiter is the boundary.

## Check a set of known string IDs

```ftl
<#assign supportedExtensions = {"jpg": true, "png": true, "webp": true}>
<#list uploads as upload>
  <#assign extension = ((upload.extension)!"")?lower_case>
  <#if supportedExtensions[extension]??>
    ${upload.name}
  </#if>
</#list>
```

The hash is built once. Normalize both the stored keys and query the same way if the contract is case insensitive. For an existing hash of flags, use `allowed[key]!false` to read the flag and `allowed[key]??` only to check whether a value exists. When refactoring, keep order or duplicates if the sequence is used for anything besides membership.

If the allowlist is already a space-delimited string of lowercase extensions, use this pattern from the ftl-dev `?seq_contains` devnote:

```ftl
<#assign imageExtensions = " jpg png gif webp ">
<#list uploads as upload>
  <#assign extension = ((upload.extension)!"")?lower_case>
  <#if extension?matches("[a-z0-9]+") && imageExtensions?contains(" " + extension + " ")>
    ${upload.name}
  </#if>
</#list>
```

The boundary spaces prevent partial matches like `pn`. The token check rejects empty and multi-token input such as `jpg png`. Omit that check only when the caller already guarantees a single nonempty token. Use a hash for arbitrary values that can contain the separator. Do not convert an existing sequence to a delimited string on each iteration.

The devnote measured roughly 250 ms for 100,000 `?seq_contains` checks against four items on FreeMarker 2.3.34 and OpenJDK 17 with the older compatibility setting. Its hash lookup and delimited search took about 16–18 ms. These are measurements of that workload. Starting at `incompatible_improvements` 2.3.33, FreeMarker uses a cheaper normalized string comparison, but `?seq_contains` still searches the sequence. Keep the host's compatibility setting when refactoring.

For fixed string-to-value mappings, a hash with a default (for example, `labels[status]!"Unknown"`) also replaces repeated string branches. If the existing input is a comma-delimited workflow, the `?seq_index_of` devnote suggests this expression for getting the **next token** without splitting and searching a sequence:

```ftl
${("," + steps + ",")?keep_after("," + step + ",")?keep_before(",")}
```

Use it for nonempty, comma-free tokens with consistent spacing. The result is empty when the token is missing or last. If a caller needs a numeric index, keep index semantics.

## Put reusable rendering behind a macro

`lib/rows.ftlh`

```ftl
<#function displayLabel item>
  <#local name = (item.name)!"">
  <#return name?has_content?then(name, "Unnamed")>
</#function>

<#macro render items>
  <ul>
    <#list items as item>
      <li>${displayLabel(item)}</li>
    <#else>
      <li>No items</li>
    </#list>
  </ul>
</#macro>
```

`summary.ftlh`

```ftl
<#import "lib/rows.ftlh" as rows>
<@rows.render items=((report.items)![]) />
```

This example uses `?then` (2.3.23+) and assumes the host maps `.ftlh` to HTML. If the host does not map the extension, set the output format using the project's `#ftl` header convention. Auto-escaping follows the output format and settings where the interpolation is written, including in an imported macro.

## Apache FreeMarker references

- [Expressions](https://freemarker.apache.org/docs/dgui_template_exp.html) covers slices, comparison operators, and missing-value operators.
- [String built-ins](https://freemarker.apache.org/docs/ref_builtins_string.html) and [sequence built-ins](https://freemarker.apache.org/docs/ref_builtins_sequence.html) cover delimiter helpers, scalar membership, and transforms.
- [Changes in 2.3.33](https://freemarker.apache.org/docs/versions_2_3_33.html) describes the string comparison change and its configuration requirement.
- [Import](https://freemarker.apache.org/docs/ref_directive_import.html), [include](https://freemarker.apache.org/docs/ref_directive_include.html), and [auto-escaping](https://freemarker.apache.org/docs/dgui_misc_autoescaping.html) explain the file boundaries.
- [ftl-dev built-in notes](https://github.com/DevNathan/ftl-dev/blob/main/extension/src/reference/freemarkerRef.ts) contain the membership benchmark and alternatives.
