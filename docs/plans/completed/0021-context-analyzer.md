# 0021 - Context Analyzer (Wave 2)

Status: **completed**  
Started: 2026-10-20  
Completed: 2026-10-20  
Repo: `vsix/` only — never touch `vim/`.

Related: [0020-completion-provider-split.md](0020-completion-provider-split.md) (Wave 1 — CompletionEngine; §후속 Wave 2), [0004-completions.md](0004-completions.md), [0005-hover-import-completions.md](0005-hover-import-completions.md).

---

## 요약

Wave 1(0020)은 **후보 생성**을 CompletionEngine + Provider로 분리했다. Wave 2는 **커서 문맥 판별(cursor-context probing)** 을 completion / hover / signature help가 공유하는 **Context Analyzer** 모듈로 구조 통합한다. AST·새 IDE 동작 없이, 기존 `completionContext`·`builtinAt`/`directiveAt`·관련 헬퍼를 **한 디렉터리(또는 단일 모듈)로 이동 + thin re-export** 하여 “커서에서 무엇 위에 있는가” 규칙이 한곳에서 유지되도록 한다. **Behavior-preserving structural unify** 가 목표다.

---

## 배경 / 문제

### 오늘의 분산

| 역할 | 위치 | 입력 | 비고 |
|------|------|------|------|
| Completion 문맥 | [`catalog.ts`](../../extension/src/catalog.ts) — `completionContext(before)`, `isInRecoverBody(before)` | 커서 **앞** 텍스트만 | 5종 `CompletionContext`; 정규식/휴리스틱 |
| Hover ?builtin / #directive | [`hoverTokens.ts`](../../extension/src/hoverTokens.ts) — `builtinAt`, `directiveAt` | 전체 문서 + **offset** | 식별자 walk + `?` / `<#`·`[#`·`</#`·`[/#` prefix 검사 |
| 심볼·정의·hover fallback | [`symbols.ts`](../../extension/src/symbols.ts) — `identifierAt` | text + offset | dotted name (`ns.greet`) |
| Signature help | [`signatureHelp.ts`](../../extension/src/signatureHelp.ts) — `signatureHelpAt` → `findFunctionCall` / `findMacroCall` | text + offset + index | call-site 역스캔; 내부에서 `identifierAt` 사용 |
| Comment gate (host) | [`comments.ts`](../../extension/src/comments.ts) — `isInFtlComment`, `ftlCommentRanges` | text + offset | completion / signature **provider**가 suggest·help 전에 차단 |

Host adapter:

- [`completionProvider.ts`](../../extension/src/completionProvider.ts): comment gate → `completionContext(before)` → `buildCompletions`
- [`hoverProvider.ts`](../../extension/src/hoverProvider.ts): `builtinAt` → `directiveAt` → `identifierAt` → definitions
- [`signatureHelpProvider.ts`](../../extension/src/signatureHelpProvider.ts): comment gate → `signatureHelpAt`

LSP scaffold [`server/src/server.ts`](../../server/src/server.ts)는 Wave 1과 동일하게 `completionContext` / `buildCompletions`를 catalog에서 import한다.

### 한계

- **동일 개념, 다른 구현**: completion의 `?foo` / `<#dir` / `.special` / `ns.member` 판별과 hover의 `builtinAt` / `directiveAt`은 유사한 “커서 근처 토큰” 규칙이지만 **파일·알고리즘이 분리**되어 있다. 한쪽만 수정하면 completion vs hover **불일치** 위험이 있다.
- **입력 형태 불일치**: `completionContext`는 `before` slice; hover helpers는 full `text` + `offset`. Analyzer는 facade에서 `before = text.slice(0, offset)` 등 **얇은 어댑터**로 통일하되, 이동 시 로직은 copy-paste parity를 유지한다.
- **Wave 1 이후**: Engine/Provider는 context **타입**에만 의존; context **생성**을 Analyzer로 모으면 Wave 3(parser) 전에 “문맥 레이어” 경계가 명확해진다.

Wave 2는 사용자 가시 동작·카탈로그·hover 문서 내용을 바꾸지 않는 **구조 리팩터**다.

---

## 참조 설계 (목표 모듈 경계)

```text
Document text + cursor offset
       │
       ├─ (host) isInFtlComment?  ──► early exit  [comments.ts — 유지, 관계만 문서화]
       │
       ▼
Context Analyzer  (extension/src/context/ …)
       │
       ├─ completion-facing: completionContext(before)  [+ isInRecoverBody]
       ├─ hover-facing: builtinAt(text, offset), directiveAt(text, offset)
       ├─ shared: identifierAt(text, offset)  [이동 또는 analyzer에서 re-export; symbols API 안정]
       └─ (선택, in-scope if trivial) call-site helpers used by signatureHelp
       │
       ▼
Feature providers (thin imports)
  completionProvider / hoverProvider / signatureHelpProvider
  catalog.ts re-exports completionContext (+ types) for LSP & tests
  hoverTokens.ts → thin re-export of builtinAt/directiveAt (optional, AC3)
```

