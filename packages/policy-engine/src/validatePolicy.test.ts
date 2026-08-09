import assert from "node:assert/strict";
import { test } from "node:test";
import type { PurchasePolicy } from "@coupang-agent/shared";
import { validatePolicy } from "./validatePolicy.js";

const policy: PurchasePolicy = {
  maxPricePerItem: 50000,
  maxPricePerOrder: 100000,
  maxDailySpend: 200000,
  maxQuantity: 3,
  maxPriceIncrease: 500,
  allowSubscriptions: false,
  confirmationTtlSeconds: 300,
};

function snapshot(overrides: Partial<{ quantity: number; unitPrice: number; totalPrice: number; isSubscription: boolean }> = {}) {
  return {
    quantity: 1,
    unitPrice: 39800,
    totalPrice: 39800,
    isSubscription: false,
    ...overrides,
  };
}

test("정책을 모두 통과하면 ok: true", () => {
  const result = validatePolicy({ snapshot: snapshot(), policy, dailySpendSoFar: 0 });
  assert.deepEqual(result, { ok: true });
});

test("수량이 한도를 넘으면 거부", () => {
  const result = validatePolicy({ snapshot: snapshot({ quantity: 4 }), policy, dailySpendSoFar: 0 });
  assert.deepEqual(result, { ok: false, reason: "QUANTITY_EXCEEDS_LIMIT" });
});

test("개당 가격이 한도를 넘으면 거부", () => {
  const result = validatePolicy({
    snapshot: snapshot({ unitPrice: 60000, totalPrice: 60000 }),
    policy,
    dailySpendSoFar: 0,
  });
  assert.deepEqual(result, { ok: false, reason: "PRICE_PER_ITEM_EXCEEDS_LIMIT" });
});

test("주문 총액이 한도를 넘으면 거부", () => {
  const result = validatePolicy({
    snapshot: snapshot({ quantity: 3, unitPrice: 40000, totalPrice: 120000 }),
    policy,
    dailySpendSoFar: 0,
  });
  assert.deepEqual(result, { ok: false, reason: "PRICE_PER_ORDER_EXCEEDS_LIMIT" });
});

test("오늘 누적 결제액과 합쳐 일일 한도를 넘으면 거부", () => {
  const result = validatePolicy({ snapshot: snapshot(), policy, dailySpendSoFar: 190000 });
  assert.deepEqual(result, { ok: false, reason: "DAILY_SPEND_EXCEEDS_LIMIT" });
});

test("정기배송 상품은 allowSubscriptions가 false면 거부", () => {
  const result = validatePolicy({
    snapshot: snapshot({ isSubscription: true }),
    policy,
    dailySpendSoFar: 0,
  });
  assert.deepEqual(result, { ok: false, reason: "SUBSCRIPTION_NOT_ALLOWED" });
});

test("정기배송 상품도 allowSubscriptions가 true면 통과", () => {
  const result = validatePolicy({
    snapshot: snapshot({ isSubscription: true }),
    policy: { ...policy, allowSubscriptions: true },
    dailySpendSoFar: 0,
  });
  assert.deepEqual(result, { ok: true });
});
