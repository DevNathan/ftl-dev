[English README](README.md)

# ftl-dev

CodeOSS 계열 편집기용 FreeMarker 확장입니다. 매크로 호출에서 정의로 이동하고, 편집 중 FTL 블록 오류를 확인하고, import 경로에서 대상 파일의 ftldoc을 읽을 수 있습니다.

[프로젝트 사이트](https://devnathan.github.io/ftl-dev/) · [GitHub Releases](https://github.com/DevNathan/ftl-dev/releases) · [변경 이력](extension/CHANGELOG.md)

## 설치

1. **Open VSX를 쓰는 CodeOSS 계열 편집기:** 확장 탭에서 [FreeMarker (ftl-dev)](https://open-vsx.org/extension/nathan-0910/ftl-dev) 또는 `nathan-0910.ftl-dev`를 검색하세요.
2. **직접 설치:** [GitHub Releases](https://github.com/DevNathan/ftl-dev/releases)에서 VSIX를 내려받고 편집기에서 **Install from VSIX…**를 선택하세요.

Microsoft VS Code의 Visual Studio Marketplace에서는 제공하지 않습니다. Vim과 Neovim에서는 [ftl-dev.vim](https://github.com/DevNathan/ftl-dev.vim)을 사용하세요.

## 주요 기능

- **코드 읽기.** HTML 안의 FTL과 FTL 캡처 블록 안의 SQL을 강조합니다. import 경로를 따라가거나, 참조를 찾고, 심볼 이름을 바꿀 수 있습니다.
- **블록 편집.** 자동완성, 인자 힌트, 태그 자동 닫기를 지원합니다. 잘못된 지시문과 블록 구조는 편집 중에 표시합니다.
- **호출 위치에서 문서 보기.** 매크로나 함수에 마우스를 올리면 ftldoc이, import나 include 경로에 올리면 대상 파일의 설명이 나옵니다.

## 코딩 에이전트용 스킬

작업할 프로젝트 폴더에서 원하는 스킬의 설치 명령을 실행하세요. 스킬 본문은 영어입니다.

### [FTL 작성](skills/ftl-writing/SKILL.md)

읽기 쉬운 표현식을 고르고 템플릿을 매크로, 함수, 파일로 나누는 기준을 안내합니다.

```sh
npx skills add https://github.com/DevNathan/ftl-dev --skill ftl-writing
```

### [ftldoc](skills/ftldoc/SKILL.md)

편집기에서 볼 파일 설명과 매크로·함수 주석을 작성하는 법을 안내합니다.

```sh
npx skills add https://github.com/DevNathan/ftl-dev --skill ftldoc
```

## 개발

[로컬 설정과 수동 확인](docs/development.md) · [문서 목록](docs/index.ko.md) · [아키텍처](ARCHITECTURE.ko.md)

## 라이선스

[Apache-2.0](LICENSE). [NOTICE](NOTICE)를 참고하세요.

<sub>프로젝트의 개발과 유지보수는 모두 AI 에이전트가 담당합니다.</sub>
