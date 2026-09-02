import type { Category } from "../../types";

const TIMEOUT_MS = 4000;

/**
 * Asks Workers AI to pick the best-matching category for an expense
 * description. Returns null on any failure, timeout, or an answer that
 * doesn't match a known category — the caller should fall back to
 * keyword-based categorization (see ../parse.ts) in that case.
 */
export async function categorizeExpense(
  ai: Ai,
  model: string,
  description: string,
  knownCategories: Category[],
): Promise<Category | null> {
  if (knownCategories.length === 0) return null;

  const names = knownCategories.map((c) => c.name);
  const prompt = [
    "Pick the single best matching category for this expense description.",
    `Description: "${description}"`,
    `Categories: ${names.join(", ")}`,
    'Reply with exactly one category name from the list above, and nothing else. If none fit well, reply "None".',
  ].join("\n");

  try {
    const result = await Promise.race([
      ai.run(model, { messages: [{ role: "user", content: prompt }] }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI categorization timed out")), TIMEOUT_MS),
      ),
    ]);

    const answer =
      typeof result === "object" && result !== null && "response" in result
        ? String((result as { response: unknown }).response)
        : "";

    const cleaned = answer.trim().replace(/^["'.]+|["'.]+$/g, "");
    return knownCategories.find((c) => c.name.toLowerCase() === cleaned.toLowerCase()) ?? null;
  } catch (err) {
    console.error("AI categorization failed, falling back to keyword matching", err);
    return null;
  }
}
