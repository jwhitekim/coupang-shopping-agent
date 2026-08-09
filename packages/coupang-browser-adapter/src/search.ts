import type { Page } from "playwright";
import type { Product, ProductQuery } from "@coupang-agent/shared";
import { selectors } from "./selectors.js";

const SEARCH_URL = "https://www.coupang.com/np/search";

export async function searchProducts(page: Page, query: ProductQuery): Promise<Product[]> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("q", query.keywords);

  await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
  await page.waitForSelector(selectors.search.resultItem, { timeout: 15000 }).catch(() => null);

  const items = await page.$$(selectors.search.resultItem);
  const products: Product[] = [];

  for (const item of items) {
    const name = await item
      .$eval(selectors.search.name, (el) => el.textContent?.trim() ?? "")
      .catch(() => "");
    const priceText = await item.$eval(selectors.search.price, (el) => el.textContent?.trim() ?? "").catch(() => "");
    const href = await item.$eval(selectors.search.link, (el) => el.getAttribute("href")).catch(() => null);
    const isRocket = (await item.$(selectors.search.rocketBadge)) !== null;

    if (!name || !priceText || !href) continue;

    const price = parsePrice(priceText);
    const productId = extractProductId(href);
    if (!productId || price === null) continue;

    if (query.maxPrice && price > query.maxPrice) continue;
    if (query.rocketOnly && !isRocket) continue;

    products.push({
      productId,
      name,
      price,
      url: new URL(href, "https://www.coupang.com").toString(),
      isRocket,
    });
  }

  return products;
}

function parsePrice(text: string): number | null {
  const digits = text.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : null;
}

function extractProductId(href: string): string | null {
  const match = href.match(/products\/(\d+)/);
  return match ? match[1] : null;
}
