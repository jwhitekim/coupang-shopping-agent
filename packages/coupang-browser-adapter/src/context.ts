import { chromium, type BrowserContext } from "playwright";

export interface BrowserAdapterConfig {
  headless: boolean;
}

let contextPromise: Promise<BrowserContext> | null = null;

// 검색·상세조회만 하므로 로그인 세션을 유지할 이유가 없다 — 매번 새 컨텍스트를 쓴다.
// (쿠팡 로그인 자동화는 Akamai 봇 탐지에 막혀서 이 프로젝트 범위에서 제외했다. docs/security-ops.md 참고)
export function getBrowserContext(config: BrowserAdapterConfig): Promise<BrowserContext> {
  if (!contextPromise) {
    contextPromise = chromium.launch({ headless: config.headless }).then((browser) =>
      browser.newContext({
        locale: "ko-KR",
        timezoneId: "Asia/Seoul",
        viewport: { width: 1440, height: 1000 },
      }),
    );
  }
  return contextPromise;
}

export async function closeBrowserContext(): Promise<void> {
  if (contextPromise) {
    const context = await contextPromise;
    await context.browser()?.close();
    contextPromise = null;
  }
}
