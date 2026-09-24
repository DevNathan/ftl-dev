# 확장 버저닝

> Canonical: [versioning.md](versioning.md) (English).

ftl-dev의 정식 버전은 **`extension/package.json` → `"version"`** 이다.

Open VSX / VS Marketplace는 같은 `publisher.name` + `version` 재배포를 거절하거나 무시한다. **배포할 때마다 새 버전**이 필요하다.

관련: [publishing.md](publishing.md).

## 규칙 (semver)

`MAJOR.MINOR.PATCH` (초기에는 `0.0.x`):

| 올림 | 때 |
|------|-----|
| **PATCH** | 버그·소규모 UX·배포용 패키징 수정 |
| **MINOR** | 사용자에게 보이는 기능 추가 (호환 유지) |
| **MAJOR** | 깨지는 변경 |

README·태그 버전은 `package.json` 과 같게. 태그 예: `v0.0.12`.

## 언제 올리는가

배포할 트리에 실릴 변경이 있을 때. WIP만 커밋할 때는 올리지 말고, **배포 준비 커밋**에서 올린다.

## 필수: 배포 직전 커밋

**배포 직전(마지막) 커밋은 반드시 이전에 올린 적 없는 신버전이어야 한다.**

1. 레지스트리에 이미 있는 최신 버전 확인  
2. `extension/package.json` 을 **그보다 높은** 값으로 수정  
3. 그 버전 범프를 배포용 코드와 함께(또는 그 위 마지막 커밋으로) 커밋  
4. `main` push만으로는 마켓에 안 올라감. **반드시** `vX.Y.Z` 태그를 만들어 push (`git tag -a v0.0.12 && git push origin v0.0.12`)

이미 `0.0.11` 이 올라가 있으면 같은 `0.0.11` 로 다시 올리지 않는다. 새 마켓 버전 = 새 태그.

## 올리지 않아도 되는 경우

로컬 테스트·F5, **VSIX로 안 나가는** 문서만 수정. 나중에 VSIX에 실리면 그때 올린 버전에 포함된다.
