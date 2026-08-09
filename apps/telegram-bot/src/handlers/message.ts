import type { Context } from "grammy";
import { createShoppingChat, runAgentTurn } from "@coupang-agent/agent";
import { createPreview } from "../previewStore.js";
import { presentCandidate } from "../present.js";
import { executor, model } from "../runtime.js";
import { getSession } from "../session.js";

export async function handleMessage(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const text = ctx.message?.text;
  if (!userId || !text) return;

  const session = getSession(userId);

  if (session.locked) {
    await ctx.reply("현재 /start_purchase 로 잠금을 해제하기 전까지 구매 기능이 잠겨 있습니다.");
    return;
  }

  if (!session.chat) {
    session.chat = createShoppingChat(model);
  }

  await ctx.reply("요청을 확인하고 있습니다...");

  const result = await runAgentTurn(session.chat, session.candidates, executor, text);

  if (result.type === "ask") {
    await ctx.reply(["몇 가지 확인할게요.", ...result.questions.map((q) => `- ${q}`)].join("\n"));
    return;
  }

  if (result.type === "exhausted") {
    await ctx.reply("조건에 맞는 상품을 찾지 못했어요. 조건을 조금 더 구체적으로 말씀해주시겠어요?");
    return;
  }

  const previewId = createPreview({ userId, productId: result.product.productId });
  await presentCandidate(ctx, previewId, result.product, result.reason);
}
