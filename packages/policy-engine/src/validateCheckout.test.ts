import assert from "node:assert/strict";
import { test } from "node:test";
import type { OrderSnapshot, PurchasePolicy } from "@coupang-agent/shared";
import { validateCheckout } from "./validateCheckout.js";

const policy: PurchasePolicy = {
  maxPricePerItem: 50000,
  maxPricePerOrder: 100000,
  maxDailySpend: 200000,
  maxQuantity: 3,
  maxPriceIncrease: 500,
  allowSubscriptions: false,
  confirmationTtlSeconds: 300,
};

function approvedSnapshot(overrides: Partial<OrderSnapshot> = {}): OrderSnapshot {
  return {
    productId: "p1",
    vendorItemId: "v1",
    productName: "로지텍 무선 마우스",
    quantity: 1,
    unitPrice: 39800,
    totalPrice: 39800,
    shippingFee: 0,
    shippingAddress: "서울시 ...",
    isSubscription: false,
    capturedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

test("승인된 스냅샷과 실시간 값이 같으면 통과", () => {
  const approved = approvedSnapshot();
  const live = approvedSnapshot({ capturedAt: "2026-08-01T00:05:00.000Z" });
  assert.deepEqual(validateCheckout(approved, live, policy), { ok: true });
});

test("상품 ID가 바뀌면 거부", () => {
  const approved = approvedSnapshot();
  const live = approvedSnapshot({ productId: "p2" });
  assert.deepEqual(validateCheckout(approved, live, policy), { ok: false, reason: "PRODUCT_CHANGED" });
});

test("옵션(vendorItemId)이 바뀌면 거부", () => {
  const approved = approvedSnapshot();
  const live = approvedSnapshot({ vendorItemId: "v2" });
  assert.deepEqual(validateCheckout(approved, live, policy), { ok: false, reason: "OPTION_CHANGED" });
});

test("수량이 바뀌면 거부", () => {
  const approved = approvedSnapshot();
  const live = approvedSnapshot({ quantity: 2 });
  assert.deepEqual(validateCheckout(approved, live, policy), { ok: false, reason: "QUANTITY_CHANGED" });
});

test("가격 상승이 허용폭(maxPriceIncrease) 이내면 통과", () => {
  const approved = approvedSnapshot({ totalPrice: 39800 });
  const live = approvedSnapshot({ totalPrice: 40300 }); // +500, 허용폭과 동일
  assert.deepEqual(validateCheckout(approved, live, policy), { ok: true });
});

test("가격 상승이 허용폭을 넘으면 거부", () => {
  const approved = approvedSnapshot({ totalPrice: 39800 });
  const live = approvedSnapshot({ totalPrice: 40301 });
  assert.deepEqual(validateCheckout(approved, live, policy), { ok: false, reason: "PRICE_CHANGED" });
});

test("실시간 조회에서 정기배송으로 확인되면 거부", () => {
  const approved = approvedSnapshot();
  const live = approvedSnapshot({ isSubscription: true });
  assert.deepEqual(validateCheckout(approved, live, policy), { ok: false, reason: "SUBSCRIPTION_BLOCKED" });
});
