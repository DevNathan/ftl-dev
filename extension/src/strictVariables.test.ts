import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { validateFtl } from "./diagnostics";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✖ ${name}`);
    throw e;
  }
}

function undeclared(text: string, opts: {
  strictVariables?: boolean;
  dataModel?: readonly string[];
} = {}) {
  return validateFtl(text, {
    strictVariables: opts.strictVariables ?? true,
    dataModel: opts.dataModel,
  }).filter((d) => d.message.includes("Undeclared identifier"));
}

const pkgPath = path.join(__dirname, "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
  contributes: {
    configuration: {
      properties: Record<string, {
        type?: string | string[];
        default?: unknown;
        items?: { type?: string };
      }>;
    };
  };
};
const props = pkg.contributes.configuration.properties;

test("AC1: ftl-dev.strictVariables exists, boolean, default false", () => {
  const p = props["ftl-dev.strictVariables"];
  assert.ok(p, "missing setting");
  assert.strictEqual(p!.type, "boolean");
  assert.strictEqual(p!.default, false);
});

test("AC2: ftl-dev.dataModel exists, string array, default []", () => {
  const p = props["ftl-dev.dataModel"];
  assert.ok(p, "missing setting");
  assert.strictEqual(p!.type, "array");
  assert.strictEqual(p!.items?.type, "string");
  assert.deepStrictEqual(p!.default, []);
});

test("AC3: strictVariables false → no undeclared diags for host names", () => {
  const diags = undeclared("${userService.x}", { strictVariables: false });
  assert.strictEqual(diags.length, 0);
  const def = validateFtl("${userService.x}");
  assert.ok(!def.some((d) => d.message.includes("Undeclared identifier")));
});

test("AC4: strict on, empty dataModel → warning on undeclared root", () => {
  const text = "${undeclaredName}";
  const diags = undeclared(text);
  assert.strictEqual(diags.length, 1);
  assert.strictEqual(diags[0]!.severity, "warning");
  assert.ok(diags[0]!.message.includes("Undeclared identifier 'undeclaredName'"));
  assert.strictEqual(diags[0]!.offset, text.indexOf("undeclaredName"));
  assert.strictEqual(diags[0]!.length, "undeclaredName".length);
});

test("AC5: dataModel allowlist silences root", () => {
  const diags = undeclared("${undeclaredName}", {
    dataModel: ["undeclaredName"],
  });
  assert.strictEqual(diags.length, 0);
});

test("AC6: #assign then use → no undeclared warning", () => {
  const diags = undeclared("<#assign foo = 1>\n${foo}");
  assert.ok(!diags.some((d) => d.message.includes("'foo'")));
});

test("AC7: #import as ns → root ns known; member not flagged", () => {
  const text = '<#import "lib.ftl" as u>\n${u.bar}';
  const diags = undeclared(text);
  assert.ok(!diags.some((d) => d.message.includes("'u'")));
  assert.ok(!diags.some((d) => d.message.includes("'bar'")));
});

test("AC8: #list loop var in body → no undeclared for loop var", () => {
  const text = "<#list items as i>${i}</#list>";
  const diags = undeclared(text, { dataModel: ["items"] });
  assert.ok(!diags.some((d) => d.message.includes("'i'")));

  const withoutItems = undeclared("<#list items as i>${i}</#list>");
  assert.ok(withoutItems.some((d) => d.message.includes("'items'")));
  assert.ok(!withoutItems.some((d) => d.message.includes("'i'")));
});

test("AC9: macro/function param in body known; outside warns", () => {
  const macro = "<#macro m(x)>${x}</#macro>";
  assert.ok(!undeclared(macro).some((d) => d.message.includes("'x'")));

  const fn = "<#function f(x)>${x}</#function>";
  assert.ok(!undeclared(fn).some((d) => d.message.includes("'x'")));

  const outside = "<#macro m(x)>${x}</#macro>\n${x}";
  const diags = undeclared(outside);
  assert.ok(diags.some((d) => d.message.includes("'x'")));
  const xUse = outside.lastIndexOf("${x}") + 2;
  assert.ok(diags.some((d) => d.offset === xUse));
});

test("AC10: identifier only inside quoted string → not flagged", () => {
  const diags = undeclared('${"secretName"}');
  assert.ok(!diags.some((d) => d.message.includes("'secretName'")));
});

test("AC11: identifier only inside FTL comment → not flagged", () => {
  const diags = undeclared("<#-- secretName -->\n<#assign x = 1>${x}");
  assert.ok(!diags.some((d) => d.message.includes("'secretName'")));
});

test("AC12: builtin after ? not flagged", () => {
  const diags = undeclared("${x?string}", { dataModel: ["x"] });
  assert.ok(!diags.some((d) => d.message.includes("'string'")));
});

test("AC13: special var .now not flagged", () => {
  const diags = undeclared("${.now}");
  assert.ok(!diags.some((d) => d.message.includes("'now'")));
});

test("AC14: dotted path — only root policy; prop/method not flagged", () => {
  const diags = undeclared("${known.prop.method}", {
    dataModel: ["known"],
  });
  assert.strictEqual(diags.length, 0);
});

test("AC15: named-param LHS and clause keywords not flagged", () => {
  assert.ok(
    !undeclared('<#ftl encoding="UTF-8">').some((d) =>
      d.message.includes("'encoding'")
    )
  );
  assert.ok(
    !undeclared('<#setting locale="en_US">').some((d) =>
      d.message.includes("'locale'")
    )
  );
  assert.ok(
    !undeclared('<#include "x.ftl" parse=true>').some((d) =>
      d.message.includes("'parse'")
    )
  );
  // clause keywords in list tag
  const list = undeclared("<#list items as i>${i}</#list>", {
    dataModel: ["items"],
  });
  assert.ok(!list.some((d) => d.message.includes("'as'")));
});

test("AC16: plain HTML outside expression spans not scanned", () => {
  const diags = undeclared('<div class="foo">hello</div>');
  assert.ok(!diags.some((d) => d.message.includes("'foo'")));
  assert.ok(!diags.some((d) => d.message.includes("'div'")));
  assert.ok(!diags.some((d) => d.message.includes("'class'")));
  assert.ok(!diags.some((d) => d.message.includes("'hello'")));
});
