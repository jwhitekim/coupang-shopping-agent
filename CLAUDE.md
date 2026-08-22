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

## 왜 상품 검색도 API로 자동화돼 있지 않은가 (2026-08-12 확인, 2026-08-22 재확인)

로그인·결제를 걷어낸 뒤 남은 "검색·추천"조차 실제로는 동작하지 않는다.

- **쿠팡 Playwright 스크래핑**: 로그인 없이 검색 페이지(`/np/search`)만 열어도 Akamai가 403 Access
  Denied로 차단한다 — 로그인 단계뿐 아니라 검색까지 막혀있다.
- **쿠팡 공식 API**: 마켓플레이스 판매자(Wing) API(`developers.coupang.com`)는 본인이 등록한 상품만
  조회 가능해서 전체 카탈로그 검색에 쓸 수 없다. 쿠팡파트너스 Open API는 상품 검색 엔드포인트가 있지만
  발급은 "최종 승인된 파트너"만 가능하고, 승인 심사 자체가 공개 광고 채널(블로그/앱 등)을 전제로 한다 —
  비공개 개인용 봇은 이 심사 대상이 아니다.
- **네이버 쇼핑 검색 API**: `developers.naver.com`에서 신규 애플리케이션을 만들면 "검색" API 자체가
  선택지에 없다. 예전에 만든 레거시 앱엔 "검색"이 남아있어 뉴스·블로그 등은 되지만, 쇼핑·책 카테고리만
  별도로 막혀있다. **2026-08-22 재확인**: 신규 발급받은 client id/secret으로 직접 테스트한 결과,
  같은 자격증명으로 `news.json`은 정상 동작(200)하지만 `shop.json`은 `SE05: 존재하지 않는 검색
  api 입니다`(404)로 막혀있다 — 계정·자격증명 문제가 아니라 쇼핑 카테고리 자체가 신규 발급
  대상에서 빠져있다는 뜻. 네이버 클라우드 플랫폼 "API HUB"는 지금 "쇼핑인사이트"(분야별/키워드별
  검색 클릭 추이, 0~100 상댓값)만 제공하고, 상품명·가격 등 실제 카탈로그 조회는 응답 스키마에
  아예 없다 — 상품 목록 조회 자체를 대체할 API가 없다.
- **네이버쇼핑 검색 웹페이지**(비-API, `search.shopping.naver.com`)도 자동화 접근이 막혀있다
  (2026-08-22 확인): HTTP 418, "비정상적인 접근이 감지될 경우... 접속을 일시적으로 제한"이라는
  명시적 봇 차단 메시지.

즉 상품명·가격·재고를 실시간으로 가져올 방법이 현재 없다. 이 차단들을 우회하는 시도(지문 위장,
쿠키 재사용, 비공개 API 직접 호출)는 하지 않는다 — 위 "왜 결제/로그인 자동화가 없는가"와 같은
원칙이다. 다른 쇼핑몰(11번가, G마켓 등)도 상품 데이터는 판매자/제휴 등록을 전제로 API를 열어주는
동일한 정책이라, 비슷한 결과가 나올 가능성이 높다.

**현재 상태 (2026-08-21 전환 완료, 계획 아님):** `search_products`/`inspect_product`는 라이브
스크래핑 대신 `packages/snapshot-adapter`를 통해 사람이 직접 쿠팡에서 캡처한 상품 스냅샷을
읽는다 — 이미 구현·배선까지 끝났다. 다만 실제 스냅샷 데이터는 아직 캡처 전이라 지금은 검색
결과가 비어있다. 근거·스키마·캡처 절차 상세는 [docs/snapshot-mode.md](docs/snapshot-mode.md)와
[packages/snapshot-adapter/README.md](packages/snapshot-adapter/README.md), 캡처는 `/add-snapshot`
스킬 참고.

## 지금 하는 일

- 텔레그램 대화 → 자연어 조건 구조화 (`apps/telegram-bot`, `packages/agent`)
- 검색·조회는 스냅샷 기반이다 (위 "현재 상태" 참고) — 스냅샷이 없으면 결과가 비어서 봇은 확인
  질문만 반복한다.
- `[구매 확정]`을 누르면 상품 링크를 안내하고 끝 — 실제 결제는 사용자가 쿠팡에서 직접 진행

## 워크스페이스 구조

```text
apps/telegram-bot          텔레그램 봇 (핸들러, 세션, 키보드)
packages/agent              Gemini function calling 기반 추천 루프 (packages/agent/src/agentLoop.ts)
packages/snapshot-adapter    사람이 직접 캡처한 상품 스냅샷을 읽는 어댑터 — 지금 실제로 쓰이는 검색·조회 구현
packages/coupang-browser-adapter  Playwright 쿠팡 검색·상세조회 — 현재 미사용(Akamai 차단). 라이브
                             접근 경로가 생기면 재사용 예정으로 남겨둠
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
- `ProductDetail`에는 `description`/`specs`/`rating`/`reviewCount`/`reviewHighlights`/`capturedAt`이
  있고 `inspect_product`가 전부 모델에 전달한다(`packages/agent/src/agentLoop.ts`).
- 모델은 설명·리뷰가 스펙/가격과 어긋나 보이면 그 의심을 추천 사유에 명시하고, `capturedAt`(실시간
  아님)을 사용자에게 항상 알려야 한다 — 시스템 지시문(`packages/agent/src/tools.ts`)에 있음.
