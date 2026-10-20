# 0020 - Completion Provider 분리 (도입보고서)

Status: **completed**  
Started: 2026-10-20  
Completed: 2026-10-20  
Repo: `vsix/` only — never touch `vim/`.

Related: [0004-completions.md](0004-completions.md), [0007-apache-reference-completions.md](0007-apache-reference-completions.md), [0005-hover-import-completions.md](0005-hover-import-completions.md).

---

## 요약

아키텍처 평가 결론을 **Wave 1 실행 계획**으로 고정한다. vsix 완성(completion) 경로는 TextMate + in-process language service + 심볼 인덱스(정규식/스캐너)이며 **AST 없음**; LSP는 [`server/`](../../server/) 스캐폴드만 존재한다. 문맥 판별(`completionContext`)과 후보 생성(`buildCompletions`)은 이미 함수 수준에서 분리되어 있으나, IDE 문헌이 권하는 **복수 CompletionProvider + Engine** / 공통 Context Analyzer는 없다. Wave 1은 **동작 보존(behavior-preserving) 리팩터**로 catalog 쪽 모놀리식 `buildCompletions`를 pluggable Provider + thin CompletionEngine으로 쪼개 후속 Wave(공통 Analyzer, 선택적 parser)의 접점을 만든다.

---

## 배경 / 문제

### 현재 완성 구조

- VS Code host: [`extension/src/completionProvider.ts`](../../extension/src/completionProvider.ts)가 문서·캐시·심볼 목록을 준비한 뒤 [`catalog.ts`](../../extension/src/catalog.ts)의 `completionContext(before)` → `buildCompletions(ctx, symbols)`를 호출한다.
- LSP scaffold: [`server/src/server.ts`](../../server/src/server.ts)도 동일 catalog API를 import하여 completion handler가 같은 `completionContext` / `buildCompletions` 경로를 탄다.
- 후보 데이터: directive / built-in / special variable 목록과 Apache Manual paraphrase는 catalog + [`reference/freemarkerRef.ts`](../../extension/src/reference/freemarkerRef.ts)에 공유된다.

### 한계

| 영역 | 설명 |
|------|------|
| **모놀리식 후보 생성** | `buildCompletions` 한 함수가 `CompletionContext.type`별 분기(directive, builtin, special, ns, general)를 모두 소유한다. 새 문맥·후보 종류 추가 시 단일 파일이 계속 비대해진다. |
| **문맥 깊이** | `completionContext`는 커서 앞 텍스트의 정규식/휴리스틱으로 5종 `CompletionContext`를 산출한다(`isInRecoverBody` 등). hover / signature help / diagnostics와 **공유 Analyzer**가 없어 유사 규칙이 다른 모듈에 중복될 여지가 있다. |
| **확장성** | IDE 표준 패턴(Engine이 등록된 Provider를 `supports` → `provide`로 순회)이 없어 “Provider 단위 테스트·교체·순서 정책”을 코드 구조로 표현하기 어렵다. |
| **장기 기술 부채** | AST/tree-sitter 없이도 Wave 1은 가능하지만, Parser 도입 시 후보 생성만 Provider 단위로 옮기면 Engine 경계는 유지할 수 있다 — 지금은 그 경계가 함수 내부 `if` 체인에 묻혀 있다. |

Wave 1은 **사용자 가시 동작·카탈로그 내용을 바꾸지 않고** 구조만 IDE 친화적으로 정렬한다.

---

## 참조 설계 (IDE 표준 패턴)

일반적인 in-process / LSP completion 스택:

```text
Text before cursor
       │
       ▼
Context 판별 (Analyzer) ──► CompletionContext (typed union)
       │
       ▼
CompletionEngine
       │  for each registered CompletionProvider (ordered):
       │    if provider.supports(ctx): merge provider.provide(ctx, env)
       ▼
CompletionCandidate[]  ──► VS Code CompletionItem / LSP CompletionItem
```

원칙:

1. **Context 판별 → Provider 후보**: Context는 “어떤 Provider가 관여할 수 있는가”를 결정; Wave 1에서는 기존 `completionContext()` 출력을 그대로 사용한다.
2. **Engine + Providers**: Engine은 등록·순회·결합만 담당; 각 Provider는 한 종류의 후보(directive, builtin, …)에 집중한다.
3. **TextMate vs semantic 유지**: Lexical highlight는 TextMate grammar; completion은 language service(인덱스·import·catalog) — [ARCHITECTURE.md](../../ARCHITECTURE.md)의 계층 분리를 깨지 않는다.

---

