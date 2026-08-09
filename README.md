# 쿠팡 텔레그램 자동구매 에이전트

텔레그램에서 원하는 상품을 자연어로 요청하면 에이전트가 조건을 구체화하고 후보를 추천한다. `[구매 확정]`
버튼을 누르면 정책 엔진과 주문 상태 머신을 거쳐 로컬 Playwright 실행기가 쿠팡에서 주문/결제를 수행하고
결과를 텔레그램으로 알려주는 개인용 프로젝트다.

전체 설계는 [`docs/README.md`](docs/README.md), 코드를 건드리기 전 알아야 할 요약은
[`.claude/CLAUDE.md`](.claude/CLAUDE.md)에 있다.

## 현재 상태

- 1단계(텔레그램 대화·상품 추천), 2단계(Playwright 주문 미리보기), 3단계(정책 엔진·안전한 결제),
  5단계(복구·운영) 코드가 구현되어 있다.
- 4단계(HTTP 조회 최적화)는 보류 상태다.
- `commitOrder`/`reconcileOrder`(실제 결제·주문내역 대조)는 **아직 실제 쿠팡 계정으로 실행해본 적이
  없다.** `packages/coupang-browser-adapter/src/selectors.ts`의 셀렉터가 실제 DOM으로 검증되지 않은
  추정치이기 때문이다. 실제로 쓰기 전에 반드시 로그인된 브라우저에서 셀렉터를 직접 확인해야 한다.

## 시작하기

```bash
npm install
cp .env.example .env   # TELEGRAM_BOT_TOKEN, GEMINI_API_KEY 등 채우기
npm run setup-login    # headed 브라우저로 쿠팡 최초 로그인, 프로필 저장
npm run dev:bot        # 텔레그램 봇 실행
```

Node 22.5 이상이 필요하다 (`packages/database`가 내장 `node:sqlite`를 쓴다).

## 명령어

```bash
npm run dev:bot             텔레그램 봇 개발 실행
npm run setup-login          headed 브라우저로 쿠팡 최초 로그인
npm run reconcile-unknown    UNKNOWN 상태 구매를 주문내역과 재대조
npm run typecheck            전 워크스페이스 타입 체크
npm test                     순수 로직 단위 테스트
```

## 안전 원칙

- LLM은 상품 검색·추천만 하고, 결제는 직접 조작하지 않는다 — 결제는 사람의 버튼 클릭으로만 시작된다.
- 결제 결과가 불명확하면 자동으로 재결제하지 않고 주문내역부터 대조한다.
- CAPTCHA·재로그인·추가 인증은 우회하지 않고 사용자가 직접 처리하도록 넘긴다.
- 쿠팡 프로필/쿠키/DB 파일은 Git에 커밋하지 않는다 (`.gitignore` 확인).

자세한 내용은 [`docs/security-ops.md`](docs/security-ops.md), [`docs/order-lifecycle.md`](docs/order-lifecycle.md) 참고.
