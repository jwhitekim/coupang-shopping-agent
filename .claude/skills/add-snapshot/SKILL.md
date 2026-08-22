---
name: add-snapshot
description: 사용자가 쿠팡에 직접 접속해서 캡처한 상품 정보(텍스트 붙여넣기, 스크린샷)를 스냅샷 JSON 파일로 저장할 때 쓴다. "이 상품 스냅샷으로 추가해줘", "캡처했어, 넣어줘" 같은 요청에 사용한다. 사용자 대신 쿠팡에 접속하거나 스크래핑하지 않는다 — 사용자가 이미 캡처해서 준 내용만 정리한다.
---

# 스냅샷 추가

`packages/snapshot-adapter`가 읽는 상품 스냅샷을 만든다. 배경은
[docs/snapshot-mode.md](../../../docs/snapshot-mode.md), 스키마는
[packages/snapshot-adapter/README.md](../../../packages/snapshot-adapter/README.md) 참고.

## 하지 않는 것

- 사용자 대신 쿠팡에 접속해서 정보를 가져오지 않는다. Playwright, WebFetch, 브라우저 자동화로
  쿠팡 상품 페이지를 긁지 않는다 — 이 스냅샷 모드 자체가 그걸 피하려고 만든 것이다
  (`CLAUDE.md`의 "왜 결제/로그인 자동화가 없는가" 원칙과 동일).
- 사용자가 준 적 없는 스펙·리뷰 내용을 지어내지 않는다. 빠진 필드는 물어본다.

## 절차

1. 사용자가 붙여넣은 텍스트(또는 스크린샷)에서 다음을 추출한다:
   - 필수: `name`, `price`(숫자만, 쉼표 제거), `url`, `isRocket`
   - 선택: `description`(원문 그대로, 요약하지 말 것 — 팩트체크 대상), `specs`, `rating`,
     `reviewCount`, `reviewHighlights`(리뷰에서 눈에 띄는 문구), `options`, `deliveryEstimate`
   - `capturedAt`은 오늘 날짜(ISO, `YYYY-MM-DD`)로 채운다.
   - `productId`는 사람이 읽을 수 있는 slug로 만든다 (예: `wireless-earbuds-01`). 파일명과 동일해야
     한다.
2. 필수 필드가 빠졌으면 채워달라고 물어본다 — 추측해서 채우지 않는다.
3. 어떤 판단 유형(`docs/snapshot-mode.md`의 5가지: 베이스라인/리뷰 하자/팩트체크/조건 경계/노이즈)에
   해당하는지 확인한다. 애매하면 사용자에게 물어본다.
4. `packages/snapshot-adapter/data/snapshots/<productId>.json`로 저장할 내용을 사람에게
   보여주고 확인받은 뒤 파일을 쓴다.
5. 저장 후 `search_products`로 실제로 잡히는지 간단히 확인한다 (키워드가 `name`/`description`에
   토큰 단위로 다 포함돼야 매칭됨 — `snapshot-reader.ts` 참고).
