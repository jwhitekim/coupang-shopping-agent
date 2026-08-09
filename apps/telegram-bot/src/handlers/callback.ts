import { randomUUID, createHash } from "node:crypto";
import type { Context } from "grammy";
import { runAgentTurn } from "@coupang-agent/agent";
import { CoupangLoginRequiredError } from "@coupang-agent/coupang-browser-adapter";
import { buildPurchaseKeyboard } from "../keyboards/purchaseKeyboard.js";
import { createPreview, deletePreview, getPreview, updatePreview } from "../previewStore.js";
import { presentCandidate } from "../present.js";
import { handlePurchaseAction } from "./purchaseCallback.js";
import { browserAdapter, executor, policy, purchaseRepository } from "../runtime.js";
import { getSession, resetSession } from "../session.js";

export async function handleCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  const userId = ctx.from?.id;
  if (!data || !userId) return;

  const [action, id] = data.split(":");

  // "구매 확정"으로 만들어진 주문(DB purchases 행)에 대한 결제 확정/취소는 후보 미리보기와
  // 별도 ID 체계를 쓰므로 previewStore를 거치지 않고 바로 처리한다.
  if (action === "pay" || action === "cancelPurchase") {
    await handlePurchaseAction(ctx, action, id, userId);
    return;
  }

  const previewId = id;
  const preview = getPreview(previewId);

  if (!preview || preview.userId !== userId) {
    await ctx.answerCallbackQuery({ text: "만료되었거나 유효하지 않은 요청입니다." });
    return;
  }

  const session = getSession(userId);
  const product = session.candidates.get(preview.productId);

  if (!product || !session.chat) {
    await ctx.answerCallbackQuery({ text: "세션이 만료되었습니다. 처음부터 다시 요청해주세요." });
    deletePreview(previewId);
    resetSession(userId);
    return;
  }

  if (preview.used) {
    await ctx.answerCallbackQuery({ text: "이미 처리된 요청입니다." });
    return;
  }

  if (action === "cancel") {
    updatePreview(previewId, { used: true });
    deletePreview(previewId);
    resetSession(userId);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText("취소되었습니다.");
    return;
  }

  if (action === "next") {
    updatePreview(previewId, { used: true });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText("다른 후보를 찾고 있습니다...");

    // 같은 chat(대화 히스토리)에 이어서 말하는 것이므로, 모델은 이전에 관찰한 후보들을 기억한 채 판단한다.
    const result = await runAgentTurn(
      session.chat,
      session.candidates,
      executor,
      `방금 추천한 상품(productId=${product.productId}, 이름=${product.name})은 원하지 않습니다. 다른 후보를 추천해주세요.`,
    );

    if (result.type === "ask") {
      await ctx.reply(["몇 가지 확인할게요.", ...result.questions.map((q) => `- ${q}`)].join("\n"));
      return;
    }

    if (result.type === "exhausted") {
      await ctx.reply("더 대체할 만한 후보를 찾지 못했어요. 조건을 조정해서 다시 말씀해주세요.");
      return;
    }

    const newPreviewId = createPreview({ userId, productId: result.product.productId });
    await presentCandidate(ctx, newPreviewId, result.product, result.reason, "다른 후보입니다.");
    return;
  }

  if (action === "confirm") {
    updatePreview(previewId, { used: true });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText("주문 정보를 확인하고 있습니다. (실제 결제는 실행하지 않습니다)");

    try {
      const snapshot = await browserAdapter.prepareOrder(product.url, {
        productId: product.productId,
        vendorItemId: product.vendorItemId ?? "",
        quantity: 1,
      });

      // 발급 즉시 해시만 저장하고 원문 토큰은 보관하지 않는다 (docs/security-ops.md 감사 로그 원칙).
      const confirmationTokenHash = createHash("sha256").update(randomUUID()).digest("hex");
      const purchaseId = purchaseRepository.createPurchase({
        telegramUserId: userId,
        productId: snapshot.productId,
        productUrl: product.url,
        vendorItemId: snapshot.vendorItemId,
        productName: snapshot.productName || product.name,
        quantity: snapshot.quantity,
        expectedPrice: snapshot.totalPrice,
        confirmationTokenHash,
        expiresAt: new Date(Date.now() + policy.confirmationTtlSeconds * 1000).toISOString(),
      });

      await ctx.reply(
        [
          "주문 미리보기입니다. (아직 결제 버튼을 누르지 않았습니다)",
          "",
          `상품: ${snapshot.productName || product.name}`,
          `수량: ${snapshot.quantity}`,
          `상품금액: ${snapshot.unitPrice.toLocaleString("ko-KR")}원`,
          `배송비: ${snapshot.shippingFee.toLocaleString("ko-KR")}원`,
          `총 결제예정액: ${snapshot.totalPrice.toLocaleString("ko-KR")}원`,
          `배송지: ${snapshot.shippingAddress || "확인 필요"}`,
          snapshot.deliveryEstimate ? `도착 예정: ${snapshot.deliveryEstimate}` : undefined,
          snapshot.isSubscription ? "⚠️ 정기배송 상품으로 보입니다." : undefined,
          "",
          "이 내용으로 결제를 진행할까요?",
        ]
          .filter(Boolean)
          .join("\n"),
        { reply_markup: buildPurchaseKeyboard(purchaseId) },
      );
    } catch (error) {
      if (error instanceof CoupangLoginRequiredError) {
        await ctx.reply(error.message);
        return;
      }
      await ctx.reply("주문 정보를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      deletePreview(previewId);
      resetSession(userId);
    }
  }
}
