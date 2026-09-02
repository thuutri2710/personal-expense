import { Bot } from "grammy";
import type { BotContext } from "./context";
import type { Env } from "./types";
import { ApiClient } from "./api-client";
import { parseAmountOnly } from "./amount";
import {
  amountPromptText,
  buildCorrectionKeyboard,
  confirmationText,
  extractAmountCorrectionTarget,
} from "./keyboard";
import { startCommand } from "./commands/start";
import { categoriesCommand } from "./commands/categories";
import { monthCommand, todayCommand } from "./commands/summary";

// Best-effort: a logging failure should never block the user-facing reply.
async function logMessage(
  backend: ApiClient,
  input: Parameters<ApiClient["logMessage"]>[0],
) {
  try {
    await backend.logMessage(input);
  } catch (err) {
    console.error("Failed to log raw message", err);
  }
}

export function createBot(env: Env) {
  const bot = new Bot<BotContext>(env.BOT_TOKEN);

  bot.use(async (ctx, next) => {
    ctx.backend = new ApiClient(env);
    await next();
  });

  bot.command("start", startCommand);
  bot.command("help", startCommand);
  bot.command("categories", categoriesCommand);
  bot.command("month", monthCommand);
  bot.command("today", todayCommand);

  bot.callbackQuery(/^cat:(\d+):(\d+)$/, async (ctx) => {
    const expenseId = Number(ctx.match[1]);
    const categoryId = Number(ctx.match[2]);

    const [expense, categories] = await Promise.all([
      ctx.backend.updateExpense(expenseId, { categoryId }),
      ctx.backend.listCategories(),
    ]);
    const category = categories.find((c) => c.id === categoryId) ?? null;

    await ctx.editMessageText(confirmationText(expense, category?.name ?? null), {
      reply_markup: buildCorrectionKeyboard(expense.id, categories),
    });
    await ctx.answerCallbackQuery({ text: "Category updated" });
  });

  bot.callbackQuery(/^editamt:(\d+)$/, async (ctx) => {
    const expenseId = Number(ctx.match[1]);
    await ctx.answerCallbackQuery();
    await ctx.reply(amountPromptText(expenseId));
  });

  bot.on("message:text", async (ctx) => {
    const chatId = String(ctx.chat.id);
    const rawText = ctx.message.text;

    const correctionExpenseId = extractAmountCorrectionTarget(
      ctx.message.reply_to_message?.text,
    );
    if (correctionExpenseId !== null) {
      const amount = parseAmountOnly(rawText);
      if (amount === null) {
        await ctx.reply("That doesn't look like a valid amount. Try again, e.g. 45000 or 45k.");
        return;
      }

      const [expense, categories] = await Promise.all([
        ctx.backend.updateExpense(correctionExpenseId, { amount }),
        ctx.backend.listCategories(),
      ]);
      const category = categories.find((c) => c.id === expense.categoryId) ?? null;

      await ctx.reply(confirmationText(expense, category?.name ?? null), {
        reply_markup: buildCorrectionKeyboard(expense.id, categories),
      });
      return;
    }

    const parsed = await ctx.backend.parseExpense(rawText);

    if (!parsed.ok) {
      await logMessage(ctx.backend, { chatId, rawText, parseStatus: "failed" });
      await ctx.reply(
        "I couldn't find an amount in that message. Try something like \"50k coffee\".",
      );
      return;
    }

    const [expense, categories] = await Promise.all([
      ctx.backend.createExpense({
        amount: parsed.amount,
        description: parsed.description,
        categoryId: parsed.categoryId,
      }),
      ctx.backend.listCategories(),
    ]);

    await logMessage(ctx.backend, {
      chatId,
      rawText,
      parseStatus: "parsed",
      expenseId: expense.id,
    });

    await ctx.reply(confirmationText(expense, parsed.categoryName), {
      reply_markup: buildCorrectionKeyboard(expense.id, categories),
    });
  });

  return bot;
}
