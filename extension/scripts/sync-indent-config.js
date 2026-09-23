const fs = require("fs");
const path = require("path");
const m = require("../out/indentRules");
const p = path.join(__dirname, "..", "language-configuration.json");
const cfg = JSON.parse(fs.readFileSync(p, "utf8"));
cfg.indentationRules.increaseIndentPattern = m.INCREASE_INDENT_PATTERN;
cfg.indentationRules.decreaseIndentPattern = m.DECREASE_INDENT_PATTERN;
const optAssign =
  "^\\s*<#(assign|local|global)(?:\\s+(?:[a-zA-Z_][\\w]*|\"[^\"]+\")(?:\\s+in\\s+[^>]*)?)?>\\s*$";
for (const r of cfg.onEnterRules) {
  if (
    typeof r.beforeText === "string" &&
    r.beforeText.includes("#(assign|local|global)")
  ) {
    r.beforeText = optAssign;
  }
}
fs.writeFileSync(p, JSON.stringify(cfg, null, 2) + "\n");
console.log("synced language-configuration.json");
