import "dotenv/config";
import { chromium } from "playwright";

async function main() {
  const profileDir = process.env.COUPANG_PROFILE_DIR ?? "./data/coupang-profile";

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    viewport: { width: 1440, height: 1000 },
  });

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("https://login.coupang.com/login/login.pang");

  console.log("브라우저 창에서 쿠팡에 직접 로그인하세요.");
  console.log("로그인을 마친 뒤 이 터미널에서 Enter 키를 누르면 세션이 저장되고 종료됩니다.");

  await waitForEnter();

  await context.close();
  console.log(`로그인 세션이 ${profileDir} 에 저장되었습니다.`);
}

function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => resolve());
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
