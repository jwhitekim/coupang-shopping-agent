import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { PurchaseRecord } from "@coupang-agent/database";
import { CoupangLoginRequiredError } from "@coupang-agent/coupang-browser-adapter";
import { validateCheckout } from "@coupang-agent/policy-engine";
import type { OrderSnapshot } from "@coupang-agent/shared";
import { config } from "./config.js";
import { browserAdapter, policy, purchaseRepository } from "./runtime.js";

export interface ExecutePurchaseResult {
  outcome: "COMPLETED" | "REQUIRES_REAPPROVAL" | "USER_ACTION_REQUIRED" | "UNKNOWN" | "FAILED";
  orderNumber?: string;
  finalPrice?: number;
  reason?: string;
  liveSnapshot?: OrderSnapshot;
}

// docs/order-lifecycle.md 15장 구매 워커 의사코드를 그대로 구현한다.
// 호출 시점에 purchase는 이미 정책 검사(validatePolicy)를 통과하고 VALIDATING 상태여야 한다.
// 이 함수는 절대 재시도하지 않는다 — 실패/UNKNOWN이면 호출자가 사용자에게 그대로 알려야 한다.
export async function executePurchase(purchase: PurchaseRecord): Promise<ExecutePurchaseResult> {
  let liveSnapshot: OrderSnapshot;

  // 1단계(결제 전 재검증): 이 구간에서 실패하면 아직 결제 버튼을 누르지 않은 상태라는 것이
  // 확실하므로, 주문내역 대조 없이 바로 FAILED로 남긴다. (commitOrder 호출 이후 실패와는
  // 위험도가 다르다 — 아래 2단계 참고.)
  try {
    liveSnapshot = await browserAdapter.prepareOrder(purchase.productUrl, {
      productId: purchase.productId,
      vendorItemId: purchase.vendorItemId,
      quantity: purchase.quantity,
    });
  } catch (error) {
    if (error instanceof CoupangLoginRequiredError) {
      purchaseRepository.markUserActionRequired(purchase.purchaseId, "LOGIN_REQUIRED");
      return { outcome: "USER_ACTION_REQUIRED", reason: error.message };
    }
    return await failBeforeCommit(purchase, error);
  }

  const approvedSnapshot: OrderSnapshot = {
    productId: purchase.productId,
    vendorItemId: purchase.vendorItemId,
    productName: purchase.productName,
    quantity: purchase.quantity,
    unitPrice: Math.round(purchase.expectedPrice / purchase.quantity),
    totalPrice: purchase.expectedPrice,
    shippingFee: 0,
    shippingAddress: "",
    isSubscription: false,
    capturedAt: purchase.createdAt,
  };

  const checkoutValidation = validateCheckout(approvedSnapshot, liveSnapshot, policy);
  if (!checkoutValidation.ok) {
    const reason = checkoutValidation.reason ?? "CHECKOUT_CHANGED";
    purchaseRepository.returnToConfirmation(
      purchase.purchaseId,
      reason,
      new Date(Date.now() + policy.confirmationTtlSeconds * 1000).toISOString(),
    );
    return { outcome: "REQUIRES_REAPPROVAL", reason, liveSnapshot };
  }

  const fingerprint = `${liveSnapshot.totalPrice}-${liveSnapshot.capturedAt}`;
  const locked = purchaseRepository.lockForExecuting(purchase.purchaseId, fingerprint);
  if (!locked) {
    // 이미 다른 실행이 EXECUTING으로 넘어간 상태 — 여기서 새로 시작하지 않는다.
    return { outcome: "FAILED", reason: "ALREADY_EXECUTING" };
  }

  // 2단계(결제 시도): 이 구간부터는 결제가 실제로 들어갔을 수도 있으므로, 무엇이 잘못되든
  // 재결제하지 않고 반드시 주문내역부터 대조한다 (docs/order-lifecycle.md 9장).
  try {
    const result = await browserAdapter.commitOrder({ purchaseId: purchase.purchaseId });

    if (result.status === "COMPLETED" && result.orderNumber) {
      const finalPrice = result.finalPrice ?? purchase.expectedPrice;
      purchaseRepository.markCompleted(purchase.purchaseId, result.orderNumber, finalPrice);
      return { outcome: "COMPLETED", orderNumber: result.orderNumber, finalPrice };
    }

    return await reconcileAndFinish(purchase, "COMMIT_RESULT_UNKNOWN");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return await reconcileAndFinish(purchase, reason);
  }
}

// 결제 버튼을 누르기 전 단계의 실패. 원인 파악용 스크린샷을 남기고 FAILED로 표시한다
// (docs/security-ops.md 17장 "DOM 변경" 대응).
async function failBeforeCommit(purchase: PurchaseRecord, error: unknown): Promise<ExecutePurchaseResult> {
  const reason = error instanceof Error ? error.message : String(error);
  await saveFailureScreenshot(purchase.purchaseId).catch(() => {
    // 스크린샷 저장 실패는 원래 에러를 덮지 않는다.
  });
  purchaseRepository.markFailed(purchase.purchaseId, reason);
  return { outcome: "FAILED", reason };
}

async function saveFailureScreenshot(purchaseId: string): Promise<void> {
  mkdirSync(config.screenshotDir, { recursive: true });
  const path = join(config.screenshotDir, `${purchaseId}-${Date.now()}.png`);
  await browserAdapter.captureScreenshot(path);
}

async function reconcileAndFinish(purchase: PurchaseRecord, reason: string): Promise<ExecutePurchaseResult> {
  try {
    const reconciled = await browserAdapter.reconcileOrder({
      expectedProductName: purchase.productName,
      expectedPrice: purchase.expectedPrice,
      since: purchase.createdAt,
    });

    if (reconciled?.orderNumber) {
      const finalPrice = reconciled.finalPrice ?? purchase.expectedPrice;
      purchaseRepository.markCompleted(purchase.purchaseId, reconciled.orderNumber, finalPrice);
      return { outcome: "COMPLETED", orderNumber: reconciled.orderNumber, finalPrice };
    }
  } catch {
    // 대조 자체가 실패해도 아래에서 UNKNOWN으로 남긴다 — 자동 재결제는 하지 않는다.
  }

  purchaseRepository.markUnknown(purchase.purchaseId, reason);
  return { outcome: "UNKNOWN", reason };
}
