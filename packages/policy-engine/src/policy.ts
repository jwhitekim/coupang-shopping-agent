import type { PurchasePolicy } from "@coupang-agent/shared";

// docs/components.md 4.4장 예시 정책값을 기본값으로 쓴다. 이번 MVP는 허용 사용자 1명·고정
// 정책이라 DB의 purchase_policies 테이블 대신 환경변수로 관리한다.
const DEFAULTS: PurchasePolicy = {
  maxPricePerItem: 50000,
  maxPricePerOrder: 100000,
  maxDailySpend: 200000,
  maxQuantity: 3,
  maxPriceIncrease: 500,
  allowSubscriptions: false,
  confirmationTtlSeconds: 300,
};

function readNumber(env: NodeJS.ProcessEnv, key: string, fallback: number): number {
  const raw = env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadPolicyFromEnv(env: NodeJS.ProcessEnv = process.env): PurchasePolicy {
  return {
    maxPricePerItem: readNumber(env, "POLICY_MAX_PRICE_PER_ITEM", DEFAULTS.maxPricePerItem),
    maxPricePerOrder: readNumber(env, "POLICY_MAX_PRICE_PER_ORDER", DEFAULTS.maxPricePerOrder),
    maxDailySpend: readNumber(env, "POLICY_MAX_DAILY_SPEND", DEFAULTS.maxDailySpend),
    maxQuantity: readNumber(env, "POLICY_MAX_QUANTITY", DEFAULTS.maxQuantity),
    maxPriceIncrease: readNumber(env, "POLICY_MAX_PRICE_INCREASE", DEFAULTS.maxPriceIncrease),
    allowSubscriptions: (env.POLICY_ALLOW_SUBSCRIPTIONS ?? "false") === "true",
    confirmationTtlSeconds: readNumber(
      env,
      "POLICY_CONFIRMATION_TTL_SECONDS",
      DEFAULTS.confirmationTtlSeconds,
    ),
  };
}
