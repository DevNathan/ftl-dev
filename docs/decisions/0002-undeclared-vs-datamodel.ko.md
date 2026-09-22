# ADR 0002: 미선언 식별자 vs 데이터 모델 변수

> Canonical: [0002-undeclared-vs-datamodel.md](0002-undeclared-vs-datamodel.md) (English).

- Status: Accepted
- Date: 2026-09-22

## Context

`userService`, `request`, `ctx`처럼 **Java 호스트가 데이터 모델로 주입**하는 값은 `.ftl`에 `#assign`되지 않는 경우가 많다. 미선언=오류로 치면 일반 앱 템플릿이 오탐으로 가득 찬다.

## Decision

- **A. 문법/구조** — 기본 ON (에러): 태그/`#list` 형태, dangling `?` 등
- **B. 이름 해석** — 기본 OFF. `ftl-dev.strictVariables` + `ftl-dev.dataModel` / `.ftl-data-model.json`으로 외부 이름 허용

Java LS 없이도 호스트 주입 이름을 오류로 만들지 않는다.
