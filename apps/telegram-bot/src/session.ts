import type { ChatSession } from "@google/generative-ai";
import type { Product } from "@coupang-agent/shared";

export interface UserSession {
  locked: boolean;
  // 사용자 1명당 하나. 모델의 리즈닝/도구 호출 히스토리를 SDK가 여기 안에 유지한다.
  chat: ChatSession | null;
  // 이번 대화에서 모델이 도구 호출로 실제 관찰한 상품들 (신뢰 가능한 원본).
  candidates: Map<string, Product>;
}

// DB는 3단계에서 도입한다. 1~2단계는 단일 사용자 MVP이므로 메모리 상태로 충분하다.
const sessions = new Map<number, UserSession>();

export function getSession(userId: number): UserSession {
  let session = sessions.get(userId);
  if (!session) {
    session = { locked: false, chat: null, candidates: new Map() };
    sessions.set(userId, session);
  }
  return session;
}

export function resetSession(userId: number): void {
  const session = getSession(userId);
  session.chat = null;
  session.candidates = new Map();
}
