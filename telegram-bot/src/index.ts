import type { Update } from "grammy/types";
import { createBot } from "./bot";
import type { Env } from "./types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Personal finance bot is running.", { status: 200 });
    }

    const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (secret !== env.WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const bot = createBot(env);
    const update = await request.json<Update>();

    try {
      await bot.init();
      await bot.handleUpdate(update);
    } catch (err) {
      console.error("Failed to handle update", err);
    }

    return new Response("OK", { status: 200 });
  },
};
