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
