import type { Page } from "playwright";
import type { CommitOrderInput, OrderResult } from "@coupang-agent/shared";
import { readAmount, readText } from "./dom.js";
import { selectors } from "./selectors.js";

// 3단계 범위. 이 프로젝트에서 유일하게 결제 버튼(selectors.checkout.payButton)을 클릭하는 함수다.
//
// 주의:
// - selectors.ts의 셀렉터는 실제 쿠팡 DOM으로 검증된 값이 아니라 추정치다. 실제 계정으로
//   호출하기 전에 반드시 로그인된 브라우저에서 셀렉터를 직접 확인해야 한다.
// - 이 함수는 재시도하지 않는다. 실패하거나 주문번호를 못 읽으면 호출자가 reconcileOrder로
//   주문내역을 대조해야 한다 (docs/order-lifecycle.md 9장 중복 결제 방지 원칙).
// - 호출 전에 정책 검사(validatePolicy)와 결제 직전 재검증(validateCheckout)을 통과해야 하고,
//   같은 page 인스턴스가 직전에 prepareOrder로 주문서 화면까지 진입해 있어야 한다.
export async function commitOrder(page: Page, _input: CommitOrderInput): Promise<OrderResult> {
  await page.locator(selectors.checkout.payButton).first().click();
  await page.waitForLoadState("domcontentloaded");

  const orderNumber = await readText(page, selectors.orderComplete.orderNumber);
  if (!orderNumber) {
    // 결제 버튼은 눌렀지만 주문번호를 화면에서 확인하지 못했다 — 성공/실패를 단정하지 않는다.
    return { status: "UNKNOWN" };
  }

  const finalPrice = await readAmount(page, selectors.orderComplete.finalPrice);
  return { status: "COMPLETED", orderNumber, finalPrice };
}
