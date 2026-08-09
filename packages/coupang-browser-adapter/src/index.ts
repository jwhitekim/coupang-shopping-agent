import type { Page } from "playwright";
import type { Product, ProductDetail, ProductQuery } from "@coupang-agent/shared";
import { type BrowserAdapterConfig, closeBrowserContext, getBrowserContext } from "./context.js";
import { inspectProduct as inspectProductImpl } from "./inspect.js";
import { searchProducts as searchProductsImpl } from "./search.js";

export type { BrowserAdapterConfig } from "./context.js";

export class CoupangBrowserAdapter {
  constructor(private readonly config: BrowserAdapterConfig) {}

  private async getPage(): Promise<Page> {
    const context = await getBrowserContext(this.config);
    return context.pages()[0] ?? (await context.newPage());
  }

  async searchProducts(query: ProductQuery): Promise<Product[]> {
    const page = await this.getPage();
    return searchProductsImpl(page, query);
  }

  async inspectProduct(productUrl: string, productId: string): Promise<ProductDetail> {
    const page = await this.getPage();
    return inspectProductImpl(page, productUrl, productId);
  }

  async close(): Promise<void> {
    await closeBrowserContext();
  }
}
