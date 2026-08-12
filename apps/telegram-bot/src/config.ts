import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`환경변수 ${name}가 설정되지 않았습니다. .env를 확인하세요.`);
  return value;
}

export const config = {
  botToken: required("TELEGRAM_BOT_TOKEN"),
  allowedUserId: Number(required("ALLOWED_TELEGRAM_USER_ID")),
  geminiApiKey: required("GEMINI_API_KEY"),
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite",
  headless: (process.env.COUPANG_HEADLESS ?? "true") === "true",
};
