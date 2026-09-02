import type { CommandContext } from "grammy";
import type { BotContext } from "../context";
import { formatAmount } from "../format";

export async function monthCommand(ctx: CommandContext<BotContext>) {
  const summary = await ctx.backend.getSummary();

  if (summary.total === 0) {
    await ctx.reply("No expenses recorded this month yet.");
    return;
  }

  const lines = [
    `📅 ${summary.month} summary`,
    `Total: ${formatAmount(summary.total, summary.currency)}`,
    `Avg/day: ${formatAmount(summary.avgPerDay, summary.currency)} (${summary.dayCount} days)`,
    "",
    "By category:",
    ...summary.byCategory.map(
      (c) => `  ${c.categoryName ?? "Uncategorized"}: ${formatAmount(c.total, summary.currency)}`,
    ),
  ];

  await ctx.reply(lines.join("\n"));
}

export async function todayCommand(ctx: CommandContext<BotContext>) {
  const today = new Date().toISOString().slice(0, 10);
  const expenses = await ctx.backend.listExpenses({ from: today, to: today });

  if (expenses.length === 0) {
    await ctx.reply("No expenses recorded today yet.");
    return;
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const lines = [
    `📅 Today: ${formatAmount(total, expenses[0].currency)}`,
    "",
    ...expenses.map((e) => `  ${formatAmount(e.amount, e.currency)} — ${e.description}`),
  ];

  await ctx.reply(lines.join("\n"));
}
