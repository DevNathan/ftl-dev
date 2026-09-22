# ADR 0001: CodeOSS 언어 지원 스택

> Canonical: [0001-codeoss-language-stack.md](0001-codeoss-language-stack.md) (English). This file is a Korean summary.

- Status: Accepted (direction)
- Date: 2026-09-22

## Context

CodeOSS 계열에서 FTL 하이라이팅, go-to(크로스파일 import/경로), 완성, 디렉티브 닫기, FTL형 들여쓰기가 필요합니다. CodeOSS는 TextMate/language-configuration → 프로그램 provider → LSP 계층으로 언어 기능을 제공합니다. 기존 마켓 익스텐션만으로는 “스크립트 IDE” 품질에 미달합니다.

## Decision

**계층형 CodeOSS 익스텐션**: TextMate(+ language config)로 빠른 어휘 하이라이팅·기본 pairs/indent → 언어 서비스(가급적 LSP)로 정의·완성·링크·semantic tokens·정교한 close/indent → 클라이언트가 UX·패키징.

Java bean 보강은 선택·best-effort. 핵심 FTL은 Java LS 없이 동작해야 함.

## Consequences

구현 순서: grammar → symbols/definition/links → completions → semantic tokens → close/indent 다듬기. 파서 선택은 후속 ADR.
