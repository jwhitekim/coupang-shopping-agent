import type { Page } from "playwright";
import type {
  CommitOrderInput,
  OrderResult,
  OrderSnapshot,
  PrepareOrderInput,
  Product,
  ProductDetail,
  ProductQuery,
  ReconcileOrderInput,
} from "@coupang-agent/shared";
import { type BrowserAdapterConfig, closeBrowserContext, getBrowserContext } from "./context.js";
import { commitOrder as commitOrderImpl } from "./commitOrder.js";
import { inspectProduct as inspectProductImpl } from "./inspect.js";
import { prepareOrder as prepareOrderImpl } from "./prepareOrder.js";
import { reconcileOrder as reconcileOrderImpl } from "./reconcileOrder.js";
import { searchProducts as searchProductsImpl } from "./search.js";

export { CoupangLoginRequiredError } from "./prepareOrder.js";
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

  async prepareOrder(productUrl: string, input: PrepareOrderInput): Promise<OrderSnapshot> {
    const page = await this.getPage();
    return prepareOrderImpl(page, productUrl, input);
  }

  // 3단계 범위. 직전에 prepareOrder로 진입해 둔 주문서 화면에서 결제 버튼을 클릭한다.
  // 이번 세션에서는 이 메서드를 실제 쿠팡 계정에 대해 호출하지 않았다 — docs/security-ops.md 참고.
  async commitOrder(input: CommitOrderInput): Promise<OrderResult> {
    const page = await this.getPage();
    return commitOrderImpl(page, input);
  }

  async reconcileOrder(input: ReconcileOrderInput): Promise<OrderResult | null> {
    const page = await this.getPage();
    return reconcileOrderImpl(page, input);
  }

  async close(): Promise<void> {
    await closeBrowserContext();
  }
}
