import { Bot } from "grammy";
import { config } from "./config.js";
import { requireAllowedUser } from "./auth.js";
import { handleCallback } from "./handlers/callback.js";
import { handleMessage } from "./handlers/message.js";
import { getSession } from "./session.js";

const bot = new Bot(config.botToken);

bot.use(requireAllowedUser);

bot.command("start", async (ctx) => {
  await ctx.reply("안녕하세요. 원하시는 상품을 자연어로 말씀해주세요. 예) 맥북에 쓸 무선 마우스 5만원 이하로 사줘");
});

// md 4.1: /stop 명령으로 전체 구매 기능 잠금
bot.command("stop", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  getSession(userId).locked = true;
  await ctx.reply("구매 기능을 잠갔습니다. 다시 시작하려면 /start_purchase 를 입력하세요.");
});

bot.command("start_purchase", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  getSession(userId).locked = false;
  await ctx.reply("구매 기능 잠금을 해제했습니다.");
});

bot.on("message:text", handleMessage);
bot.on("callback_query:data", handleCallback);

bot.catch((err) => {
  // err(BotError)는 ctx(봇 토큰 포함)를 프로퍼티로 들고 있어서, err 객체 전체를 찍으면
  // 로그에 토큰이 평문으로 노출된다. message/stack(원본 에러 것)만 남긴다.
  console.error("Bot error:", err.message, err.stack);
});

bot.start();

console.log("Telegram shopping bot started.");
