// 1~2단계 범위에 필요한 타입만 정의한다. (주문 확정/정책 엔진 타입은 3단계에서 추가)

export interface ProductQuery {
  keywords: string;
  maxPrice?: number;
  requiredFeatures?: string[];
  rocketOnly?: boolean;
}

export interface Product {
  productId: string;
  vendorItemId?: string;
  name: string;
  price: number;
  url: string;
  isRocket: boolean;
}

export interface ProductOption {
  vendorItemId: string;
  name: string;
}

export interface ProductDetail extends Product {
  options: ProductOption[];
  deliveryEstimate?: string;
}

export interface PrepareOrderInput {
  productId: string;
  vendorItemId: string;
  quantity: number;
}

// Playwright로 주문서까지 진입해 읽은 값. 결제는 실행하지 않은 상태의 스냅샷이다.
export interface OrderSnapshot {
  productId: string;
  vendorItemId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  shippingFee: number;
  shippingAddress: string;
  deliveryEstimate?: string;
  isSubscription: boolean;
  capturedAt: string;
}

// 3단계(안전한 결제) 범위에서 추가된 타입. docs/order-lifecycle.md 8장 상태 머신 그대로.
export type PurchaseStatus =
  | "AWAITING_CONFIRMATION"
  | "VALIDATING"
  | "EXECUTING"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "POLICY_REJECTED"
  | "USER_ACTION_REQUIRED"
  | "UNKNOWN"
  | "FAILED";

// docs/components.md 4.4장 정책. allowedCategories는 현재 검색 결과가 카테고리를
// 제공하지 않아 이번 범위에서 제외했다 (packages/policy-engine/src/validatePolicy.ts 참고).
export interface PurchasePolicy {
  maxPricePerItem: number;
  maxPricePerOrder: number;
  maxDailySpend: number;
  maxQuantity: number;
  maxPriceIncrease: number;
  allowSubscriptions: boolean;
  confirmationTtlSeconds: number;
}

export interface PolicyResult {
  ok: boolean;
  reason?: string;
}

// 결제 직전에 prepareOrder를 다시 호출해 얻은 실시간 주문서 값. OrderSnapshot과 구조는
// 같지만 "지금 이 순간 다시 읽은 값"이라는 의미를 명확히 하기 위해 별도 이름을 쓴다.
export type CheckoutSnapshot = OrderSnapshot;

// commitOrder는 새로 페이지를 열지 않는다 — 직전에 prepareOrder로 진입해 둔 주문서 화면에서
// 결제 버튼만 클릭한다 (동일한 page 인스턴스를 재사용하는 CoupangBrowserAdapter 내부 구조를 전제).
export interface CommitOrderInput {
  purchaseId: string;
}

export interface OrderResult {
  status: "COMPLETED" | "UNKNOWN";
  orderNumber?: string;
  finalPrice?: number;
}

export interface ReconcileOrderInput {
  expectedProductName: string;
  expectedPrice: number;
  // 이 시각(ISO) 이후에 생성된 주문만 대조 대상으로 본다.
  since: string;
}
