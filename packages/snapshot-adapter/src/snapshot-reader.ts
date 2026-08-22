import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Product, ProductDetail, ProductQuery } from "@coupang-agent/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_DIR = join(__dirname, "../data/snapshots");

// data/snapshots/*.json을 읽는다. 이 파일들은 사람이 쿠팡에 직접 접속해 수동으로 캡처한 것만
// 들어간다 (Playwright 등 자동화로 채우지 않는다) — docs/snapshot-mode.md 참고.
function loadSnapshots(): ProductDetail[] {
  const files = readdirSync(SNAPSHOT_DIR).filter((f) => f.endsWith(".json"));
  return files.map((f) => JSON.parse(readFileSync(join(SNAPSHOT_DIR, f), "utf-8")) as ProductDetail);
}

export function searchProducts(query: ProductQuery): Product[] {
  const tokens = query.keywords.toLowerCase().split(/\s+/).filter(Boolean);

  return loadSnapshots()
    .filter((p) => {
      const haystack = `${p.name} ${p.description ?? ""}`.toLowerCase();
      if (!tokens.every((t) => haystack.includes(t))) return false;
      if (query.maxPrice != null && p.price > query.maxPrice) return false;
      if (query.rocketOnly && !p.isRocket) return false;
      if (query.requiredFeatures?.some((f) => !haystack.includes(f.toLowerCase()))) return false;
      return true;
    })
    .map(({ productId, vendorItemId, name, price, url, isRocket }) => ({
      productId,
      vendorItemId,
      name,
      price,
      url,
      isRocket,
    }));
}

export function inspectProduct(productId: string): ProductDetail {
  const found = loadSnapshots().find((p) => p.productId === productId);
  if (!found) throw new Error(`스냅샷을 찾을 수 없습니다: ${productId}`);
  return found;
}
