import type { Page } from "playwright";
import type { ProductDetail } from "@coupang-agent/shared";
import { selectors } from "./selectors.js";

export async function inspectProduct(page: Page, productUrl: string, productId: string): Promise<ProductDetail> {
  await page.goto(productUrl, { waitUntil: "domcontentloaded" });

  const name = (await page.locator(selectors.product.name).first().textContent().catch(() => null))?.trim() ?? "";

  const optionEls = await page.$$(`${selectors.product.optionSelect} option`);
  const options = [];
  for (const optionEl of optionEls) {
    const vendorItemId = await optionEl.getAttribute("value");
    const optionName = (await optionEl.textContent())?.trim();
    if (!vendorItemId || !optionName) continue;
    options.push({ vendorItemId, name: optionName });
  }

  return {
    productId,
    name,
    price: 0,
    url: productUrl,
    isRocket: false,
    options,
  };
}
