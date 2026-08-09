import type { Page } from "playwright";
import type { OrderResult, ReconcileOrderInput } from "@coupang-agent/shared";
import { isLoginPage } from "./dom.js";
import { CoupangLoginRequiredError } from "./prepareOrder.js";
import { selectors } from "./selectors.js";

// 3단계 범위: 결제 결과가 불명확(UNKNOWN)할 때 재결제하지 않고 주문내역에서 대조한다
// (docs/order-lifecycle.md 9장). 주문내역 페이지 셀렉터도 selectors.ts의 다른 값들과 마찬가지로
// 실제 DOM으로 검증되지 않은 추정치다.
//
// 상품명이 일치하는 가장 최근 주문을 찾으면 그 주문을 반환한다. 못 찾으면 null을 반환하고,
// 호출자는 자동 재결제 대신 사용자에게 알려야 한다.
// TODO: input.expectedPrice/since는 아직 쓰지 않는다 — 주문내역 페이지의 날짜·가격 표시 형식을
// 실제 DOM으로 확인한 뒤 시간창·금액까지 함께 대조하도록 좁힐 것.
export async function reconcileOrder(page: Page, input: ReconcileOrderInput): Promise<OrderResult | null> {
  await page.goto(selectors.orderHistory.listUrl, { waitUntil: "domcontentloaded" });

  if (isLoginPage(page.url())) {
    throw new CoupangLoginRequiredError();
  }

  const rows = page.locator(selectors.orderHistory.row);
  const count = await rows.count();

  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const productName = (
      await row.locator(selectors.orderHistory.productName).first().textContent().catch(() => null)
    )?.trim();

    if (!productName || !productName.includes(input.expectedProductName)) {
      continue;
    }

    // 반드시 지금 보고 있는 행(row) 안에서만 주문번호/가격을 읽는다 — page 전체에서 읽으면
    // 항상 첫 번째 주문의 값을 가져오는 버그가 된다.
    const orderNumber = (
      await row.locator(selectors.orderHistory.orderNumber).first().textContent().catch(() => null)
    )?.trim();
    if (!orderNumber) continue;

    const priceText = await row.locator(selectors.orderHistory.price).first().textContent().catch(() => null);
    const finalPrice = priceText ? Number(priceText.replace(/[^0-9]/g, "")) || 0 : 0;

    return { status: "COMPLETED", orderNumber, finalPrice };
  }

  return null;
}
