import type { CommandContext } from "grammy";
import type { BotContext } from "../context";

export async function startCommand(ctx: CommandContext<BotContext>) {
  await ctx.reply(
    [
      "👋 Personal finance bot",
      "",
      "Send me an expense as plain text, e.g.:",
      "  50k coffee",
      "  150000 grab to airport",
      "",
      "Commands:",
      "  /today — today's spending",
      "  /month — this month's summary",
      "  /categories — list categories",
      "  /help — show this message",
    ].join("\n"),
  );
}
