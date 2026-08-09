import { InlineKeyboard } from "grammy";

// docs/order-lifecycle.md 7장: 버튼에는 결제 명령 전체가 아니라 일회용 주문 ID만 담는다.
export function buildPurchaseKeyboard(purchaseId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("결제 확정", `pay:${purchaseId}`)
    .text("취소", `cancelPurchase:${purchaseId}`);
}
