import type { PurchaseRecord } from "@coupang-agent/database";
import { CoupangLoginRequiredError } from "@coupang-agent/coupang-browser-adapter";
import { validateCheckout } from "@coupang-agent/policy-engine";
import type { OrderSnapshot } from "@coupang-agent/shared";
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
  try {
    // 결제 직전 재검증: 승인 당시 스냅샷과 지금 실제 주문서 값을 다시 비교한다.
    const liveSnapshot = await browserAdapter.prepareOrder(purchase.productUrl, {
      productId: purchase.productId,
      vendorItemId: purchase.vendorItemId,
      quantity: purchase.quantity,
    });

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

    const result = await browserAdapter.commitOrder({ purchaseId: purchase.purchaseId });

    if (result.status === "COMPLETED" && result.orderNumber) {
      const finalPrice = result.finalPrice ?? purchase.expectedPrice;
      purchaseRepository.markCompleted(purchase.purchaseId, result.orderNumber, finalPrice);
      return { outcome: "COMPLETED", orderNumber: result.orderNumber, finalPrice };
    }

    // 결제 버튼은 눌렀지만 결과를 확인 못함 → 재결제하지 않고 주문내역부터 대조한다.
    return await reconcileAndFinish(purchase, "COMMIT_RESULT_UNKNOWN");
  } catch (error) {
    if (error instanceof CoupangLoginRequiredError) {
      // 결제를 시도하기 전 단계(재조회)에서 로그인이 풀린 경우다 — 아직 아무것도 제출되지
      // 않았으므로 주문내역 대조 없이 바로 사용자 개입 상태로 전환한다.
      purchaseRepository.markUserActionRequired(purchase.purchaseId, "LOGIN_REQUIRED");
      return { outcome: "USER_ACTION_REQUIRED", reason: error.message };
    }
    const reason = error instanceof Error ? error.message : String(error);
    return await reconcileAndFinish(purchase, reason);
  }
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