원칙:

1. **로직 재작성 금지**: 함수 본문을 Analyzer로 **이동**; 정규식·walk 순서·edge case는 diff review + 기존 테스트로 parity.
2. **공개 API 안정**: `catalog`의 `completionContext` / `CompletionContext` / `isInRecoverBody`; server·`catalog.test.ts`·`hoverImport.test.ts` import 경로 유지 (re-export 허용).
3. **comments.ts는 Analyzer 밖**: FTL comment range는 index / diagnostics / semantic tokens와 공유; completion·signature의 **gate**만 provider 또는 Analyzer **문서**에서 “선행 조건”으로 명시.

---

## 도입 범위 (Wave 2 = this plan)

**Behavior-preserving refactor only.**

### 목표 구조

1. **신규 모듈** (가칭 `extension/src/context/`):
   - `completionContext.ts` (또는 `analyzeCompletionContext.ts`) — `completionContext`, `isInRecoverBody` **구현** (현 [`catalog.ts`](../../extension/src/catalog.ts)에서 이동)
   - `hoverAtCursor.ts` — `builtinAt`, `directiveAt` (현 [`hoverTokens.ts`](../../extension/src/hoverTokens.ts)에서 이동)
   - `identifierAt.ts` — `identifierAt` (현 [`symbols.ts`](../../extension/src/symbols.ts)에서 이동 **또는** symbols가 analyzer에서 re-export; `symbols.test.ts`의 `identifierAt` import 경로는 `./symbols` 유지 권장)
   - `index.ts` — Analyzer 공개 surface (내부 feature용); catalog / hoverTokens / symbols는 **thin facade**

2. **catalog.ts**:
   - `CompletionContext` 타입은 catalog에 두거나 context submodule과 공유 타입으로 export (breaking 없음)
   - `completionContext`, `isInRecoverBody` → context에서 re-export 또는 delegate
   - `buildCompletions` / Engine 경로 **변경 없음** (Wave 1 유지)

3. **Provider wiring** (동작 동일, import만 정리 가능):
   - [`completionProvider.ts`](../../extension/src/completionProvider.ts) — `completionContext`는 catalog 경유 유지 가능; 직접 `./context` import는 **선택** (AC1: analyzer 모듈이 존재하고 completion 경로가 그 구현을 사용하면 충족)
   - [`hoverProvider.ts`](../../extension/src/hoverProvider.ts) — `builtinAt` / `directiveAt` / `identifierAt`가 analyzer 계열에서 resolve
   - [`signatureHelp.ts`](../../extension/src/signatureHelp.ts) — `identifierAt` import를 analyzer/symbols re-export 경로로 정렬; `findFunctionCall` / `findMacroCall`은 **본 Wave에서 이동 필수 아님** (call-site scan은 signature 전용; 이동 시 `signatureHelp.test.ts` export 유지)

4. **테스트**:
   - 기존 suites green (AC2, AC4); **새 behavior assertion 추가하지 않음**
   - 선택: `context/` smoke test — catalog.test.ts와 동일 fixture를 analyzer import로 한 번 더 돌리지 **않고** (중복 방지), 기존 테스트가 analyzer 구현을 간접 검증

### 구현 순서 (개발 단계 가이드)

1. `extension/src/context/` 생성; `completionContext` + `isInRecoverBody` 이동 → `catalog.ts` re-export; `npm test` (catalog).
2. `builtinAt` / `directiveAt` 이동 → `hoverTokens.ts` thin re-export (또는 hoverProvider가 context import); hover 수동 smoke optional.
3. `identifierAt` 이동 또는 context→symbols re-export; `references.ts`, `providers.ts`, `hoverProvider.ts`, `signatureHelp.ts` import 정리.
4. Provider import 정리; server / LSP compile 확인.
5. (문서 step) `ARCHITECTURE.md` Context Analyzer bullet (AC5).

---

## 비범위 (Non-goals)

- AST / tree-sitter 또는 parse tree 기반 “풍부한” context model
- 새 completion / hover / signature **동작**, catalog·`freemarkerRef` 내용 변경
- **Diagnostics** 전체와 Analyzer 통합 — **Wave 2.1 / stretch** (directive stack·comment scan은 `diagnostics.ts` + `comments.ts`에 유지)
- `findFunctionCall` / `findMacroCall` **대규모 재설계** (이동만 선택; 로직 rewrite out)
- LSP를 extension primary host로 전환
- `vim/**` 및 ftl-dev.vim
- Comment gate 로직을 Analyzer **내부로** 흡수 (provider 선행 gate 패턴 유지)

---

## 후속 Wave

| Wave | 내용 | 비고 |
|------|------|------|
| **Wave 2.1 (optional)** | diagnostics / semantic token cursor rules와 Analyzer **문서·일부 primitive** 정렬 | comment-in-string edge; directive open scan |
| **Wave 3** | parser / AST (0020 §후속) | Analyzer가 typed context를 확장하는 접점 |

