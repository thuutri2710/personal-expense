import { InlineKeyboard } from "grammy";
import { formatAmount } from "./format";
import type { Category, CreditExpense, CreditExpenseMissingField, Expense } from "./types";

export function buildCorrectionKeyboard(expenseId: number, categories: Category[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  categories.forEach((category, i) => {
    kb.text(`${category.icon ?? ""} ${category.name}`.trim(), `cat:${expenseId}:${category.id}`);
    if (i % 2 === 1) kb.row();
  });
  if (categories.length % 2 === 1) kb.row();
  kb.text("✏️ Edit amount", `editamt:${expenseId}`);
  return kb;
}

export function confirmationText(expense: Expense, categoryName: string | null): string {
  return [
    `✅ ${formatAmount(expense.amount, expense.currency)} — ${expense.description}`,
    categoryName ?? "Uncategorized",
    "",
    "Not quite right? Use the buttons below to fix it.",
  ].join("\n");
}

const MISSING_FIELD_LABELS: Record<CreditExpenseMissingField, string> = {
  amount: "total amount",
  months: "number of months",
  startMonth: "start month",
};

export function creditMissingInfoText(missing: CreditExpenseMissingField[]): string {
  const labels = missing.map((field) => MISSING_FIELD_LABELS[field]);
  return [
    `This looks like a credit/installment expense, but I'm missing: ${labels.join(", ")}.`,
    'Try something like "installment laptop 12tr for 12 months from March 2026".',
  ].join("\n");
}

export function creditConfirmationText(
  creditExpense: CreditExpense,
  categoryName: string | null,
): string {
  const monthly = Math.round(creditExpense.totalAmount / creditExpense.months);
  return [
    `✅ Credit expense: ${formatAmount(creditExpense.totalAmount, creditExpense.currency)} — ${creditExpense.description}`,
    `${creditExpense.months} months starting ${creditExpense.startMonth} (${formatAmount(monthly, creditExpense.currency)}/mo)`,
    categoryName ?? "Uncategorized",
  ].join("\n");
}

// Embedded in the "reply with the corrected amount" prompt so we can recover
// which expense a reply is correcting without any extra storage.
export function amountPromptText(expenseId: number): string {
  return `Reply to this message with the corrected amount for expense #${expenseId} (e.g. 45000 or 45k).`;
}

const AMOUNT_PROMPT_MARKER = /corrected amount for expense #(\d+)/;

export function extractAmountCorrectionTarget(promptText: string | undefined): number | null {
  if (!promptText) return null;
  const match = promptText.match(AMOUNT_PROMPT_MARKER);
  return match ? Number(match[1]) : null;
}
