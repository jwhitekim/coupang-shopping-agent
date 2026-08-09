import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { PurchaseStatus } from "@coupang-agent/shared";

export interface PurchaseRecord {
  purchaseId: string;
  telegramUserId: number;
  productId: string;
  productUrl: string;
  vendorItemId: string;
  productName: string;
  quantity: number;
  expectedPrice: number;
  finalPrice: number | null;
  confirmationTokenHash: string;
  checkoutFingerprint: string | null;
  status: PurchaseStatus;
  coupangOrderNumber: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

interface PurchaseRow {
  purchase_id: string;
  telegram_user_id: number;
  product_id: string;
  product_url: string;
  vendor_item_id: string;
  product_name: string;
  quantity: number;
  expected_price: number;
  final_price: number | null;
  confirmation_token_hash: string;
  checkout_fingerprint: string | null;
  status: string;
  coupang_order_number: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseInput {
  telegramUserId: number;
  productId: string;
  productUrl: string;
  vendorItemId: string;
  productName: string;
  quantity: number;
  expectedPrice: number;
  confirmationTokenHash: string;
  expiresAt: string;
}

// docs/order-lifecycle.md 8~9장의 주문 상태 머신·중복 결제 방지를 그대로 구현한다.
// 상태 전이는 항상 "WHERE status = 기대값" 조건부 UPDATE로만 수행하고, 영향받은 행이
// 1개일 때만 성공으로 본다 — 동시에 두 번 들어와도 한쪽만 통과한다.
export class PurchaseRepository {
  constructor(private readonly db: DatabaseSync) {}

  createPurchase(input: CreatePurchaseInput): string {
    const purchaseId = `ord_${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO purchases
          (purchase_id, telegram_user_id, product_id, product_url, vendor_item_id, product_name,
           quantity, expected_price, confirmation_token_hash, status, expires_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'AWAITING_CONFIRMATION', ?, ?, ?)`,
      )
      .run(
        purchaseId,
        input.telegramUserId,
        input.productId,
        input.productUrl,
        input.vendorItemId,
        input.productName,
        input.quantity,
        input.expectedPrice,
        input.confirmationTokenHash,
        input.expiresAt,
        now,
        now,
      );
    this.recordEvent(purchaseId, "DRAFT_CREATED");
    return purchaseId;
  }

  getById(purchaseId: string): PurchaseRecord | undefined {
    const row = this.db.prepare(`SELECT * FROM purchases WHERE purchase_id = ?`).get(purchaseId) as
      | PurchaseRow
      | undefined;
    return row ? mapRow(row) : undefined;
  }

  // 5단계 운영 도구(scripts/reconcile-unknown.ts)가 UNKNOWN 상태 구매를 다시 대조할 때 쓴다.
  listByStatus(status: PurchaseStatus): PurchaseRecord[] {
    const rows = this.db
      .prepare(`SELECT * FROM purchases WHERE status = ? ORDER BY created_at ASC`)
      .all(status) as unknown as PurchaseRow[];
    return rows.map(mapRow);
  }

  // AWAITING_CONFIRMATION → VALIDATING. "결제 확정" 버튼이 두 번 눌려도 한 번만 통과한다.
  lockForValidating(purchaseId: string): boolean {
    return this.transition(purchaseId, "AWAITING_CONFIRMATION", "VALIDATING");
  }

  // VALIDATING → EXECUTING. 결제 직전 재검증까지 통과한 뒤에만 호출한다.
  lockForExecuting(purchaseId: string, checkoutFingerprint: string): boolean {
    const result = this.db
      .prepare(
        `UPDATE purchases SET status = 'EXECUTING', checkout_fingerprint = ?, updated_at = ?
         WHERE purchase_id = ? AND status = 'VALIDATING'`,
      )
      .run(checkoutFingerprint, new Date().toISOString(), purchaseId);
    const changed = Number(result.changes) > 0;
    if (changed) this.recordEvent(purchaseId, "STATUS_VALIDATING_TO_EXECUTING");
    return changed;
  }

  // 가격/옵션이 바뀐 경우 재승인을 받도록 AWAITING_CONFIRMATION으로 되돌린다.
  returnToConfirmation(purchaseId: string, reason: string, expiresAt: string): void {
    this.db
      .prepare(
        `UPDATE purchases SET status = 'AWAITING_CONFIRMATION', expires_at = ?, updated_at = ? WHERE purchase_id = ?`,
      )
      .run(expiresAt, new Date().toISOString(), purchaseId);
    this.recordEvent(purchaseId, "RETURNED_TO_CONFIRMATION", { reason });
  }

