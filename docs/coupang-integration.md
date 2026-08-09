# HTTP 분석과 Playwright의 역할 분담 / 운영 방식

## 5. HTTP 분석과 Playwright의 역할 분담

### 추천 라우팅

```text
상품 검색       → HTTP 우선, 실패 시 Browser
상품 상세       → HTTP 우선, 실패 시 Browser
배송 예정일     → HTTP 우선, 화면에서 최종 검증
장바구니        → Browser 권장
주문서 생성     → Browser 권장
최종 결제       → Browser 전용
주문 결과 확인  → Browser 또는 안정적인 조회 경로
```

### 위험도 분류

```text
GREEN
- 상품 검색
- 상품 상세
- 가격 조회
- 배송 정보
- 리뷰 요약용 데이터

YELLOW
- 장바구니 추가
- 수량 변경
- 주문서 생성
- 쿠폰 적용

RED
- 결제 실행
- 쿠페이 인증
- 계정 재인증
- CAPTCHA
```

`GREEN`부터 HTTP 어댑터로 옮기고, `YELLOW`는 충분히 검증한 뒤 제한적으로 사용한다. `RED`는 정상 브라우저 흐름에 남긴다.

### 중요한 원칙

비공개 요청 구조를 관찰하더라도 다음을 시도하지 않는다.

- 인증이나 접근 통제 우회
- CAPTCHA 우회
- 결제 인증 우회
- 타인 계정 또는 세션 사용
- 과도한 호출이나 대량 수집

비공개 API는 언제든 변경될 수 있고 서비스 정책이나 계정 제한 위험이 있다. 따라서 HTTP 방식은 최적화 수단이지, 시스템 전체가 의존해야 하는 핵심 계약으로 보지 않는다.

---

## 6. Playwright 운영 방식

### 기본 전략

```text
최초 설정:
headed 실행 → 사용자가 직접 로그인·인증 → 전용 프로필 저장

평상시:
headless 실행 → 검색·주문·결제

추가 인증 발생:
자동화 중지 → 사용자에게 알림 → headed 모드로 직접 처리
```

예시:

```ts
import { chromium } from "playwright";

const context = await chromium.launchPersistentContext(
  "./data/coupang-profile",
  {
    headless: true,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    viewport: { width: 1440, height: 1000 },
  },
);

const page = context.pages()[0] ?? await context.newPage();
```

주의사항:

- 평소 사용하는 Chrome 프로필이 아닌 자동구매 전용 프로필을 사용한다.
- 같은 프로필을 동시에 여러 프로세스에서 열지 않는다.
- 구매 작업은 큐로 한 번에 하나씩 처리한다.
- 쿠키와 프로필 디렉터리는 암호화 또는 강한 파일 권한으로 보호한다.
- 프로필, 쿠키, 인증 상태 파일을 Git에 커밋하지 않는다.

### 사용자 개입 상태

다음 상황에서는 결제를 중단한다.

- 로그인 만료
- 문자 또는 기기 인증
- CAPTCHA
- 결제수단 추가 확인
- 약관 또는 팝업 재동의
- 비정상 접근 안내

반환 예시:

```json
{
  "status": "USER_ACTION_REQUIRED",
  "reason": "LOGIN_OR_PAYMENT_REAUTHENTICATION"
}
```

---

## 목록

- [docs/README.md](README.md) — 문서 목차
- [docs/security-ops.md](security-ops.md) — 보안 체크리스트, 운영·장애 대응
