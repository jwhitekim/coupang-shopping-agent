# 텔레그램 구매 승인, 주문 상태 머신, 중복 결제 방지, 결제 직전 재검증

## 7. 텔레그램 구매 승인 설계

단순한 `예스` 메시지보다 인라인 버튼을 사용한다.

```json
{
  "text": "구매 확정",
  "callback_data": "confirm:ord_A72K9"
}
```

버튼에는 상품 정보나 결제 명령 전체를 넣지 않고 일회용 주문 ID만 넣는다.

DB 주문 스냅샷 예시:

```json
{
  "orderId": "ord_A72K9",
  "telegramUserId": 123456789,
  "productId": "product-id",
  "vendorItemId": "selected-option-id",
  "productName": "로지텍 무선 마우스",
  "quantity": 1,
  "expectedPrice": 39800,
  "shippingAddressId": "home",
  "expiresAt": "2026-08-05T19:40:00+09:00",
  "status": "AWAITING_CONFIRMATION"
}
```

버튼 클릭 시 검증:

```text
1. 등록된 Telegram user_id인가?
2. 개인 채팅인가?
3. 주문 상태가 AWAITING_CONFIRMATION인가?
4. 확인 유효시간이 지나지 않았는가?
5. 이미 처리된 callback/update가 아닌가?
6. 주문 정책을 모두 통과하는가?
```

---

## 8. 주문 상태 머신

추천 상태:

```text
DRAFT
  ↓
SEARCHING
  ↓
AWAITING_CONFIRMATION
  ↓
VALIDATING
  ↓
EXECUTING
  ↓
COMPLETED
```

예외 상태:

```text
CANCELLED
EXPIRED
POLICY_REJECTED
USER_ACTION_REQUIRED
UNKNOWN
FAILED
```

상태 전이 예시:

```text
AWAITING_CONFIRMATION
  ├─ 사용자가 취소 → CANCELLED
  ├─ 유효기간 초과 → EXPIRED
  └─ 구매 확정 → VALIDATING

VALIDATING
  ├─ 가격·옵션 변경 → AWAITING_CONFIRMATION
  ├─ 정책 위반 → POLICY_REJECTED
  ├─ 추가 인증 필요 → USER_ACTION_REQUIRED
  └─ 검증 성공 → EXECUTING

EXECUTING
  ├─ 주문번호 확인 → COMPLETED
  ├─ 결과 불명확 → UNKNOWN → 주문내역 대조
  └─ 결제 전 실패 → FAILED
```

---

## 9. 중복 결제 방지

이 프로젝트에서 가장 중요한 부분이다.

### 잘못된 구현

```ts
try {
  await commitViaHttp();
} catch {
  await commitViaPlaywright();
}
```

첫 번째 요청이 서버에서는 성공했지만 응답만 유실된 경우 두 번 주문될 수 있다.

### 올바른 구현

```ts
try {
  return await commitViaPlaywright();
} catch (error) {
  const existingOrder = await reconcileFromOrderHistory();

  if (existingOrder) {
    return existingOrder;
  }

  return {
    status: "UNKNOWN",
    retryAllowed: false,
  };
}
```

### 필수 규칙

```text
1. 주문마다 고유 purchaseId를 생성한다.
2. 결제 전에 DB 상태를 EXECUTING으로 원자적으로 변경한다.
3. 동일 주문 ID의 두 번째 실행을 거부한다.
4. 결제 버튼은 한 번만 누른다.
5. 타임아웃이 발생해도 바로 재클릭하지 않는다.
6. 주문 내역에서 주문번호를 먼저 대조한다.
7. 주문이 없다는 것이 확인돼도 자동 재결제 대신 새 승인을 받는 편이 안전하다.
```

DB 수준에서 유니크 제약을 둔다.

```sql
CREATE UNIQUE INDEX ux_purchase_id ON purchases(purchase_id);
CREATE UNIQUE INDEX ux_confirmation_token ON purchases(confirmation_token);
```

상태 변경도 조건부로 수행한다.

```sql
UPDATE purchases
SET status = 'EXECUTING', updated_at = CURRENT_TIMESTAMP
WHERE purchase_id = ?
  AND status = 'AWAITING_CONFIRMATION';
```

변경된 행이 1개일 때만 결제를 시작한다.

---

## 10. 결제 직전 재검증

텔레그램에 보여준 값과 실제 쿠팡 주문서 값을 비교한다.

검사 항목:

```text
- 상품 ID
- 옵션 ID
- 상품명
- 수량
- 판매자
- 개별 가격
- 최종 결제액
- 배송비
- 배송지
- 도착 예정일
- 정기배송 여부
- 장바구니의 다른 상품 존재 여부
```

예시:

```ts
function validateCheckout(
  approved: OrderSnapshot,
  live: CheckoutSnapshot,
  policy: PurchasePolicy,
): ValidationResult {
  if (approved.productId !== live.productId) {
    return { ok: false, reason: "PRODUCT_CHANGED" };
  }

  if (approved.vendorItemId !== live.vendorItemId) {
    return { ok: false, reason: "OPTION_CHANGED" };
  }

  if (approved.quantity !== live.quantity) {
    return { ok: false, reason: "QUANTITY_CHANGED" };
  }

  if (live.totalPrice > approved.expectedPrice + policy.maxPriceIncrease) {
    return { ok: false, reason: "PRICE_CHANGED" };
  }

  if (live.isSubscription) {
    return { ok: false, reason: "SUBSCRIPTION_BLOCKED" };
  }

  return { ok: true };
}
```

---

## 15. 구매 워커 의사코드

```ts
async function executePurchase(purchaseId: string): Promise<void> {
  const purchase = await repository.lockForExecution(purchaseId);

  if (!purchase) {
    return;
  }

  try {
    const policyResult = await policyEngine.validate(purchase);

    if (!policyResult.ok) {
      await repository.markPolicyRejected(purchaseId, policyResult.reason);
      return;
    }

    const liveCheckout = await browserAdapter.inspectCheckout(purchase);
    const validation = validateCheckout(
      purchase.approvedSnapshot,
      liveCheckout,
      policyResult.policy,
    );

    if (!validation.ok) {
      await repository.returnToConfirmation(purchaseId, validation.reason);
      await telegram.notifyReconfirmationRequired(purchaseId, liveCheckout);
      return;
    }

    const result = await browserAdapter.commitOrder({
      purchaseId,
      checkoutFingerprint: liveCheckout.fingerprint,
    });

    await repository.markCompleted(
      purchaseId,
      result.orderNumber,
      result.finalPrice,
    );

    await telegram.notifyCompleted(purchaseId, result);
  } catch (error) {
    const reconciled = await browserAdapter.reconcileOrder({ purchaseId });

    if (reconciled) {
      await repository.markCompleted(
        purchaseId,
        reconciled.orderNumber,
        reconciled.finalPrice,
      );
      await telegram.notifyCompleted(purchaseId, reconciled);
      return;
    }

    await repository.markUnknown(purchaseId, sanitizeError(error));
    await telegram.notifyUnknownResult(purchaseId);
  }
}
```

---

## 목록

- [docs/README.md](README.md) — 문서 목차
- [docs/data-model.md](data-model.md) — DB 스키마
- [docs/mcp-tools.md](mcp-tools.md) — MCP 도구 설계
