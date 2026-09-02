export function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString("en-US")} ${currency}`;
}
