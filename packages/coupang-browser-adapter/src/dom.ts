import type { Page } from "playwright";

// prepareOrder.ts / commitOrder.ts / reconcileOrder.ts가 공통으로 쓰는 최소한의 DOM 유틸.
export function isLoginPage(url: string): boolean {
  return url.includes("login.coupang.com") || url.includes("/login");
}

export async function readAmount(page: Page, selector: string): Promise<number> {
  const text = await page.locator(selector).first().textContent().catch(() => null);
  if (!text) return 0;
  const digits = text.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

export async function readText(page: Page, selector: string): Promise<string | undefined> {
  const text = await page.locator(selector).first().textContent().catch(() => null);
  return text?.trim() || undefined;
}
