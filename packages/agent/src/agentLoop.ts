import type { ChatSession, FunctionCall, Part } from "@google/generative-ai";
import type { Product, ProductDetail, ProductQuery } from "@coupang-agent/shared";

// packages/agent는 실제 브라우저 자동화를 모른다. 검색/상세조회는 앱 계층이 주입한다.
export interface AgentToolExecutor {
  searchProducts(query: ProductQuery): Promise<Product[]>;
  inspectProduct(productId: string, url: string): Promise<ProductDetail>;
}

export type AgentTurnResult =
  | { type: "ask"; questions: string[] }
  | { type: "recommend"; product: Product; reason: string }
  | { type: "exhausted" };

// 한 턴 안에서 모델이 도구를 반복 호출할 수 있는 최대 왕복 횟수. 무한 루프/과다 비용을 막기 위한 안전장치.
const MAX_STEPS = 6;

/**
 * 리즈닝(모델 판단) → 액션(도구 호출) → 관찰(도구 결과 반영) 을
 * 모델이 ask_clarifying_question 또는 recommend_product를 호출할 때까지 반복한다.
 *
 * candidates는 세션 전체에서 공유되는, "모델이 실제로 관찰한 상품"의 신뢰 가능한 저장소다.
 * recommend_product/inspect_product에 전달된 productId는 이 저장소에 있는 것만 허용해서
 * 모델이 지어낸 상품/가격을 그대로 믿지 않도록 한다.
 */
export async function runAgentTurn(
  chat: ChatSession,
  candidates: Map<string, Product>,
  executor: AgentToolExecutor,
  userMessage: string,
): Promise<AgentTurnResult> {
  let response = (await chat.sendMessage(userMessage)).response;

  for (let step = 0; step < MAX_STEPS; step++) {
    const calls = response.functionCalls();

    if (!calls || calls.length === 0) {
      // 모델이 도구 호출 없이 텍스트로만 답했다면 안전하게 확인 질문으로 취급한다.
      return { type: "ask", questions: [response.text() || "요청을 다시 한번 말씀해주시겠어요?"] };
    }

    const result = await handleCalls(calls, candidates, executor);

    if (result.terminal) {
      return result.terminal;
    }

    response = (await chat.sendMessage(result.responseParts)).response;
  }

  return { type: "exhausted" };
}

async function handleCalls(
  calls: FunctionCall[],
  candidates: Map<string, Product>,
  executor: AgentToolExecutor,
): Promise<{ responseParts: Part[]; terminal: AgentTurnResult | null }> {
  const responseParts: Part[] = [];
  let terminal: AgentTurnResult | null = null;

  for (const call of calls) {
    switch (call.name) {
      case "search_products": {
        const query = call.args as ProductQuery;
        const products = await executor.searchProducts(query);
        for (const product of products) candidates.set(product.productId, product);
        responseParts.push(
          toolResponse("search_products", {
            products: products.map((p) => ({
              productId: p.productId,
              name: p.name,
              price: p.price,
              isRocket: p.isRocket,
            })),
          }),
        );
        break;
      }

      case "inspect_product": {
        const { productId } = call.args as { productId: string };
        const product = candidates.get(productId);
        if (!product) {
          responseParts.push(
            toolResponse("inspect_product", { ok: false, error: "알 수 없는 productId입니다." }),
          );
          break;
        }
        const detail = await executor.inspectProduct(productId, product.url);
        responseParts.push(
          toolResponse("inspect_product", {
            options: detail.options,
            deliveryEstimate: detail.deliveryEstimate ?? null,
          }),
        );
        break;
      }

      case "ask_clarifying_question": {
        const { questions } = call.args as { questions?: string[] };
        terminal = { type: "ask", questions: questions ?? [] };
        responseParts.push(toolResponse("ask_clarifying_question", { ok: true }));
        break;
      }

      case "recommend_product": {
        const { productId, reason } = call.args as { productId: string; reason: string };
        const product = candidates.get(productId);
        if (!product) {
          responseParts.push(
            toolResponse("recommend_product", {
              ok: false,
              error: "알 수 없는 productId입니다. search_products 결과에 있는 id만 사용하세요.",
            }),
          );
          break;
        }
        terminal = { type: "recommend", product, reason };
        responseParts.push(toolResponse("recommend_product", { ok: true }));
        break;
      }

      default:
        responseParts.push(toolResponse(call.name, { ok: false, error: "알 수 없는 도구입니다." }));
    }
  }

  return { responseParts, terminal };
}

function toolResponse(name: string, response: object): Part {
  return { functionResponse: { name, response } };
}
