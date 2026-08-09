import type { Page } from "playwright";
import type { OrderSnapshot, PrepareOrderInput } from "@coupang-agent/shared";
import { selectors } from "./selectors.js";

export class CoupangLoginRequiredError extends Error {
  constructor() {
    super("쿠팡 로그인이 필요합니다. `npm run setup-login` 으로 headed 브라우저에서 직접 로그인하세요.");
    this.name = "CoupangLoginRequiredError";
  }
}

// 2단계 범위: 상품 페이지 접근 → 옵션 선택 → 주문서 진입 → 가격/배송지/수량 읽기.
// 결제 버튼(selectors.checkout.payButton)은 이 함수 어디에서도 클릭하지 않는다.
export async function prepareOrder(page: Page, productUrl: string, input: PrepareOrderInput): Promise<OrderSnapshot> {
  await page.goto(productUrl, { waitUntil: "domcontentloaded" });

  if (isLoginPage(page.url())) {
    throw new CoupangLoginRequiredError();
  }

  if (input.vendorItemId) {
    const optionSelect = page.locator(selectors.product.optionSelect).first();
    if (await optionSelect.count()) {
      await optionSelect.selectOption(input.vendorItemId);
    }
  }

  await page.locator(selectors.product.buyNowButton).first().click();
  await page.waitForLoadState("domcontentloaded");

  if (isLoginPage(page.url())) {
    throw new CoupangLoginRequiredError();
  }

  const quantity = await readQuantity(page);
  const totalPrice = await readAmount(page, selectors.checkout.totalPayment);
  const shippingFee = await readAmount(page, selectors.checkout.shippingFee);
  const shippingAddress =
    (await page.locator(selectors.checkout.shippingAddress).first().textContent().catch(() => null))?.trim() ?? "";
  const deliveryEstimate =
    (await page.locator(selectors.checkout.deliveryEstimate).first().textContent().catch(() => null))?.trim() ??
    undefined;
  const isSubscription = (await page.locator(selectors.checkout.subscriptionBadge).count()) > 0;
  const productName =
    (await page.locator(selectors.product.name).first().textContent().catch(() => null))?.trim() ?? "";

  return {
    productId: input.productId,
    vendorItemId: input.vendorItemId,
    productName,
    quantity,
    unitPrice: quantity > 0 ? Math.round((totalPrice - shippingFee) / quantity) : totalPrice,
    totalPrice,
    shippingFee,
    shippingAddress,
    deliveryEstimate,
    isSubscription,
    capturedAt: new Date().toISOString(),
  };
}

function isLoginPage(url: string): boolean {
  return url.includes("login.coupang.com") || url.includes("/login");
}

async function readQuantity(page: Page): Promise<number> {
  const input = page.locator(selectors.checkout.quantityInput).first();
  if (!(await input.count())) return 1;
  const value = await input.inputValue().catch(() => "1");
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

async function readAmount(page: Page, selector: string): Promise<number> {
  const text = await page.locator(selector).first().textContent().catch(() => null);
  if (!text) return 0;
  const digits = text.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}
