# MCP 도구 설계

추천 도구:

```text
search_products
inspect_product
compare_products
prepare_order
get_order_preview
confirm_order
get_order_status
cancel_pending_order
```

> **구현 노트 (1~2단계):** 아직 별도 MCP 서버 프로세스는 만들지 않았다. 대신 `packages/agent`가
> `search_products` / `inspect_product` / `ask_clarifying_question` / `recommend_product`를
> Gemini function calling 도구로 직접 선언하고, 실제 실행(Playwright 호출)은 앱 계층이 주입한
> `AgentToolExecutor`가 담당한다 (`apps/telegram-bot/src/runtime.ts`). `compare_products`는 별도
> 도구가 아니라 모델이 `search_products` 결과를 관찰하며 스스로 비교·판단하는 것으로 대체했다.
> `prepare_order`/`confirm_order`/`get_order_status`/`cancel_pending_order`는 3단계 이후,
> 그리고 결제와 관련된 도구는 모델이 아니라 정책 엔진을 통과한 사람의 버튼 클릭에서만 트리거되도록
> MCP 서버로 옮길 예정이다.

### 검색

```ts
search_products({
  query: "블루투스 무선 마우스",
  maxPrice: 50000,
  requiredFeatures: ["저소음", "휴대용", "로켓배송"],
});
```

### 주문 준비

```ts
prepare_order({
  productId: "...",
  vendorItemId: "...",
  quantity: 1,
  maxTotalPrice: 50000,
});
```

반환값에는 실제 결제 권한이 없는 미리보기 정보만 포함한다.

```json
{
  "orderId": "ord_A72K9",
  "status": "AWAITING_CONFIRMATION",
  "productName": "로지텍 무선 마우스",
  "quantity": 1,
  "expectedPrice": 39800,
  "expiresAt": "2026-08-05T19:40:00+09:00"
}
```

### 구매 확정

```ts
confirm_order({
  orderId: "ord_A72K9",
  confirmationToken: "one-time-token",
});
```

서버는 에이전트가 보낸 상품명이나 가격을 신뢰하지 않고 DB의 주문 스냅샷을 기준으로 검증한다.

---

## 목록

- [docs/README.md](README.md) — 문서 목차
- [docs/order-lifecycle.md](order-lifecycle.md) — 주문 상태 머신, 중복 결제 방지
