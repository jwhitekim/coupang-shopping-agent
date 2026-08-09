import type { Context, NextFunction } from "grammy";
import { config } from "./config.js";

// md 4.1: 개인 채팅에서 허용된 telegram_user_id만 처리한다.
export async function requireAllowedUser(ctx: Context, next: NextFunction): Promise<void> {
  const isPrivateChat = ctx.chat?.type === "private";
  const isAllowedUser = ctx.from?.id === config.allowedUserId;

  if (!isPrivateChat || !isAllowedUser) {
    return;
  }

  await next();
}
