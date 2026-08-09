# 쿠팡 텔레그램 상품 추천 에이전트

텔레그램에서 원하는 상품을 자연어로 요청하면 에이전트가 조건을 구체화하고 후보를 추천해주는 개인용
프로젝트다. **실제 구매/결제는 자동화하지 않는다** — `[구매 확정]`을 누르면 상품 링크를 안내하고,
결제는 사용자가 직접 쿠팡에서 진행한다.

전체 설계는 [`docs/README.md`](docs/README.md), 코드를 건드리기 전 알아야 할 요약은
[`.claude/CLAUDE.md`](.claude/CLAUDE.md)에 있다.

## 왜 결제 자동화가 없는가

원래는 Playwright로 로그인부터 결제까지 자동화하는 설계였지만, 실제로 시도해보니 쿠팡이 Akamai
Bot Manager로 자동화 브라우저를 로그인 단계에서부터 차단했다. 이 차단을 우회하는 방법은 시도하지
않기로 하고, 로그인이 필요한 기능(주문 미리보기·결제·정책 엔진)을 전부 제거했다. 지금은 검색·추천
정확도를 높이는 데 집중한다.

## 시작하기

```bash
npm install
cp .env.example .env   # TELEGRAM_BOT_TOKEN, GEMINI_API_KEY 등 채우기
npm run dev:bot        # 텔레그램 봇 실행
```

## 명령어

```bash
npm run dev:bot        텔레그램 봇 개발 실행
npm run typecheck       전 워크스페이스 타입 체크
```

## 안전 원칙

- LLM은 상품 검색·추천만 하고, 결제는 절대 자동으로 진행하지 않는다.
- 쿠팡 로그인·CAPTCHA·봇 탐지는 우회하지 않는다.

자세한 내용은 [`docs/security-ops.md`](docs/security-ops.md) 참고.
