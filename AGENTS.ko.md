# Agents

> Canonical: [AGENTS.md](AGENTS.md) (English). This file is a Korean summary.

**ftl-dev** 에이전트용 짧은 맵입니다. 상세는 `docs/`에 두고, 이 파일을 백과사전처럼 키우지 않습니다.

## 목적 (한 줄)

CodeOSS용 FreeMarker 도구 — **HTML 생성만이 아니라 FTL 스크립트/로직 개발**. 상세: [docs/product/vision.md](docs/product/vision.md).

## 읽기 순서

1. 이 맵  
2. [docs/product/vision.md](docs/product/vision.md)  
3. [ARCHITECTURE.md](ARCHITECTURE.md)  
4. [docs/index.md](docs/index.md) → 관련 `plans/active/`, `decisions/`

## 문서 맵

Vim 런타임은 **별도 git** ([ftl-dev.vim](https://github.com/DevNathan/ftl-dev.vim)). 이 저장소(VSIX)에 `vim/`을 두지 않습니다.

| 경로 | 내용 |
|------|------|
| [extension/](extension/) | CodeOSS 익스텐션 (grammar 스파이크) |
| [server/](server/) | 선택적 LSP (stdio) |
| [docs/product/](docs/product/) | 왜 만드는지, 기능 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 익스텐션 구조 |
| [docs/decisions/](docs/decisions/) | ADR |
| [docs/plans/active/](docs/plans/active/) | 진행 중 |
| [docs/plans/completed/](docs/plans/completed/) | 완료 |
| [tests/](tests/) | 픽스처(`fixtures/`) + grammar 테스트(`grammar/`) |

## 운영 원칙

- 프로젝트 지식은 **저장소 문서**로 관리.
- 중요 기술 결정 → `docs/decisions/`.
- 진행 중 → `docs/plans/active/`; 완료 시 → `docs/plans/completed/`.
- 흩어진 메모보다 기존 플랜/ADR 갱신.
- 문서에 없는 아키텍처를 발명하지 말고, 남을 선택은 decision으로 제안.

## 언어

- 정식 문서: **영어**.
- 한국어: `*.ko.md` 병행.
- 채팅은 한국어 가능; 남는 문서는 요청 없으면 영어.

## 개발

루트 `package.json`은 없다. Node 18+ (CI는 20).

```bash
npm ci --prefix extension
npm ci --prefix server
npm test --prefix extension
npx tsc -p server --noEmit
```

`extension/`의 `npm run check:terms`는 금지어 목록이 없으면 0으로 끝난다. 컴파일 후 `npm start --prefix server`가 stdio 언어 서버다. `tree-sitter-freemarker/`는 선택이며 CI에 없다.

## 제약

- active plan이 있으면 그에 맞춤.
- `AGENTS.md`는 짧게; 깊이는 `docs/`.