---

## Acceptance criteria (testable)

- **AC1:** 공유 **Context Analyzer** 모듈(`extension/src/context/` 또는 동등)이 존재하고, completion(`completionContext` 구현), hover(`builtinAt` / `directiveAt`), signature help(`identifierAt` 경로)가 **직접 또는 catalog/hoverTokens/symbols re-export** 를 통해 analyzer 구현을 사용한다.
- **AC2:** 기존 단위 테스트가 **동일 assertion** 으로 통과한다: [`catalog.test.ts`](../../extension/src/catalog.test.ts), [`hoverImport.test.ts`](../../extension/src/hoverImport.test.ts), [`signatureHelp.test.ts`](../../extension/src/signatureHelp.test.ts), [`symbols.test.ts`](../../extension/src/symbols.test.ts) (`identifierAt`), [`reference/freemarkerRef.test.ts`](../../extension/src/reference/freemarkerRef.test.ts) (completion catalog 의존 케이스).
- **AC3:** 공개 API 호환: [`catalog.ts`](../../extension/src/catalog.ts)에서 `completionContext`, `isInRecoverBody`, `CompletionContext`, `buildCompletions` export 유지; [`server/src/server.ts`](../../server/src/server.ts) catalog import **breaking 없음**; [`hoverTokens.ts`](../../extension/src/hoverTokens.ts)에서 `builtinAt` / `directiveAt` export 유지 **또는** CHANGELOG/plan에 단일 migration 한 줄 (hoverProvider만 context import 시 re-export 권장).
- **AC4:** `cd vsix/extension && npm test` exit 0 (grammar + unit).
- **AC5:** [`vsix/ARCHITECTURE.md`](../../ARCHITECTURE.md) completions / language service 절에 **Context Analyzer** (completion + hover + shared cursor helpers) 한 단락 반영. **문서 pipeline step**에서만 갱신해도 되며, 개발 AC4 통과 후 문서 step에서 AC5 close.

---

## Scope paths (likely touched)

**Product / tests (Wave 2 개발):**

- `extension/src/context/` (신규) — `completionContext`, `isInRecoverBody`, `builtinAt`, `directiveAt`, `identifierAt` (정책에 따라 subset + re-export)
- `extension/src/catalog.ts` — context re-export; `CompletionContext` 타입 위치
- `extension/src/hoverTokens.ts` — thin re-export 또는 deprecate-in-place (empty facade)
- `extension/src/symbols.ts` — `identifierAt` re-export from context (if moved)
- `extension/src/hoverProvider.ts` — import 경로
- `extension/src/completionProvider.ts` — import 경로 (optional direct context)
- `extension/src/signatureHelp.ts` — `identifierAt` import 정렬
- `extension/src/references.ts`, `extension/src/providers.ts` — `identifierAt` import (if symbols re-export 유지 시 변경 없을 수 있음)
- `extension/src/catalog.test.ts`, `extension/src/hoverImport.test.ts`, `extension/src/signatureHelp.test.ts`, `extension/src/symbols.test.ts` — regression only (import path만 바뀔 수 있음)
- `server/src/server.ts` — compile/regression (직접 수정 없을 수 있음)

**Docs (Wave 2 또는 문서 step):**

- `docs/plans/completed/0021-context-analyzer.md` (본 문서)
- `vsix/ARCHITECTURE.md` (AC5)
- `extension/CHANGELOG.md` `[Unreleased]` (개발 ship 시)

**Explicitly out of scope:** `vim/**`, TextMate grammar, `freemarkerRef.ts` catalog 내용, `comments.ts` 로직 이동, `diagnostics.ts` context unification.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Hover vs completion **builtin/directive 불일치** (before-regex vs offset-walk) | 이동만; 이동 후 catalog + hoverTokens fixture parity; manual `<#`, `?` hover vs complete smoke |
| **`identifierAt` 이동**으로 symbols / index 순환 import | `identifierAt`만 leaf module; symbols는 index만 context 의존하지 않게 방향 고정 |
| **server/tsconfig** path — context submodule 추가 | server가 catalog pull-in 시 context 포함 확인; `npm test` + server build |
| **과도한 scope creep** (signature call scan + diagnostics) | AC1은 identifier + completion + hover; call-site move는 optional; diagnostics → Wave 2.1 |

---

## Test plan

From `vsix/extension/`:

```bash
npm test
```

필수: `test:unit` — catalog, hoverImport, signatureHelp, symbols (`identifierAt`), freemarkerRef.  
선택 manual: fixtures에서 `?`, `<#`, `.error`, `ns.` completion vs hover on same token (0004 / 0005와 동일).

---

## Wave 2 한 줄 정의

**completion·hover·signature가 쓰는 커서 문맥 probing(`completionContext`, `builtinAt`/`directiveAt`, 공유 `identifierAt`)을 `context/` Analyzer로 모으고 catalog·hoverTokens·symbols thin re-export와 기존 테스트 parity를 유지하는 behavior-preserving structural unify.**
