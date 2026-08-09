import type { OrderSnapshot, PolicyResult, PurchasePolicy } from "@coupang-agent/shared";

export interface ValidatePolicyInput {
  snapshot: Pick<OrderSnapshot, "quantity" | "unitPrice" | "totalPrice" | "isSubscription">;
  policy: PurchasePolicy;
  // 오늘 이미 COMPLETED된 결제 총액 (packages/database PurchaseRepository.getDailySpend).
  dailySpendSoFar: number;
}

// docs/components.md 4.4장 검사 항목 중 코드로 확인 가능한 것만 구현했다.
// allowedCategories/allowedAddressId는 현재 검색 결과·주소 데이터가 구조화되어 있지 않아
// 이번 범위에서 제외했다 (TODO: coupang-browser-adapter가 카테고리·배송지 ID를 제공하게 되면 추가).
export function validatePolicy(input: ValidatePolicyInput): PolicyResult {
  const { snapshot, policy, dailySpendSoFar } = input;

  if (snapshot.quantity > policy.maxQuantity) {
    return { ok: false, reason: "QUANTITY_EXCEEDS_LIMIT" };
  }

  if (snapshot.unitPrice > policy.maxPricePerItem) {
    return { ok: false, reason: "PRICE_PER_ITEM_EXCEEDS_LIMIT" };
  }

  if (snapshot.totalPrice > policy.maxPricePerOrder) {
    return { ok: false, reason: "PRICE_PER_ORDER_EXCEEDS_LIMIT" };
  }

  if (dailySpendSoFar + snapshot.totalPrice > policy.maxDailySpend) {
    return { ok: false, reason: "DAILY_SPEND_EXCEEDS_LIMIT" };
  }

  if (snapshot.isSubscription && !policy.allowSubscriptions) {
    return { ok: false, reason: "SUBSCRIPTION_NOT_ALLOWED" };
  }

  return { ok: true };
}
