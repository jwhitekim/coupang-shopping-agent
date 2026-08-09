import type { ChatSession, GenerativeModel } from "@google/generative-ai";
import { SYSTEM_INSTRUCTION, shoppingTools } from "./tools.js";

// 사용자 한 명당 하나씩 유지하는 대화 세션. 히스토리(도구 호출 포함)는 SDK가 내부에서 관리한다.
export function createShoppingChat(model: GenerativeModel): ChatSession {
  return model.startChat({
    tools: [{ functionDeclarations: shoppingTools }],
    systemInstruction: SYSTEM_INSTRUCTION,
  });
}
