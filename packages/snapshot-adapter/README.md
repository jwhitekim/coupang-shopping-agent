# snapshot-adapter

라이브 검색/조회(Akamai 차단, API 미개방)를 대신해 `data/snapshots/*.json`을 읽는 어댑터.
배경은 [docs/snapshot-mode.md](../../docs/snapshot-mode.md) 참고.

## 규칙

**`data/snapshots/`에는 사람이 쿠팡에 직접 접속해 수동으로 캡처한 데이터만 넣는다.**
Playwright 등 자동화로 채우지 않는다 — 라이브 스크래핑이 막힌 이유(Akamai 봇 탐지 우회 금지)와
동일한 원칙이다.

## 파일당 상품 하나: `data/snapshots/<product-id>.json`

`@coupang-agent/shared`의 `ProductDetail`을 그대로 따른다.

```json
{
  "productId": "example-001",
  "vendorItemId": "12345",
  "name": "상품명",
  "price": 39000,
  "url": "https://www.coupang.com/vp/products/...",
  "isRocket": true,
  "options": [{ "vendorItemId": "12345", "name": "블랙" }],
  "deliveryEstimate": "내일(수) 도착 보장",
  "description": "상품 상세 페이지에 적힌 설명 원문 (팩트체크 대상 — 요약하지 말고 그대로 옮길 것)",
  "specs": { "배터리": "24시간", "방수등급": "IPX4" },
  "rating": 4.5,
  "reviewCount": 1200,
  "reviewHighlights": ["장착이 헐겁다는 리뷰 다수", "배송 빠름"],
  "capturedAt": "2026-08-21"
}
```

- `description`은 요약하지 말고 원문을 그대로 옮긴다 — 에이전트가 직접 팩트체크하도록.
- `capturedAt`은 필수로 채운다. 에이전트가 사용자에게 "이 정보는 언제 기준"이라고 밝히는 데 쓴다.
- `search_products`는 `name`+`description`에 대해 키워드 토큰 전부 포함 여부로 매칭한다
  (`packages/snapshot-adapter/src/snapshot-reader.ts`). 검색이 안 잡히면 `name`에 검색할 키워드가
  실제로 들어있는지 먼저 확인한다.

## 캡처 계획 (5개, 판단 유형별)

숫자보다 "에이전트의 판단이 시험대에 오르는가"가 기준이다. `docs/snapshot-mode.md`에 정리된 대로:

1. 조건에 정확히 맞는 것 (베이스라인)
2. 가격은 맞는데 리뷰에 하자 언급 있는 것 → `reviewHighlights`로 표현
3. 스펙은 좋은데 설명이 과장/단종 임박한 것 → `description`에 그 문구를 그대로 포함
4. 조건 중 하나만 살짝 벗어난 것 (예: 가격 상한 20만원인데 21만원)
5. 완전히 조건 안 맞는 것 (필터링 노이즈 확인용)

카테고리는 미정 — 캡처하면서 정한다.
