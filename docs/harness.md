# 개발 하네스 구성 (`.claude/`) — 2026-08-22

## 왜 이 문서가 있는가

세션이 끝나면 대화 맥락은 사라진다. `.claude/`를 지금 이렇게 구성했고 나머지는 왜 안 만들었는지가
대화 로그에만 남아있으면, 다음 세션(또는 다른 사람)이 같은 질문을 처음부터 다시 해야 한다.
**결정과 이유는 Claude의 개인 메모리가 아니라 이런 저장소 파일에 남긴다** — 개인 메모리는 git에
안 잡히고 이 저장소 밖의 Claude 계정에 묶여 있어서, 저장소 파일이 아니면 팀/미래의 나에게는
"존재하지 않는 것"과 같다.

## 지금 있는 것

- `CLAUDE.md` (프로젝트 루트) — 항상 로드되는 요약. 원래 `.claude/CLAUDE.md`에 있었는데
  2026-08-22에 루트로 옮겼다. 두 위치 다 공식 문서 기준 유효하지만, 같은 레벨에 둘 다 있을 때
  우선순위가 문서화돼 있지 않아서 하나만 남기는 쪽을 택함.
- `.claude/settings.json` — Stop 훅이 `npm run typecheck`를 돌린다. 원래 `pytest`/`mypy`/`ruff`
  (Python 프로젝트 템플릿 잔재)였고, `app/` 디렉토리 존재 여부로 조건 분기가 걸려있어서 이 저장소
  (`apps/`, TypeScript, 테스트/lint 설정 없음)에서는 매번 조용히 no-op되고 있었다 — 2026-08-22에
  고침.
- `.claude/skills/` — `approval-check`, `commit-and-push`, `plan`, `record-lesson`,
  `trim-claude-md`, `verify-completion`, `add-snapshot`(2026-08-22 추가, 스냅샷 캡처 절차 —
  [snapshot-mode.md](snapshot-mode.md) 참고).

## 해결한 이슈

- `commit-and-push`, `verify-completion` 스킬에 남아있던 `pytest`/`mypy`/`ruff`(Python 템플릿
  잔재, `settings.json` Stop 훅과 원인이 같았음)를 `npm run typecheck`로 교체했다(2026-08-22).
  `approval-check`의 `alembic upgrade`(Python 전용 마이그레이션 도구)도 "DB 마이그레이션 실행"으로
  일반화했다 — 이 프로젝트엔 아직 DB가 없다.

## 왜 나머지는 안 만들었는가

| 항목 | 상태 | 다시 만들 조건 |
|---|---|---|
| `.mcp.json` | 없음 | 이 프로젝트가 MCP 서버를 쓰게 되면 |
| `.worktreeinclude` | 없음 | git worktree로 병렬 작업을 시작하면 |
| `.claude/settings.local.json` | 없음 | 개인 권한 오버라이드가 필요해지면 |
| `.claude/rules/` | 없음 | 특정 경로에만 적용되는 실행 가능한 지시문이 생기면 (공식 문서 기준 배경 설명은 `docs/`가 맞는 자리) |
| `.claude/commands/` | 없음 | skills와 기능이 겹쳐서 우선순위 낮음 |
| `.claude/agents/*.md` | 없음 | 반복되는 고정 역할이 실제로 필요해지면 — 후보: 읽기 전용 "CLAUDE.md/docs/skills 참조 일관성 감사" 에이전트 (2026-08-22 논의, 미확정) |
| `.claude/workflows/*.js` | 없음 | 서브에이전트 여러 개를 조율할 일이 생기면 |
| `.claude/output-styles/*.md` | 없음 | 요청된 시스템 프롬프트 커스터마이징이 생기면 |
| `.claude/agent-memory/` | 없음 | 서브에이전트를 실제로 쓰기 시작하면 (지금은 서브에이전트 자체를 안 씀) |

## 세션 간 연속성 원칙

- 결정과 이유는 `CLAUDE.md` 또는 `docs/`에 적는다. 배경 설명이 필요한 결정은 `docs/`, 매번 지켜야
  하는 짧은 규칙은 `CLAUDE.md` (`record-lesson` 스킬의 분류 기준과 동일).
- 커밋되지 않은 변경은 디스크엔 남아있지만 "왜 이렇게 했는지"가 커밋 메시지에 없으면 `git log`로
  추적이 안 된다. 작업 단계가 끝나면 커밋한다 (`commit-and-push` 스킬).
