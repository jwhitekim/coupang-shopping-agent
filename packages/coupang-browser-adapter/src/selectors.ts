// 주의: 아래 선택자는 실제 쿠팡 페이지에 접속해 검증한 값이 아니라 추정치다.
// (이 환경에서는 브라우저로 쿠팡 DOM을 직접 확인할 수 없었음)
// 실제 사용 전에 반드시 로그인된 브라우저에서 각 선택자가 맞는지 확인하고 수정해야 한다.

export const selectors = {
  search: {
    resultItem: "#product-list li.search-product",
    name: "div.name",
    price: "strong.price-value",
    rocketBadge: "span.badge.rocket, img[alt='로켓배송']",
    link: "a.search-product-link",
  },
  product: {
    name: "h2.prod-buy-header__title, h1.prod-buy-header__title",
    optionSelect: "select.prod-option__select",
    buyNowButton: "button.prod-buy-btn, a.buy-now",
  },
  checkout: {
    quantityInput: "input[name='quantity'], input.quantity",
    totalPayment: "#totalPayAmount, .total-payment .total-price",
    shippingFee: ".delivery-fee, .shipping-fee",
    shippingAddress: ".shipping-address .address, .delivery-address",
    deliveryEstimate: ".arrival-date, .delivery-date",
    subscriptionBadge: ".subscription-badge, .rocket-fresh-subscription",
    // 3단계에서만 사용한다. prepareOrder는 이 요소를 절대 클릭하지 않는다 — commitOrder.ts 참고.
    payButton: "#pay-button, button.payment-button",
  },
  orderComplete: {
    orderNumber: ".order-number, .complete-order-id",
    finalPrice: ".complete-total-price, .order-complete .total-price",
  },
  orderHistory: {
    listUrl: "https://mc.coupang.com/ms/mypage/order/list",
    row: ".order-list-item, li.order-item",
    orderNumber: ".order-number, .order-id",
    productName: ".product-name, .item-name",
    price: ".order-price, .item-price",
    orderedAt: ".order-date, .ordered-date",
  },
};
