import type { Context } from "grammy";
import { runAgentTurn } from "@coupang-agent/agent";
import { createPreview, deletePreview, getPreview, updatePreview } from "../previewStore.js";
import { presentCandidate } from "../present.js";
import { executor } from "../runtime.js";
import { getSession, resetSession } from "../session.js";

export async function handleCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  const userId = ctx.from?.id;
  if (!data || !userId) return;

  const [action, previewId] = data.split(":");
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
    deletePreview(previewId);
    resetSession(userId);
    await ctx.answerCallbackQuery();

    // 실제 구매/결제는 자동화하지 않는다 (쿠팡의 봇 탐지로 로그인 자동화 자체가 막혀서
    // 코드로 우회를 시도하지 않기로 했다 — docs/security-ops.md 참고). 링크만 안내하고
    // 실제 결제는 사용자가 직접 진행한다.
    await ctx.editMessageText(
      [
        "이 상품으로 결정하셨습니다.",
        "",
        `상품: ${product.name}`,
        `가격: ${product.price.toLocaleString("ko-KR")}원`,
        `링크: ${product.url}`,
        "",
        "위 링크에서 직접 구매를 진행해주세요.",
      ].join("\n"),
    );
    return;
  }
}