  markCompleted(purchaseId: string, orderNumber: string, finalPrice: number): void {
    this.db
      .prepare(
        `UPDATE purchases SET status = 'COMPLETED', coupang_order_number = ?, final_price = ?, updated_at = ?
         WHERE purchase_id = ?`,
      )
      .run(orderNumber, finalPrice, new Date().toISOString(), purchaseId);
    this.recordEvent(purchaseId, "COMPLETED", { orderNumber, finalPrice });
  }

  markPolicyRejected(purchaseId: string, reason: string): void {
    this.setStatus(purchaseId, "POLICY_REJECTED");
    this.recordEvent(purchaseId, "POLICY_REJECTED", { reason });
  }

  markUnknown(purchaseId: string, reason: string): void {
    this.setStatus(purchaseId, "UNKNOWN");
    this.recordEvent(purchaseId, "UNKNOWN", { reason });
  }

  markFailed(purchaseId: string, reason: string): void {
    this.setStatus(purchaseId, "FAILED");
    this.recordEvent(purchaseId, "FAILED", { reason });
  }

  markUserActionRequired(purchaseId: string, reason: string): void {
    this.setStatus(purchaseId, "USER_ACTION_REQUIRED");
    this.recordEvent(purchaseId, "USER_ACTION_REQUIRED", { reason });
  }

  // AWAITING_CONFIRMATION 상태일 때만 취소를 허용한다 (이미 처리 중인 주문은 취소 못 하게 막는다).
  cancelIfAwaitingConfirmation(purchaseId: string): boolean {
    const changed = this.transition(purchaseId, "AWAITING_CONFIRMATION", "CANCELLED");
    return changed;
  }

  markExpired(purchaseId: string): boolean {
    return this.transition(purchaseId, "AWAITING_CONFIRMATION", "EXPIRED");
  }

  // 오늘 하루 COMPLETED 상태로 실제 결제된 총액 (docs/components.md maxDailySpend 검사용).
  getDailySpend(telegramUserId: number, sinceIso: string): number {
    const row = this.db
      .prepare(
        `SELECT COALESCE(SUM(COALESCE(final_price, expected_price)), 0) AS total
         FROM purchases
         WHERE telegram_user_id = ? AND status = 'COMPLETED' AND created_at >= ?`,
      )
      .get(telegramUserId, sinceIso) as { total: number };
    return row.total;
  }

  recordEvent(purchaseId: string, eventType: string, payload?: unknown): void {
    this.db
      .prepare(`INSERT INTO purchase_events (purchase_id, event_type, payload_json, created_at) VALUES (?, ?, ?, ?)`)
      .run(purchaseId, eventType, payload ? JSON.stringify(payload) : null, new Date().toISOString());
  }

  private setStatus(purchaseId: string, status: PurchaseStatus): void {
    this.db
      .prepare(`UPDATE purchases SET status = ?, updated_at = ? WHERE purchase_id = ?`)
      .run(status, new Date().toISOString(), purchaseId);
  }

  private transition(purchaseId: string, from: PurchaseStatus, to: PurchaseStatus): boolean {
    const result = this.db
      .prepare(`UPDATE purchases SET status = ?, updated_at = ? WHERE purchase_id = ? AND status = ?`)
      .run(to, new Date().toISOString(), purchaseId, from);
    const changed = Number(result.changes) > 0;
    if (changed) this.recordEvent(purchaseId, `STATUS_${from}_TO_${to}`);
    return changed;
  }
}

function mapRow(row: PurchaseRow): PurchaseRecord {
  return {
    purchaseId: row.purchase_id,
    telegramUserId: row.telegram_user_id,
    productId: row.product_id,
    productUrl: row.product_url,
    vendorItemId: row.vendor_item_id,
    productName: row.product_name,
    quantity: row.quantity,
    expectedPrice: row.expected_price,
    finalPrice: row.final_price,
    confirmationTokenHash: row.confirmation_token_hash,
    checkoutFingerprint: row.checkout_fingerprint,
    status: row.status as PurchaseStatus,
    coupangOrderNumber: row.coupang_order_number,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
