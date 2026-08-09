# CLAUDE.md

쿠팡에서 상품을 텔레그램으로 자연어 요청 → 에이전트가 조건을 구체화하고 후보를 추천하는 개인용
텔레그램 봇. **실제 구매/결제는 자동화하지 않는다** — 봇은 상품 링크를 안내하고, 결제는 사용자가
직접 쿠팡에서 진행한다.

설계 배경과 상세 스펙은 `docs/README.md`부터 읽는다. 이 파일은 코드를 건드리기 전에 알아야 할 것만 담는다.

## 왜 결제/로그인 자동화가 없는가

초기 설계는 Playwright로 쿠팡 로그인·주문·결제까지 자동화하는 것이었다(`docs/roadmap.md`의 3·5단계).
실제로 구현해서 테스트해보니 쿠팡이 Akamai Bot Manager로 Playwright/CDP 기반 브라우저를 로그인
단계에서부터 차단했다(`errors.edgesuite.net` Access Denied). 이 차단을 우회하는 기법(지문 위장,
쿠키 재사용, 비공개 로그인 API 직접 호출 등)은 시도하지 않기로 했다 — 봇 탐지·인증 우회 금지 원칙은
`docs/coupang-integration.md`/`docs/security-ops.md`에 원래부터 있었고, 이번 결정으로 재확인됐다.
그래서 로그인이 필요한 기능(주문 미리보기, 결제, 정책 엔진, 주문 상태 머신)을 전부 제거하고
검색·추천에만 집중하는 쪽으로 범위를 줄였다. `docs/`의 관련 장(7~12, 15~17장 일부, 18장 3·5단계)은
이 결정 이전의 설계 기록으로 남겨두되, 실제 코드와는 더 이상 일치하지 않는다.

## 지금 하는 일

- 텔레그램 대화 → 자연어 조건 구조화 → 상품 검색·비교·추천 (`apps/telegram-bot`, `packages/agent`)
- `[구매 확정]`을 누르면 상품 링크를 안내하고 끝 — 실제 결제는 사용자가 쿠팡에서 직접 진행
- 다음 목표는 **추천 정확도 개선** (더 나은 검색 결과 파싱, 비교 기준, 프롬프트 등) — 구체적인
  방향은 아직 정해지지 않았으니 관련 작업 전에 사용자와 먼저 논의할 것

## 워크스페이스 구조

```text
apps/telegram-bot          텔레그램 봇 (핸들러, 세션, 키보드)
packages/agent              Gemini function calling 기반 추천 루프 (packages/agent/src/agentLoop.ts)
packages/coupang-browser-adapter  Playwright로 쿠팡 검색·상세조회만 수행 (로그인 없음)
packages/shared              공통 타입
```

## 명령어

```text
npm run dev:bot        텔레그램 봇 개발 실행 (.env 필요)
npm run typecheck       전 워크스페이스 tsc --noEmit
```

## 필수 환경변수

`.env.example` 참고 (`TELEGRAM_BOT_TOKEN`, `ALLOWED_TELEGRAM_USER_ID`, `GEMINI_API_KEY`, `COUPANG_HEADLESS`).

## 핵심 안전 원칙

- LLM은 `search_products`/`inspect_product`/`ask_clarifying_question`/`recommend_product`만 호출한다.
- 텔레그램에 비밀번호·쿠키·카드번호를 보내지 않는다.
- 쿠팡 로그인·CAPTCHA·봇 탐지는 우회하지 않는다 (기술적으로도, 정책적으로도).
- 셀렉터(`packages/coupang-browser-adapter/src/selectors.ts`)는 실제 DOM으로 검증된 값이 아니라 추정치다.
