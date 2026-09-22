# Architecture

> Canonical: [ARCHITECTURE.md](ARCHITECTURE.md) (English). This file is a Korean summary.

방향: [docs/decisions/0001-codeoss-language-stack.md](docs/decisions/0001-codeoss-language-stack.md). 제품: [docs/product/vision.md](docs/product/vision.md).

## Overview

FreeMarker를 **스크립트 언어**로 다루는 CodeOSS 익스텐션. TextMate + in-process Definition/DocumentLink (풀 LSP는 이후).

## Testing

| 모드 | 방법 |
|------|------|
| 수동 | F5 / Reload → fixtures (하이라이트, go-to, 완성) |
| Grammar | `npm run test:grammar` |
| Unit | `npm run test:unit` |

레퍼런스(Ctrl+Space/Hover): `extension/src/reference/freemarkerRef.ts` (Apache Manual 요약).

## Open questions

파서 기술, LSP 이전 시점, Java 연동, `<>` vs `[]` 우선순위.
