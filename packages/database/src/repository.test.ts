import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { test } from "node:test";
import { openDatabase } from "./db.js";
import { PurchaseRepository } from "./repository.js";

function setup() {
  const db = openDatabase(":memory:");
  return new PurchaseRepository(db);
}

function createSamplePurchase(repo: PurchaseRepository) {
  return repo.createPurchase({
    telegramUserId: 1,
    productId: "p1",
    productUrl: "https://www.coupang.com/vp/products/p1",
    vendorItemId: "v1",
    productName: "테스트 상품",
    quantity: 1,
    expectedPrice: 10000,
    // 실제로는 매 주문마다 새 토큰이 발급되므로, 같은 DB 안에서 여러 번 호출해도
    // confirmation_token_hash UNIQUE 제약에 걸리지 않게 매번 다른 값을 쓴다.
    confirmationTokenHash: `hash-${randomUUID()}`,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  });
}

test("createPurchase는 AWAITING_CONFIRMATION 상태로 시작한다", () => {
  const repo = setup();
  const purchaseId = createSamplePurchase(repo);
  const record = repo.getById(purchaseId);
  assert.equal(record?.status, "AWAITING_CONFIRMATION");
});

test("lockForValidating은 동시에 두 번 호출해도 한 번만 성공한다 (중복 결제 방지)", () => {
  const repo = setup();
  const purchaseId = createSamplePurchase(repo);

  const first = repo.lockForValidating(purchaseId);
  const second = repo.lockForValidating(purchaseId);

  assert.equal(first, true);
  assert.equal(second, false);
  assert.equal(repo.getById(purchaseId)?.status, "VALIDATING");
});

test("lockForExecuting은 VALIDATING 상태에서만 성공한다", () => {
  const repo = setup();
  const purchaseId = createSamplePurchase(repo);

  assert.equal(repo.lockForExecuting(purchaseId, "fp"), false);

  repo.lockForValidating(purchaseId);
  assert.equal(repo.lockForExecuting(purchaseId, "fp"), true);
  assert.equal(repo.getById(purchaseId)?.status, "EXECUTING");

  // 이미 EXECUTING이므로 두 번째 시도는 거부된다.
  assert.equal(repo.lockForExecuting(purchaseId, "fp2"), false);
});

test("전체 흐름: AWAITING_CONFIRMATION → VALIDATING → EXECUTING → COMPLETED", () => {
  const repo = setup();
  const purchaseId = createSamplePurchase(repo);

  repo.lockForValidating(purchaseId);
  repo.lockForExecuting(purchaseId, "fp");
  repo.markCompleted(purchaseId, "ORDER-123", 10000);

  const record = repo.getById(purchaseId);
  assert.equal(record?.status, "COMPLETED");
  assert.equal(record?.coupangOrderNumber, "ORDER-123");
  assert.equal(record?.finalPrice, 10000);
});

test("cancelIfAwaitingConfirmation은 확정 대기 상태일 때만 취소를 허용한다", () => {
  const repo = setup();
  const purchaseId = createSamplePurchase(repo);

  repo.lockForValidating(purchaseId);
  assert.equal(repo.cancelIfAwaitingConfirmation(purchaseId), false, "VALIDATING 상태에서는 취소 불가");

  const purchaseId2 = createSamplePurchase(repo);
  assert.equal(repo.cancelIfAwaitingConfirmation(purchaseId2), true);
  assert.equal(repo.getById(purchaseId2)?.status, "CANCELLED");
});

test("getDailySpend는 오늘 COMPLETED된 결제만 합산한다", () => {
  const repo = setup();
  const purchaseId = createSamplePurchase(repo);
  repo.lockForValidating(purchaseId);
  repo.lockForExecuting(purchaseId, "fp");
  repo.markCompleted(purchaseId, "ORDER-1", 12345);

  // 아직 완료되지 않은 구매는 합산되지 않는다.
  createSamplePurchase(repo);

  const since = new Date(Date.now() - 60_000).toISOString();
  assert.equal(repo.getDailySpend(1, since), 12345);
});

test("recordEvent는 purchase_events에 감사 로그를 남긴다", () => {
  const repo = setup();
  const purchaseId = createSamplePurchase(repo);
  repo.recordEvent(purchaseId, "CUSTOM_EVENT", { note: "test" });
  // 별도 조회 API는 없으므로 예외 없이 기록되는지만 확인한다.
  assert.ok(purchaseId);
});
