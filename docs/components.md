# 각 구성요소의 역할

### 4.1 Telegram Bot

담당 기능:

- 개인 채팅에서 자연어 구매 요청 수신
- 요구사항 확인 질문
- 상품 후보와 최종 주문 정보 표시
- `[구매 확정]`, `[다른 후보]`, `[취소]` 버튼 제공
- 구매 결과 및 오류 알림
- `/stop` 명령으로 전체 구매 기능 잠금

텔레그램에는 비밀번호, 쿠키, 카드번호, 결제 비밀번호를 보내지 않는다.

### 4.2 LLM Agent

담당 기능:

- 자연어 요구사항을 구조화된 조건으로 변환
- 부족한 조건을 질문
- 상품 후보를 비교하고 추천 이유 설명
- MCP 도구 호출

> **구현 노트 (1~2단계):** 단순히 LLM을 한 번 호출해 조건을 분류하고, 다시 한 번 호출해 순위를 매기는
> 고정 파이프라인으로는 "에이전트"라 부르기 어렵다. 실제 구현은 Gemini function calling으로
> `search_products` / `inspect_product` / `ask_clarifying_question` / `recommend_product` 도구를
> 모델에 쥐여주고, 모델이 스스로 다음 행동을 고르고(액션) 도구 결과를 관찰한 뒤 다시 판단하는
> 리즈닝→액션→관찰 루프를 최대 6회 왕복까지 반복한다 (`packages/agent/src/agentLoop.ts`).
> 도구 호출 없이 텍스트로만 답하는 것은 시스템 프롬프트로 금지하고, 루프는 반드시
> `ask_clarifying_question` 또는 `recommend_product` 호출로 끝난다.
> `prepare_order`/`confirm_order`처럼 결제로 이어질 수 있는 도구는 모델에게 주지 않는다 —
> 텔레그램의 "구매 확정" 버튼 클릭이라는 사람의 명시적 행동으로만 트리거된다.

LLM이 해서는 안 되는 일:

- 임의의 URL이나 DOM 선택자로 직접 결제
- 프롬프트에 전달된 가격을 최종 가격으로 간주
- 결제 실패 시 자체 판단으로 재결제
- CAPTCHA 또는 추가 인증 우회

### 4.3 Shopping Service

담당 기능:

- 상품 검색 및 상세 정보 통합
- 후보 목록 정규화
- 주문 스냅샷 생성
- 주문 상태 머신 관리
- HTTP/Playwright 경로 선택
- 주문 내역 대조와 복구

### 4.4 Policy Engine

모델의 판단과 별개로 서버에서 반드시 실행한다.

예시 정책:

```json
{
  "maxPricePerItem": 50000,
  "maxPricePerOrder": 100000,
  "maxDailySpend": 200000,
  "maxQuantity": 3,
  "allowedCategories": ["생필품", "식품", "전자기기"],
  "allowSubscriptions": false,
  "allowGiftCards": false,
  "allowedAddressId": "home",
  "maxPriceIncrease": 500,
  "confirmationTtlSeconds": 300
}
```

검사 항목:

- 허용된 텔레그램 사용자 여부
- 개인 채팅 여부
- 상품과 옵션 일치 여부
- 수량 및 주문 금액 한도
- 일일 누적 구매 금액
- 정기배송 여부
- 배송지 일치 여부
- 가격 상승 허용 범위
- 주문 확인 토큰 유효기간
- 이미 처리된 주문인지 여부

### 4.5 Coupang Adapter

공통 인터페이스 예시:

```ts
interface CoupangAdapter {
  searchProducts(query: ProductQuery): Promise<Product[]>;
  inspectProduct(input: InspectProductInput): Promise<ProductDetail>;
  prepareOrder(input: PrepareOrderInput): Promise<OrderSnapshot>;
  commitOrder(input: CommitOrderInput): Promise<OrderResult>;
  reconcileOrder(input: ReconcileOrderInput): Promise<OrderResult | null>;
}
```

구현체:

```text
HttpCoupangAdapter
- 검색
- 상세 정보
- 가격·배송 정보
- 안정적으로 확인된 읽기 요청

BrowserCoupangAdapter
- 실제 상품 페이지 검증
- 옵션 선택
- 주문서 진입
- 최종 가격·배송지 검사
- 결제 버튼 클릭
- 주문번호 확인
```

---

## 목록

- [docs/README.md](README.md) — 문서 목차
- [docs/coupang-integration.md](coupang-integration.md) — HTTP/Playwright 라우팅과 운영 방식
- [docs/order-lifecycle.md](order-lifecycle.md) — 구매 승인, 상태 머신, 중복 결제 방지
