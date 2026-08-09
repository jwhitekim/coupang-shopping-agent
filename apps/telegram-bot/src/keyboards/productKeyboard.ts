import { InlineKeyboard } from "grammy";

export function buildCandidateKeyboard(previewId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("구매 확정", `confirm:${previewId}`)
    .text("다른 후보", `next:${previewId}`)
    .row()
    .text("취소", `cancel:${previewId}`);
}
