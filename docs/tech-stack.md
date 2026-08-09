# 추천 기술 스택 / 디렉터리 구조 예시

## 13. 추천 기술 스택

```text
언어: TypeScript
런타임: Node.js
Telegram: grammY 또는 Telegraf
Agent: OpenAI Responses API 또는 사용하는 LLM 프레임워크
MCP: TypeScript MCP SDK
Browser: Playwright
DB: SQLite + Drizzle ORM 또는 Prisma
Queue: 초기에는 DB 기반 단일 워커
Logging: pino
Validation: zod
Secrets: OS keychain 또는 암호화된 환경변수 저장소
```

개인용 MVP는 집 PC, 미니 PC 또는 NAS에서 실행할 수 있다.

```text
로컬 머신
  ├─ Telegram Bot
  ├─ Agent Service
  ├─ MCP Server
  ├─ Purchase Worker
  ├─ SQLite
  └─ Playwright + Coupang 전용 프로필
```

텔레그램 업데이트는 처음에는 polling 방식으로 받아도 되므로 공개 웹 서버가 필수는 아니다.

---

## 14. 디렉터리 구조 예시

```text
coupang-shopping-agent/
├─ apps/
│  ├─ telegram-bot/
│  │  ├─ src/
│  │  │  ├─ handlers/
│  │  │  ├─ keyboards/
│  │  │  └─ index.ts
│  │  └─ package.json
│  └─ worker/
│     ├─ src/
│     │  ├─ jobs/
│     │  ├─ browser/
│     │  └─ index.ts
│     └─ package.json
├─ packages/
│  ├─ agent/
│  ├─ mcp-server/
│  ├─ shopping-service/
│  ├─ policy-engine/
│  ├─ coupang-http-adapter/
│  ├─ coupang-browser-adapter/
│  ├─ database/
│  └─ shared/
├─ data/
│  ├─ coupang-profile/
│  └─ app.db
├─ scripts/
│  ├─ setup-login.ts
│  └─ migrate.ts
├─ .env.example
├─ .gitignore
└─ package.json
```

`.gitignore` 예시:

```gitignore
.env
/data/app.db
/data/coupang-profile/
/playwright/.auth/
*.log
```

> 실제 구현은 위 예시와 완전히 같지는 않다. 현재 워크스페이스 구조는 프로젝트 루트 `.claude/CLAUDE.md`를 참고한다.

---

## 목록

- [docs/README.md](README.md) — 문서 목차
- [docs/roadmap.md](roadmap.md) — MVP 개발 순서
