// 검색·추천 범위에 필요한 타입만 정의한다. (실제 구매는 사용자가 직접 진행 — docs/security-ops.md 참고)

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
  description?: string;
  specs?: Record<string, string>;
  rating?: number;
  reviewCount?: number;
  reviewHighlights?: string[];
  // 스냅샷 캡처 시점(ISO 날짜). 라이브 데이터가 아님을 모델·사용자에게 알리기 위한 필드 —
  // docs/snapshot-mode.md 참고. 라이브 어댑터(coupang-browser-adapter)는 비워둔다.
  capturedAt?: string;
}
