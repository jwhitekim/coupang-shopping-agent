import "dotenv/config";
import { CoupangBrowserAdapter } from "@coupang-agent/coupang-browser-adapter";
import { openDatabase, PurchaseRepository } from "@coupang-agent/database";

// 5단계 운영 도구. UNKNOWN 상태로 남은 구매(결제 버튼은 눌렀지만 결과를 확인 못한 건)를
// 주문내역과 다시 대조한다. 자동으로 재결제하지 않고, 찾은 것만 COMPLETED로 표시한다.
// 사용법: npm run reconcile-unknown
async function main() {
  const dbPath = process.env.DB_PATH ?? "./data/app.db";
  const profileDir = process.env.COUPANG_PROFILE_DIR ?? "./data/coupang-profile";
  const headless = (process.env.COUPANG_HEADLESS ?? "true") === "true";

  const repository = new PurchaseRepository(openDatabase(dbPath));
  const unknownPurchases = repository.listByStatus("UNKNOWN");

  if (unknownPurchases.length === 0) {
    console.log("UNKNOWN 상태인 구매가 없습니다.");
    return;
  }

  console.log(`UNKNOWN 상태 구매 ${unknownPurchases.length}건을 대조합니다.`);

  const browserAdapter = new CoupangBrowserAdapter({ profileDir, headless });

  for (const purchase of unknownPurchases) {
    const reconciled = await browserAdapter.reconcileOrder({
      expectedProductName: purchase.productName,
      expectedPrice: purchase.expectedPrice,
      since: purchase.createdAt,
    });

    if (reconciled?.orderNumber) {
      repository.markCompleted(
        purchase.purchaseId,
        reconciled.orderNumber,
        reconciled.finalPrice ?? purchase.expectedPrice,
      );
      console.log(`[FOUND] ${purchase.purchaseId} → 주문번호 ${reconciled.orderNumber}`);
    } else {
      console.log(`[NOT FOUND] ${purchase.purchaseId} (${purchase.productName}) — 계속 UNKNOWN으로 남겨둡니다.`);
    }
  }

  await browserAdapter.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
