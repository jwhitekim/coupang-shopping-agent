import { createGeminiModel, type AgentToolExecutor } from "@coupang-agent/agent";
import { CoupangBrowserAdapter } from "@coupang-agent/coupang-browser-adapter";
import { openDatabase, PurchaseRepository } from "@coupang-agent/database";
import { loadPolicyFromEnv } from "@coupang-agent/policy-engine";
import { config } from "./config.js";

export const model = createGeminiModel(config.geminiApiKey, config.geminiModel);

export const browserAdapter = new CoupangBrowserAdapter({
  profileDir: config.coupangProfileDir,
  headless: config.headless,
});

// 3단계: 주문 상태·정책 검사에 쓰는 DB/정책 엔진. docs/order-lifecycle.md 8~10장 참고.
export const purchaseRepository = new PurchaseRepository(openDatabase(config.dbPath));
export const policy = loadPolicyFromEnv();

// Agent 패키지에 실제 브라우저 자동화를 주입한다. (에이전트는 Playwright를 모른다)
export const executor: AgentToolExecutor = {
  searchProducts: (query) => browserAdapter.searchProducts(query),
  inspectProduct: (productId, url) => browserAdapter.inspectProduct(url, productId),
};
