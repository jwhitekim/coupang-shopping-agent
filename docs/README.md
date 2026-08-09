# 설계 문서 목차

쿠팡 텔레그램 자동구매 에이전트의 설계 문서. 원래 하나의 파일(`coupang-telegram-shopping-agent.md`)이었던
것을 주제별로 나눴다. 코드를 건드리기 전에 먼저 볼 요약은 프로젝트 루트의 `.claude/CLAUDE.md`를 참고한다.

- [overview.md](overview.md) — 결론 요약, 사용자 경험(대화 예시), 전체 아키텍처
- [components.md](components.md) — Telegram Bot / LLM Agent / Shopping Service / Policy Engine / Coupang Adapter 역할
- [coupang-integration.md](coupang-integration.md) — HTTP vs Playwright 라우팅, 위험도 분류, Playwright 운영 방식
- [order-lifecycle.md](order-lifecycle.md) — 구매 승인 설계, 주문 상태 머신, 중복 결제 방지, 결제 직전 재검증, 구매 워커 의사코드
- [mcp-tools.md](mcp-tools.md) — MCP 도구 설계
- [data-model.md](data-model.md) — SQLite 데이터 모델
- [tech-stack.md](tech-stack.md) — 추천 기술 스택, 디렉터리 구조 예시
- [security-ops.md](security-ops.md) — 보안 체크리스트, 운영·장애 대응
- [roadmap.md](roadmap.md) — MVP 개발 순서(1~5단계), 첫 번째 현실적인 버전 범위, 최종 권장안
- [references.md](references.md) — 참고 문서 링크
