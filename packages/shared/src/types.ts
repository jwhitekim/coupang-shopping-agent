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
}
