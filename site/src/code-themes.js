import light from "@shikijs/themes/github-light";
import dark from "@shikijs/themes/github-dark";

// GitHub's default comment gray is too dim on the site's dark code panels.
function commentContrast(theme, foreground) {
  return {
    ...theme,
    tokenColors: [...theme.tokenColors, {
      scope: ["comment", "punctuation.definition.comment", "string.comment"],
      settings: { foreground },
    }],
  };
}
export const codeThemes = [commentContrast(light, "#586675"), commentContrast(dark, "#9ba9bf")];
