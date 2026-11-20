import { readFileSync } from "node:fs";

const tag = process.argv[2] ?? "";
const version = /^v(\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?)$/.exec(tag)?.[1];
if (!version) {
  console.error("Usage: node scripts/release-notes.mjs vX.Y.Z");
  process.exit(1);
}

const source = readFileSync(new URL("../extension/CHANGELOG.md", import.meta.url), "utf8")
  .replace(/\r\n/g, "\n");
const headings = [...source.matchAll(/^## \[([^\]\n]+)\](?: - (\d{4}-\d{2}-\d{2}))?[ \t]*$/gm)];
const index = headings.findIndex((heading) => heading[1] === version);
const heading = headings[index];
if (!heading?.[2]) {
  console.error(`No dated changelog entry for ${tag}. Add "## [${version}] - YYYY-MM-DD" to extension/CHANGELOG.md.`);
  process.exit(1);
}

const changes = source.slice(heading.index + heading[0].length, headings[index + 1]?.index).trim();
const hasNotes = changes.replace(/<!--[\s\S]*?-->/g, "").split("\n")
  .some((line) => line.trim() && !/^#{1,6}\s/.test(line.trim()));
if (!hasNotes) {
  console.error(`The changelog entry for ${tag} is empty. Add release notes before tagging.`);
  process.exit(1);
}

const repo = `${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${process.env.GITHUB_REPOSITORY ?? "DevNathan/ftl-dev"}`;
const anchor = `${version} - ${heading[2]}`.toLowerCase().replace(/[^\w -]/g, "").replaceAll(" ", "-");
const encodedTag = encodeURIComponent(tag);
const vsix = `ftl-dev-${version}.vsix`;

console.log(`${changes}

## Install

- In an editor that uses [Open VSX](https://open-vsx.org/extension/nathan-0910/ftl-dev), search Extensions for \`nathan-0910.ftl-dev\`.
- To install manually, download [\`${vsix}\`](${repo}/releases/download/${encodedTag}/${encodeURIComponent(vsix)}) and choose **Install from VSIX…**.

[Full changelog](${repo}/blob/${encodedTag}/extension/CHANGELOG.md#${anchor})`);
