import type { Product, ProductDetail, ProductQuery } from "@coupang-agent/shared";
import { inspectProduct as inspectSnapshot, searchProducts as searchSnapshots } from "./snapshot-reader.js";

// CoupangBrowserAdapter(라이브 스크래핑)와 같은 인터페이스를 갖는 드롭인 대체재.
// 라이브 검색·조회가 Akamai/API 정책으로 막혀서(docs/snapshot-mode.md), 사용자가 직접
// 브라우저로 저장한 상품 스냅샷(data/snapshots/*.json)을 대신 읽는다.
export class SnapshotAdapter {
  async searchProducts(query: ProductQuery): Promise<Product[]> {
    return searchSnapshots(query);
  }

  async inspectProduct(_productUrl: string, productId: string): Promise<ProductDetail> {
    return inspectSnapshot(productId);
  }
}
