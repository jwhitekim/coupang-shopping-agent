# CLAUDE.md

쿠팡에서 상품을 텔레그램으로 자연어 요청 → 에이전트가 조건을 구체화하고 후보를 추천 → 사용자가 버튼으로
구매를 확정하면 로컬 실행기가 쿠팡에서 주문/결제를 수행하는 개인용 자동구매 에이전트.

설계 배경과 상세 스펙은 `docs/README.md`부터 읽는다. 이 파일은 코드를 건드리기 전에 알아야 할 것만 담는다.

## 구현 단계 (docs/roadmap.md 기준)

- **1단계 완료**: 텔레그램 대화, 자연어 조건 구조화, 상품 추천 (`apps/telegram-bot`, `packages/agent`)
- **2단계 완료**: Playwright로 주문서까지 진입해 미리보기만 표시, 결제 버튼은 누르지 않음 (`packages/coupang-browser-adapter`)
- **3단계 이후**: 안전한 결제(정책 엔진·주문 상태 머신), HTTP 조회 최적화, 복구/운영 — 진행 중인 것만 반영해서 이 섹션을 갱신할 것

## 워크스페이스 구조

```text
apps/telegram-bot          텔레그램 봇 (핸들러, 세션, 키보드)
packages/agent              Gemini function calling 기반 추천 루프 (packages/agent/src/agentLoop.ts)
packages/coupang-browser-adapter  Playwright로 쿠팡 검색·상세·주문서 조회
packages/shared              공통 타입
scripts/setup-login.ts       최초 1회 headed 브라우저로 쿠팡 로그인, 프로필 저장
```

## 명령어

```text
npm run dev:bot        텔레그램 봇 개발 실행 (.env 필요)
npm run setup-login     headed 브라우저로 쿠팡 최초 로그인
npm run typecheck       전 워크스페이스 tsc --noEmit
```

## 필수 환경변수

`.env.example` 참고 (`TELEGRAM_BOT_TOKEN`, `ALLOWED_TELEGRAM_USER_ID`, `GEMINI_API_KEY`, `COUPANG_PROFILE_DIR` 등).

## 핵심 안전 원칙 (자세한 내용은 docs/security-ops.md, docs/order-lifecycle.md)

- LLM은 `search_products`/`inspect_product`/`ask_clarifying_question`/`recommend_product`만 호출한다.
  결제로 이어지는 도구(`confirm_order` 등)는 모델에게 주지 않는다 — 오직 사람의 버튼 클릭으로만 트리거된다.
- 텔레그램에 비밀번호·쿠키·카드번호를 보내지 않는다.
- 쿠팡 프로필/쿠키/인증 상태 파일은 Git에 커밋하지 않는다 (`.gitignore` 확인).
- 결제 결과가 불명확하면 자동 재결제하지 않고 주문내역부터 대조한다.
- CAPTCHA·재로그인·추가 인증은 우회하지 않고 사용자 개입 상태(`USER_ACTION_REQUIRED`)로 전환한다.
- `packages/coupang-browser-adapter/src/selectors.ts`의 셀렉터는 실제 쿠팡 DOM으로 검증된 값이 아니라
  추정치다. 결제 관련 코드를 실행하기 전 반드시 로그인된 브라우저에서 직접 확인한다.
