import type { Context } from "grammy";
import type { Product } from "@coupang-agent/shared";
import { buildCandidateKeyboard } from "./keyboards/productKeyboard.js";

export async function presentCandidate(
  ctx: Context,
  previewId: string,
  product: Product,
  reason: string,
  heading = "추천 상품입니다.",
): Promise<void> {
  const lines = [
    heading,
    "",
    `상품: ${product.name}`,
    `가격: ${product.price.toLocaleString("ko-KR")}원`,
    `로켓배송: ${product.isRocket ? "예" : "아니오"}`,
    "",
    `추천 이유: ${reason}`,
    "",
    "이 상품으로 진행할까요? (아직 실제 결제는 실행되지 않습니다)",
  ];

  await ctx.reply(lines.join("\n"), { reply_markup: buildCandidateKeyboard(previewId) });
}
