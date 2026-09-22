# 플랜: Apache FreeMarker 레퍼런스 → 자동완성

> Canonical: [0007-apache-reference-completions.md](0007-apache-reference-completions.md) (English).

- Status: completed
- Started: 2026-09-22
- Completed: 2026-09-22

## Goal

Apache FreeMarker 매뉴얼의 built-in/디렉티브 설명을 가져와 Ctrl+Space 문서창·Hover에 표시 (`has_content` 사용법 등).

## Where

[`extension/src/reference/freemarkerRef.ts`](../../../extension/src/reference/freemarkerRef.ts)
