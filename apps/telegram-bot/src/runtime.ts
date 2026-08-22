import { createGeminiModel, type AgentToolExecutor } from "@coupang-agent/agent";
import { SnapshotAdapter } from "@coupang-agent/snapshot-adapter";
import { config } from "./config.js";

export const model = createGeminiModel(config.geminiApiKey, config.geminiModel);

// 라이브 검색은 Akamai/API 정책으로 막혀있어(docs/snapshot-mode.md), 수동 캡처한 상품
// 스냅샷(packages/snapshot-adapter/data/snapshots)을 대신 읽는다.
export const snapshotAdapter = new SnapshotAdapter();

// Agent 패키지에 실제 검색/조회 구현을 주입한다.
export const executor: AgentToolExecutor = {
  searchProducts: (query) => snapshotAdapter.searchProducts(query),
  inspectProduct: (productId, url) => snapshotAdapter.inspectProduct(url, productId),
};