## 현황 요약 (feature / architecture snapshot)

| 항목 | 위치 / 메모 |
|------|-------------|
| Context 타입 | `CompletionContext`: `directive` \| `builtin` \| `special` \| `ns` \| `general` — [`catalog.ts`](../../extension/src/catalog.ts) |
| Context API | `completionContext(before: string)` — 동일 파일, export 유지 (Wave 1 AC) |
| 후보 생성 | `buildCompletions(ctx, symbols?)` — type별 단일 함수 내 분기 (~100+ LOC) |
| Host adapter | `FtlCompletionProvider` — doc cache, import ns, `CompletionItem` 매핑 — [`completionProvider.ts`](../../extension/src/completionProvider.ts) |
| LSP | `server/src/server.ts` — catalog import, 동일 build path |
| 테스트 | [`catalog.test.ts`](../../extension/src/catalog.test.ts), [`hoverImport.test.ts`](../../extension/src/hoverImport.test.ts), [`reference/freemarkerRef.test.ts`](../../extension/src/reference/freemarkerRef.test.ts) |
| 아키텍처 문서 | [`vsix/ARCHITECTURE.md`](../../ARCHITECTURE.md) — TextMate + language service, parser undecided, LSP optional |

**스택 사실 (평가 결론 인코딩):**

- AST 없음; 심볼 인덱스는 스캐너/정규식 기반.
- LSP는 server/ 스캐폴드; Wave 1에서 VS Code extension host를 LSP로 전환하지 않음.
- Completion은 catalog 레벨에서 context↔candidates가 **부분 분리**; Provider/Engine **모듈 경계**는 미구현.

---

## 도입 범위 (Wave 1 = this plan)

**Behavior-preserving refactor only.**

### 목표 구조

1. **CompletionProvider** (pluggable, one concern each):
   - `DirectiveCompletionProvider` — `ctx.type === "directive"`
   - `BuiltinCompletionProvider` — `builtin`
   - `SpecialVarCompletionProvider` — `special` (+ recover / `.error` 필터)
   - `NsCompletionProvider` — `ns` (import namespace member)
   - `GeneralSymbolCompletionProvider` — `general` (symbols + prefix-matched `#directive` insert)

2. **CompletionEngine** (thin):
   - 고정 순서로 Provider registry 순회
   - `supports(ctx): boolean` → `provide(ctx, env): CompletionCandidate[]`
   - `env`: symbols / catalog refs 등 Provider 공통 입력 (기존 `buildCompletions` 두 번째 인자와 동등)

3. **API 호환**:
   - `completionContext()` 시그니처·의미 유지 — [`completionProvider.ts`](../../extension/src/completionProvider.ts), [`server/src/server.ts`](../../server/src/server.ts) 및 기존 테스트 import 경로 깨지지 않게.
   - `buildCompletions(ctx, symbols)`는 Engine 위임의 **thin wrapper**로 남기거나, export는 유지하고 내부 구현만 Engine 호출로 교체 (breaking change 없음).

4. **테스트**:
   - 기존 catalog / hoverImport / freemarkerRef 단위 테스트 **전부 통과** (AC2).
   - 선택: Provider `supports` 매트릭스, registry 순서, Engine이 빈/단일 Provider만 등록해도 동작하는 smoke test 추가.

### 구현 순서 (개발 단계 가이드)

1. Provider 인터페이스 + Engine + default registry (기존 `buildCompletions` 로직을 Provider별로 **이동**, 로직 diff 최소화).
2. `buildCompletions` → Engine delegate; `catalog.test.ts` green 확인.
3. `completionProvider.ts` / `server.ts` — import 변경 없이 동작 확인 (wrapper 유지 시).
4. (선택) `completionEngine.test.ts` 또는 `catalog.test.ts`에 registration 테스트 추가.

---

## 비범위 (Non-goals for Wave 1)

- AST / tree-sitter 통합 또는 parse tree 기반 completion
- LSP를 VS Code extension host의 primary completion 경로로 **연결** (server scaffold는 catalog API만 계속 사용)
- 새 completion behavior, catalog 항목 추가, trigger character 정책 변경
- hover / signature help / diagnostics와 **공유 Context Analyzer** (→ Wave 2)
- `vim/` 또는 ftl-dev.vim 저장소 변경
- Semantic token / diagnostics / outline 동작 변경

---

## 후속 Wave

