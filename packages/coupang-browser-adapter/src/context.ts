import { chromium, type BrowserContext } from "playwright";

export interface BrowserAdapterConfig {
  profileDir: string;
  headless: boolean;
}

let contextPromise: Promise<BrowserContext> | null = null;

// 전용 프로필 디렉터리로 persistent context를 하나만 유지한다.
// (동일 프로필을 동시에 여러 프로세스에서 열지 않는다는 md 5장 원칙을 지키기 위함)
export function getBrowserContext(config: BrowserAdapterConfig): Promise<BrowserContext> {
  if (!contextPromise) {
    contextPromise = chromium.launchPersistentContext(config.profileDir, {
      headless: config.headless,
      locale: "ko-KR",
      timezoneId: "Asia/Seoul",
      viewport: { width: 1440, height: 1000 },
    });
  }
  return contextPromise;
}

export async function closeBrowserContext(): Promise<void> {
  if (contextPromise) {
    const context = await contextPromise;
    await context.close();
    contextPromise = null;
  }
}
