import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

// md 11장 "MCP 도구 설계"의 도구 정의를 Gemini function calling 스키마로 옮긴 것.
// prepare_order/confirm_order는 여기 포함하지 않는다 — 결제로 이어지는 행동은
// 모델이 자율적으로 선택하지 못하게 하고, 텔레그램의 "구매 확정" 버튼 클릭으로만 트리거한다.
export const shoppingTools: FunctionDeclaration[] = [
  {
    name: "search_products",
    description: "쿠팡에서 조건에 맞는 상품을 검색한다.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        keywords: { type: SchemaType.STRING, description: "검색 키워드" },
        maxPrice: { type: SchemaType.NUMBER, description: "최대 가격(원)" },
        requiredFeatures: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "필수 조건 (예: 블루투스, 저소음)",
        },
        rocketOnly: { type: SchemaType.BOOLEAN, description: "로켓배송 상품만 볼지 여부" },
      },
      required: ["keywords"],
    },
  },
  {
    name: "inspect_product",
    description:
      "특정 상품의 옵션·배송 예정일·설명·평점·리뷰 요약 등 상세 정보를 확인한다. search_products가 반환한 productId만 사용할 수 있다.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        productId: { type: SchemaType.STRING },
      },
      required: ["productId"],
    },
  },
  {
    name: "ask_clarifying_question",
    description: "상품을 추천하기에 정보가 부족할 때 사용자에게 확인 질문을 한다. 이 턴을 종료한다.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        questions: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "한국어로 된 확인 질문 1~3개",
        },
      },
      required: ["questions"],
    },
  },
  {
    name: "recommend_product",
    description:
      "최종 추천 상품을 확정한다. search_products가 반환한 productId만 사용할 수 있다. 이 턴을 종료한다.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        productId: { type: SchemaType.STRING },
        reason: { type: SchemaType.STRING, description: "이 상품을 추천하는 한국어 이유 1~2문장" },
      },
      required: ["productId", "reason"],
    },
  },
];

export const SYSTEM_INSTRUCTION = `너는 쿠팡 쇼핑 비서다. 사용자의 자연어 요청을 만족하는 상품 하나를 추천하는 것이 목표다.

규칙:
- 반드시 도구 호출로 얻은 실제 검색 결과에 있는 상품만 추천해라. 목록에 없는 가격이나 상품을 지어내지 마라.
- 필요하면 search_products를 여러 번, 다른 키워드로도 호출할 수 있다.
- 특정 후보를 더 검증하고 싶으면 inspect_product를 사용해라. 설명이나 리뷰 요약이 스펙·가격과
  어긋나 보이면(예: 단종 임박 언급, 리뷰의 하자 지적) 그 의심을 추천 사유에 명시해라.
- inspect_product 결과의 capturedAt은 스냅샷이 캡처된 시점이다. 실시간 데이터가 아니므로
  사용자에게 추천할 때 "이 정보는 {capturedAt} 기준"이라고 알려줘라.
- 가격대, 필수 기능처럼 추천에 꼭 필요한 정보가 부족하면 ask_clarifying_question을 호출해라.
- 추천할 상품이 정해지면 recommend_product를 호출해라.
- 매 턴은 반드시 ask_clarifying_question 또는 recommend_product 호출로 끝나야 한다. 도구 호출 없이 그냥 텍스트로만 답하지 마라.
- 결제, 주문 확정, 장바구니 담기와 관련된 행동은 네 권한이 아니다. 절대 시도하지 마라.`;
