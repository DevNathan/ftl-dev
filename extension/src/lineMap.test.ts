import * as assert from "assert";
import { test } from "node:test";
import {
  buildLineMap,
  lineCharacterToOffsetMapped,
  offsetToPos,
} from "./lineMap";
import { lineCharacterToOffset, offsetToLineCharacter } from "./symbols";

test("lineMap matches offsetToLineCharacter", () => {
  const text = "a\nbc\n\ndef";
  const map = buildLineMap(text);
  for (let o = 0; o <= text.length; o++) {
    assert.deepStrictEqual(
      offsetToPos(map, o),
      offsetToLineCharacter(text, o),
      `offset ${o}`
    );
  }
});

test("lineMap round-trip lineCharacter", () => {
  const text = "hello\nworld\n";
  const map = buildLineMap(text);
  for (let line = 0; line < 3; line++) {
    for (let ch = 0; ch < 6; ch++) {
      const viaMap = lineCharacterToOffsetMapped(map, line, ch);
      const viaNaive = lineCharacterToOffset(text, line, ch);
      assert.strictEqual(viaMap, viaNaive, `${line}:${ch}`);
    }
  }
});
