# 확장 버저닝

정식 버전은 `extension/package.json`의 `version`이다. 태그는 버전과 일치해야 한다. 예를 들어 `1.0.3` 버전은 `v1.0.3` 태그를 쓴다.

관련 문서: [릴리스 절차](publishing.md), [정식 버저닝 안내](versioning.md).

## 버전 규칙

| 올림 | 기준 |
|------|------|
| PATCH | 버그 수정, 패키징 문서 수정, 작은 UX 변경 |
| MINOR | 기존 FTL 편집 동작을 깨지 않는 사용자 기능 추가 |
| MAJOR | 사용자가 알아야 하는 호환성 파괴 변경 |

## 안정성 약속 (1.0.0부터)

다음 공개 API는 MAJOR 버전에서만 변경한다.

- 확장 ID `nathan-0910.ftl-dev`, 언어 ID `freemarker` / `.ftl` `.ftlh` `.ftlx`, 문법 scope `text.html.freemarker`
- 설정 키 `ftl-dev.strictVariables`, `ftl-dev.dataModel`, `ftl-dev.ftldoc.validateParams`
- 프로젝트 파일 `.ftl-data-model.json` (`roots`, `templates`), 아이콘 테마 ID `ftl-dev-icons`

## 릴리스 준비

1. `extension/package.json` 버전을 올린다.
2. `extension/CHANGELOG.md`를 해당 버전과 날짜로 갱신한다.
3. `main`에 커밋하고 push한다.
4. 버전과 일치하는 `vX.Y.Z` 태그를 push한다. GitHub Actions가 검사하고 VSIX를 빌드해 GitHub Release에 첨부한 뒤 Open VSX에도 게시한다.

브랜치 push는 CI만 실행하며 VSIX 릴리스를 만들지 않는다. WIP 커밋에서는 버전을 올리지 않고, 배포 준비 때 올린다.
