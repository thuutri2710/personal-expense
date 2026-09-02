import type { CommandContext } from "grammy";
import type { BotContext } from "../context";

export async function categoriesCommand(ctx: CommandContext<BotContext>) {
  const categories = await ctx.backend.listCategories();

  if (categories.length === 0) {
    await ctx.reply("No categories yet.");
    return;
  }

  const lines = categories.map((c) => `${c.icon ?? "•"} ${c.name}`);
  await ctx.reply(lines.join("\n"));
}
