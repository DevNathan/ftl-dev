<p align="center">
  <a href="https://devnathan.github.io/ftl-dev/"><img src="site/assets/banner.svg" alt="ftl-dev 2.0: FreeMarker language support" width="100%"></a>
</p>

<p align="center">

[![Latest GitHub Release](https://img.shields.io/github/v/release/DevNathan/ftl-dev?label=GitHub%20Release&color=0050b2)](https://github.com/DevNathan/ftl-dev/releases)
[![License](https://img.shields.io/badge/license-Apache--2.0-0a8f6c)](LICENSE)

</p>

# FTL-dev

> [!TIP]
> **2.0 변경 사항:** import와 include 경로에서 대상 파일의 ftldoc을 볼 수 있습니다. 비교 연산자 표시 설정은 제거했습니다.
> [프로젝트 페이지](https://devnathan.github.io/ftl-dev/) · [변경 이력](extension/CHANGELOG.md)

> Canonical: [README.md](README.md) (English).

## 소개

FreeMarker(이하 ftl)가 개발 언어로 쓰일 수 있다는 사실, 알고 계셨나요? ftl은 빛보다 빠른 언어로(다소 많이 과장됨), 일반적인 개발 언어들보다는 확장성이 부족하지만 그렇다고 불충분하진 않습니다! 다만 어찌 됐건 사람들은 ftl을 잘 안 쓰는지, 쓸 만한 올인원 익스텐션은 없더군요.

그래서 만들었습니다. 이 익스텐션만 있으면 ftl로 개발하는 일이 좀 더 편해질 겁니다!

## 왜 쓰는가 / 무엇을 해결하는가

기존 ftl 익스텐션들은 부족한 점이 많습니다.

- 거지같이 보기 어렵거나 부적절한 신택스 하이라이팅
- 변수·함수 바로가기가 없어서 파일을 일일이 뒤져야 함
- 신택스 에러를 제대로 안 잡아 줌
- ftl 정석 문법을 따르지 않는 자동 들여쓰기

왜 이런 거지같은 것들을 지원 안 하는 걸까요? 아마 ftl을 안 써서겠죠 뭐.
불편하면 우물을 직접 파야죠! 이 익스텐션은 다음을 목표로 합니다.

- 적절한 신택스 하이라이팅으로 눈깔이 빠지지 않을 정도의 가독성
- Ctrl+클릭으로 변수·함수 선언부로 바로가기
- 고장 나기 전에 문법 오류를 잡아내기
- ftl 정석을 따르게 하는 자동 들여쓰기

## 주요 기능

- 신택스 하이라이팅 (`<#assign sql…>` 캡처 블록이나 `<#-- @lang sql -->` 표시 블록 안의 SQL 포함)
- 정의·import·경로로 이동·탐색
- 자동완성
- 디렉티브 닫기 · FTL식 들여쓰기
- 진단 · 시맨틱 토큰 · 아웃라인 · 참조 찾기

## 설치

- [Open VSX](https://open-vsx.org/extension/nathan-0910/ftl-dev)를 쓰는 CodeOSS 계열 편집기에서는 확장 탭에서 `nathan-0910.ftl-dev`를 검색하세요.
- 직접 설치하려면 [GitHub Releases](https://github.com/DevNathan/ftl-dev/releases)에서 VSIX를 내려받아 **Install from VSIX…**를 선택하세요.
- Microsoft VS Code의 Visual Studio Marketplace에서는 ftl-dev를 제공하지 않습니다.

로컬 빌드는 `cd extension && npm run package`를 실행한 뒤 **Install from VSIX…**를 사용하세요.

[변경 이력은 여기서](extension/CHANGELOG.md).
영문은 제가 관리합니다만, 영어 다들 잘하시잖아요 그죠? :)

## 코딩 에이전트용 스킬

### FTL 작성

작업할 프로젝트의 터미널에서 [FTL 작성 스킬](skills/ftl-writing/SKILL.md)을 설치하세요.

```sh
npx skills add https://github.com/DevNathan/ftl-dev --skill ftl-writing
```

대괄호 슬라이스와 해시 조회를 언제 쓸지, 코드를 언제 매크로·함수·파일로 나눌지 영어로 안내합니다. 에디터 확장과 별도로 설치할 수 있습니다.

### ftldoc

[ftldoc 스킬](skills/ftldoc/SKILL.md)은 ftl-dev가 에디터에서 보여 주는 파일 설명과 매크로·함수 주석 작성법을 영어로 안내합니다.

```sh
npx skills add https://github.com/DevNathan/ftl-dev --skill ftldoc
```

## 개발 (로컬)

```bash
cd extension && npm install && npm run compile
npm test
npm run package          # → ftl-dev-*.vsix
```

하고 나서 `Reload Window` 하는 거 잊지 마세요. fixture는 [`tests/fixtures/navigation/main.ftl`](tests/fixtures/navigation/main.ftl), 아니면 **F5**.

## 라이선스

이 프로젝트는 [Apache License 2.0](LICENSE) 아래에 있습니다.
마음껏 쓰되 [NOTICE](NOTICE)는 유지하고, 프로젝트 링크도 남겨 주세요: https://github.com/DevNathan/ftl-dev
