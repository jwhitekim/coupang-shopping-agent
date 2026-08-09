import type { Context } from "grammy";
import { validatePolicy } from "@coupang-agent/policy-engine";
import { executePurchase } from "../purchaseWorker.js";
import { policy, purchaseRepository } from "../runtime.js";

function startOfTodayIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

// docs/order-lifecycle.md 7장 "버튼 클릭 시 검증" 목록 중 1·2번(허용 사용자·개인 채팅)은
// bot.use(requireAllowedUser) 미들웨어가 이미 처리한다. 여기서는 나머지(소유자·상태·만료·정책)를 본다.
export async function handlePurchaseAction(
  ctx: Context,
  action: "pay" | "cancelPurchase",
  purchaseId: string,
  userId: number,
): Promise<void> {
  const purchase = purchaseRepository.getById(purchaseId);

  if (!purchase || purchase.telegramUserId !== userId) {
    await ctx.answerCallbackQuery({ text: "만료되었거나 유효하지 않은 주문입니다." });
    return;
  }

  if (action === "cancelPurchase") {
    const cancelled = purchaseRepository.cancelIfAwaitingConfirmation(purchaseId);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(cancelled ? "주문을 취소했습니다." : "이미 처리된 주문이라 취소할 수 없습니다.");
    return;
  }

  if (purchase.status !== "AWAITING_CONFIRMATION") {
    await ctx.answerCallbackQuery({ text: "이미 처리된 주문입니다." });
    return;
  }

  if (new Date(purchase.expiresAt).getTime() < Date.now()) {
    purchaseRepository.markExpired(purchaseId);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText("확인 유효시간이 지났습니다. 처음부터 다시 요청해주세요.");
    return;
  }

  // AWAITING_CONFIRMATION → VALIDATING. 두 번 눌려도 한쪽만 통과한다 (중복 결제 방지).
  if (!purchaseRepository.lockForValidating(purchaseId)) {
    await ctx.answerCallbackQuery({ text: "이미 처리 중인 주문입니다." });
    return;
  }

  await ctx.answerCallbackQuery();
  await ctx.editMessageText("결제를 진행하고 있습니다...");

  const dailySpendSoFar = purchaseRepository.getDailySpend(userId, startOfTodayIso());
  const policyResult = validatePolicy({
    snapshot: {
      quantity: purchase.quantity,
      unitPrice: Math.round(purchase.expectedPrice / purchase.quantity),
      totalPrice: purchase.expectedPrice,
      isSubscription: false,
    },
    policy,
    dailySpendSoFar,
  });

  if (!policyResult.ok) {
    purchaseRepository.markPolicyRejected(purchaseId, policyResult.reason ?? "POLICY_VIOLATION");
    await ctx.reply(`정책에 맞지 않아 결제를 진행할 수 없습니다. (사유: ${policyResult.reason})`);
    return;
  }

  const result = await executePurchase(purchase);

  if (result.outcome === "COMPLETED") {
    await ctx.reply(
      [
        "구매가 완료되었습니다.",
        `주문번호: ${result.orderNumber}`,
        result.finalPrice ? `결제금액: ${result.finalPrice.toLocaleString("ko-KR")}원` : undefined,
      ]
        .filter(Boolean)
        .join("\n"),
    );
    return;
  }

  if (result.outcome === "REQUIRES_REAPPROVAL") {
    await ctx.reply(
      [
        "결제 전 다시 확인해보니 주문서 내용이 바뀌었습니다.",
        `사유: ${result.reason}`,
        result.liveSnapshot ? `현재 결제예정액: ${result.liveSnapshot.totalPrice.toLocaleString("ko-KR")}원` : undefined,
        "",
        "처음부터 다시 요청해서 새로 확인해주세요.",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    return;
  }

  if (result.outcome === "USER_ACTION_REQUIRED") {
    await ctx.reply("쿠팡에서 추가 인증이 필요합니다. headed 브라우저에서 직접 로그인한 뒤 다시 시도해주세요.");
    return;
  }

  // UNKNOWN | FAILED
  await ctx.reply(
    result.outcome === "UNKNOWN"
      ? "결제 결과를 확인하지 못했습니다. 자동으로 재결제하지 않았으니, 쿠팡 주문내역을 직접 확인해주세요."
      : `결제를 진행하지 못했습니다. (사유: ${result.reason})`,
  );
}
