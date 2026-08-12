import type { ChatSession, GenerativeModel } from "@google/generative-ai";
import { SYSTEM_INSTRUCTION, shoppingTools } from "./tools.js";

// 사용자 한 명당 하나씩 유지하는 대화 세션. 히스토리(도구 호출 포함)는 SDK가 내부에서 관리한다.
export function createShoppingChat(model: GenerativeModel): ChatSession {
  return model.startChat({
    tools: [{ functionDeclarations: shoppingTools }],
    // startChat()에 넘기는 systemInstruction은 SDK가 문자열→Content 변환을 해주지 않아서
    // (getGenerativeModel 생성 시점의 systemInstruction만 변환됨) 직접 Content 형태로 넘긴다.
    // 문자열 그대로 넘기면 일부 모델(예: gemini-3.1 계열)이 400으로 거부한다.
    systemInstruction: { role: "system", parts: [{ text: SYSTEM_INSTRUCTION }] },
  });
}
