import * as assert from "assert";
import Module from "module";
import type { SymbolKind } from "./symbols";

/** vscode is host-only; stub before loading code under test (plain `node` unit runs). */
const vscodeStub = {
  SymbolKind: {
    Method: 5,
    Function: 11,
    Variable: 12,
  },
};

const originalRequire = Module.prototype.require;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Module.prototype.require as any) = function (
  this: NodeModule,
  id: string,
  ...rest: unknown[]
) {
  if (id === "vscode") {
    return vscodeStub;
  }
  return (originalRequire as (...args: unknown[]) => unknown).apply(this, [
    id,
    ...rest,
  ]);
};

// Load after stub so `import "vscode"` inside symbolKindVscode resolves.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { symbolKindToVscode } = require("./symbolKindVscode") as typeof import("./symbolKindVscode");

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✖ ${name}`);
    throw e;
  }
}

const cases: { kind: SymbolKind; expected: number }[] = [
  { kind: "macro", expected: vscodeStub.SymbolKind.Method },
  { kind: "function", expected: vscodeStub.SymbolKind.Function },
  { kind: "assign", expected: vscodeStub.SymbolKind.Variable },
  { kind: "local", expected: vscodeStub.SymbolKind.Variable },
  { kind: "global", expected: vscodeStub.SymbolKind.Variable },
];

for (const { kind, expected } of cases) {
  test(`symbolKindToVscode ${kind}`, () => {
    assert.strictEqual(symbolKindToVscode(kind), expected);
  });
}