| Wave | 내용 | 비고 |
|------|------|------|
| **Wave 2** | 공통 **Context Analyzer** — completion / hover / signature help (및 필요 시 diagnostics)가 동일 “커서 문맥” 모델 공유 | `completionContext`를 Analyzer의 completion-facing API로 흡수하거나 thin re-export |
| **Wave 3** | 필요 시 tree-sitter 또는 기타 **parser / AST** — undecided ADR follow-up | Provider 경계가 있으면 semantic completion Provider 추가·교체 용이 |

---

## Acceptance criteria (testable)

- **AC1:** `CompletionEngine`이 등록된 Provider 목록을 순회하며 `supports(ctx)`가 true인 Provider만 `provide(ctx, env)`를 호출하고 결과를 결합한다. `buildCompletions`는 Engine에 위임하거나 동등한 thin wrapper이다.
- **AC2:** 기존 catalog 관련 단위 테스트(`catalog.test.ts`, `hoverImport.test.ts`, `freemarkerRef.test.ts`의 `buildCompletions`/`completionContext` 의존 케이스)가 **리팩터 전과 동일한 후보**를 검증한다 (behavior parity).
- **AC3:** [`completionProvider.ts`](../../extension/src/completionProvider.ts) 및 [`server/src/server.ts`](../../server/src/server.ts) completion 경로가 **공개 API breaking 없이** 동작한다. import 경로 변경이 필요하면 CHANGELOG/plan에 **minimal migration** 한 줄로 문서화한다.
- **AC4:** `cd vsix/extension && npm test` exit 0 (grammar + unit).
- **AC5:** [`vsix/ARCHITECTURE.md`](../../ARCHITECTURE.md) 또는 [`docs/product/requirements-status.md`](../../product/requirements-status.md)에 completion **Provider + Engine** 패턴을 짧게 반영한다. **문서 단계(문서 pipeline)**에서만 갱신해도 되며, 그 경우 개발 AC4 통과 후 문서 step에서 AC5를 close한다.

---

## Scope paths (likely touched)

**Product / tests (Wave 1 개발):**

- `extension/src/catalog.ts` — `buildCompletions` thin wrapper; Provider/Engine export 또는 re-export 정책
- `extension/src/completion/` (신규 디렉터리 가칭) — `CompletionEngine.ts`, `CompletionProvider.ts` (interface), `*CompletionProvider.ts` (5종)
- `extension/src/completionProvider.ts` — 변경 없거나 import만 (wrapper 유지 시)
- `extension/src/catalog.test.ts` — parity 유지; optional Engine/Provider tests
- `extension/src/hoverImport.test.ts`, `extension/src/reference/freemarkerRef.test.ts` — regression only
- `server/src/server.ts` — catalog API 호환 확인 (직접 수정 없을 수 있음)

**Docs (Wave 1 또는 문서 step):**

- `docs/plans/completed/0020-completion-provider-split.md` (본 문서)
- `vsix/ARCHITECTURE.md` and/or `docs/product/requirements-status.md` (AC5)
- `extension/CHANGELOG.md` `[Unreleased]` (개발 ship 시)

**Explicitly out of scope:** `vim/**`, TextMate grammar, `freemarkerRef.ts` catalog 내용 변경 (unless typo).

---

## Risks

| Risk | Mitigation |
|------|------------|
| 리팩터 중 **의도치 않은 behavior change** (필터 순서, `#` prefix general merge, `.error` recover, `asFunctionCall` snippet) | AC2 테스트 전면 green; Provider 이동 시 로직 copy-paste 후 diff review; general+directive 교차 후보 `seen` Set 동작 보존 |
| Provider **순서** 변경으로 duplicate / shadowing | Wave 1은 단일 Provider가 ctx.type당 하나만 `supports` true가 되도록 설계; Engine merge 정책을 기존 단일 분기와 1:1 대응 |
| API surface 팽창 | `completionContext` / `buildCompletions` public export 유지; Engine/Provider는 catalog 내부 또는 `completion/` submodule |
| server/extension **이중 compile** | server tsconfig가 catalog를 pull-in — catalog 내부 파일 추가 시 server build 포함 확인 |

---

## Test plan

From `vsix/extension/`:

```bash
npm test
```

필수: `test:unit` 내 catalog / hoverImport / freemarkerRef suites.  
선택 manual: fixtures에서 `<#`, `?`, `.`, `ns.` completion smoke (0004와 동일).

---

## Wave 1 한 줄 정의

**기존 `buildCompletions` 분기를 directive / builtin / special / ns / general CompletionProvider + thin CompletionEngine으로 추출하고, `completionContext`·`buildCompletions` 공개 API와 모든 catalog 테스트 parity를 유지하는 behavior-preserving refactor.**
