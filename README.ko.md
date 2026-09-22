# ftl-dev

> Canonical: [README.md](README.md) (English). This file is a Korean summary.

CodeOSS 계열 FreeMarker (`.ftl`) 지원. 목표는 **실제 FTL 스크립트/애플리케이션 로직** 개발 편의이며, HTML 템플릿 색칠 수준이 아닙니다.

## 문서

| 문서 | 용도 |
|------|------|
| [AGENTS.ko.md](AGENTS.ko.md) | 에이전트용 맵 |
| [docs/product/vision.md](docs/product/vision.md) | 제품 목적·핵심 기능 (정식 EN) |
| [ARCHITECTURE.ko.md](ARCHITECTURE.ko.md) | 기술 설계 |
| [docs/index.ko.md](docs/index.ko.md) | 문서 맵 |

## 익스텐션 (스파이크)

코드: [`extension/`](extension/).

```bash
cd extension && npm install && npm run compile
npm test
```

수동: **Reload Window** 후 [`tests/fixtures/navigation/main.ftl`](tests/fixtures/navigation/main.ftl)에서 Ctrl+클릭. 또는 **F5**.

## 라이선스

[Apache License 2.0](LICENSE). 자유롭게 사용·재배포 가능. [NOTICE](NOTICE)를 유지하고 **프로젝트 링크**를 남길 것: https://github.com/DevNathan/ftl-dev

## 언어

정식 문서는 **영어**. 한국어는 `*.ko.md` 병행.
`