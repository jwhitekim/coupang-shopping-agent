import type { CheckoutSnapshot, OrderSnapshot, PolicyResult, PurchasePolicy } from "@coupang-agent/shared";

// docs/order-lifecycle.md 10장 "결제 직전 재검증"을 그대로 포팅했다. 사용자에게 승인받은
// 스냅샷(approved)과 결제 직전 prepareOrder를 다시 호출해 얻은 값(live)을 비교한다.
export function validateCheckout(
  approved: OrderSnapshot,
  live: CheckoutSnapshot,
  policy: PurchasePolicy,
): PolicyResult {
  if (approved.productId !== live.productId) {
    return { ok: false, reason: "PRODUCT_CHANGED" };
  }

  if (approved.vendorItemId !== live.vendorItemId) {
    return { ok: false, reason: "OPTION_CHANGED" };
  }

  if (approved.quantity !== live.quantity) {
    return { ok: false, reason: "QUANTITY_CHANGED" };
  }

  if (live.totalPrice > approved.totalPrice + policy.maxPriceIncrease) {
    return { ok: false, reason: "PRICE_CHANGED" };
  }

  if (live.isSubscription) {
    return { ok: false, reason: "SUBSCRIPTION_BLOCKED" };
  }

  return { ok: true };
}
