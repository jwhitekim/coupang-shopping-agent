# 스냅샷 기반 데모로 전환 (2026-08-21 결정)

## 배경

`CLAUDE.md`에 기록된 대로 결제 자동화(로그인 단계 Akamai 차단)에 이어 검색·조회까지
막혀있다는 게 확인됐다(2026-08-12). 이 두 차단은 개별 사이트의 일시적 문제가 아니라, 대형
이커머스가 외부 AI 에이전트에 카탈로그 접근을 열어줄 유인이 없다는 것을 보여주는 일관된 신호로
본다 — 결제와 검색이라는 서로 다른 두 지점에서 각각 독립적으로 같은 결론(외부 에이전트 배제)에
도달했기 때문이다.

## 결정: 스냅샷 기반 데모 (스코프 축소도, 보류도 아님)

- 라이브 검색/조회는 포기하되, 지금까지 설계한 에이전트 판단 로직(요구사항 구조화, 후보 비교,
  팩트체크, 안전 원칙)은 그대로 유지한다.
- `search_products`/`inspect_product`가 라이브 스크래핑 대신 **사용자가 직접 브라우저로 저장한
  상품 스냅샷**을 조회하도록 바꾼다.
- 스냅샷은 5~10개 상품 수준의 소량으로, 사람이 쿠팡에 직접 접속해 캡처(텍스트 복사, 스크린샷,
  저장 HTML)한 것만 쓴다. Playwright나 다른 자동화로 수집하지 않는다 — "왜 결제/로그인 자동화가
  없는가"(`CLAUDE.md`)와 같은 이유(Akamai 봇 탐지 우회 금지)다.
- 데모/문서에는 "이 데이터는 실시간이 아니라 특정 시점에 수동으로 저장한 스냅샷"이라는 점과,
  왜 라이브 연동이 안 되는지(Akamai 차단, API 미개방)를 명시한다 — 라이브처럼 보이게 포장하지
  않는다.

## 구현 (2026-08-21)

- 저장 형식/위치: `packages/snapshot-adapter/data/snapshots/<product-id>.json`, 스키마는
  `@coupang-agent/shared`의 `ProductDetail`(리뷰/설명/스펙/`capturedAt` 필드 추가). 상세는
  [snapshot-adapter/README.md](../packages/snapshot-adapter/README.md).
- `packages/coupang-browser-adapter`는 교체하지 않고 그대로 둔다(과거 설계 기록). 새 패키지
  `packages/snapshot-adapter`를 만들어 같은 인터페이스(`searchProducts`/`inspectProduct`)로
  드롭인 대체했다. `apps/telegram-bot/src/runtime.ts`가 이제 이걸 쓴다.
- `packages/agent`의 `inspect_product` 응답에 `description`/`specs`/`rating`/`reviewCount`/
  `reviewHighlights`/`capturedAt`을 추가로 전달하도록 바꿨다 — 예전 스키마(`options`/
  `deliveryEstimate`만)로는 리뷰 해석·팩트체크 케이스를 모델이 볼 수 없었다.

## 아직 정하지 않은 것

- 스냅샷 개수·카테고리 — 캡처하면서 정하기로 함 (5개, 판단 유형별 구성 권장안은
  [snapshot-adapter/README.md](../packages/snapshot-adapter/README.md) 참고)

## 폐기한 대안

- **API가 열려있는 다른 커머스로 전환**: 원래 동기("쿠팡에서 실제로 쓸 수 있는 봇")가 약해져서
  보류.
- **프로젝트 보류**: 지금까지 쌓은 ACI/정책 엔진/안전 원칙 설계 자산이 사장되어 손해가 큼.
