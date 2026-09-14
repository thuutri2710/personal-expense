import { useState, type FormEvent, type ReactElement } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCategories } from "@/hooks/useCategories";
import { useCreateCreditExpense } from "@/hooks/useCreditExpenses";
import {
  useCreateExpense,
  useParseExpenseText,
  useUpdateExpense,
} from "@/hooks/useExpenses";
import { formatCurrency, formatExchangeRate, formatOriginalAmount, todayIso } from "@/lib/format";
import type { BillingType, Category, CreditExpenseMissingField, Expense } from "@/types";

type ExpenseDialogProps = {
  trigger: ReactElement;
  expense?: Expense;
};

const UNCATEGORIZED = "none";

const MISSING_FIELD_LABELS: Record<CreditExpenseMissingField, string> = {
  amount: "total amount",
  months: "number of months",
  startMonth: "start month",
};

const BILLING_TYPE_ITEMS: Array<{ value: BillingType; label: string }> = [
  { value: "installment", label: "Installment (financed purchase)" },
  { value: "subscription", label: "Subscription (recurring charge)" },
];

type CategoryFieldProps = {
  id: string;
  value: string;
  items: Array<{ value: string; label: string }>;
  categories: Category[];
  onValueChange: (value: string) => void;
};

function CategoryField({ id, value, items, categories, onValueChange }: CategoryFieldProps) {
  return (
    <Select items={items} value={value} onValueChange={(v) => onValueChange(v ?? UNCATEGORIZED)}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="Uncategorized" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNCATEGORIZED}>Uncategorized</SelectItem>
        {categories.map((c) => (
          <SelectItem key={c.id} value={String(c.id)}>
            {c.icon ? `${c.icon} ` : ""}
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ExpenseDialog({ trigger, expense }: ExpenseDialogProps) {
  const isEdit = !!expense;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>(UNCATEGORIZED);
  const [occurredAt, setOccurredAt] = useState(todayIso());
  const [activeTab, setActiveTab] = useState("manual");
  const [quickText, setQuickText] = useState("");
  const [creditBillingType, setCreditBillingType] = useState<BillingType>("installment");
  const [creditTotalAmount, setCreditTotalAmount] = useState("");
  const [creditTotalCycle, setCreditTotalCycle] = useState("");
  const [creditTransactionDate, setCreditTransactionDate] = useState(todayIso());
  const [originalCurrency, setOriginalCurrency] = useState<string | null>(null);
  const [originalAmount, setOriginalAmount] = useState<number | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  const { data: categories = [] } = useCategories();
  const categorySelectItems = [
    { value: UNCATEGORIZED, label: "Uncategorized" },
    ...categories.map((c) => ({
      value: String(c.id),
      label: c.icon ? `${c.icon} ${c.name}` : c.name,
    })),
  ];
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const createCreditExpense = useCreateCreditExpense();
  const parseExpenseText = useParseExpenseText();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setAmount(expense ? String(expense.amount) : "");
      setDescription(expense?.description ?? "");
      setCategoryId(expense?.categoryId ? String(expense.categoryId) : UNCATEGORIZED);
      setOccurredAt(expense?.occurredAt ?? todayIso());
      setActiveTab("manual");
      setQuickText("");
      setCreditBillingType("installment");
      setCreditTotalAmount("");
      setCreditTotalCycle("");
      setCreditTransactionDate(todayIso());
      setOriginalCurrency(null);
      setOriginalAmount(null);
      setExchangeRate(null);
    }
    setOpen(nextOpen);
  }

  async function handleParse() {
    if (!quickText.trim()) return;

    // The backend splits comma-separated text into one transaction per segment. This
    // dialog only edits one expense at a time, so take the first and tell the user
    // about the rest rather than silently dropping them.
    const results = await parseExpenseText.mutateAsync(quickText.trim());
    const [result, ...rest] = results;
    if (!result) return;

    if (!result.ok) {
      if (result.reason === "missing_credit_info") {
        const missingLabels = result.missing.map((field) => MISSING_FIELD_LABELS[field]);
        toast.error(
          `This looks like a credit/installment expense, but I'm missing: ${missingLabels.join(", ")}. Try something like "installment laptop 12tr for 12 months from March 2026".`,
        );
      } else {
        toast.error("Couldn't find an amount in that text. Try something like \"50k coffee\".");
      }
      return;
    }

    setDescription(result.description);
    setCategoryId(result.categoryId ? String(result.categoryId) : UNCATEGORIZED);

    const extraNote =
      rest.length > 0 ? ` (found ${rest.length} more — add ${rest.length === 1 ? "it" : "them"} separately)` : "";

    if (result.kind === "credit") {
      setCreditBillingType("installment");
      setCreditTotalAmount(String(result.totalAmount));
      setCreditTotalCycle(String(result.months));
      setCreditTransactionDate(`${result.startMonth}-01`);
      setActiveTab("credit");
      toast.success(
        (result.categoryName
          ? `Parsed as a ${result.months}-month credit expense — ${result.categoryName}${result.categorySource === "ai" ? " (AI)" : ""} — review below`
          : `Parsed as a ${result.months}-month credit expense — review below`) + extraNote,
      );
    } else {
      setAmount(String(result.amount));
      setOriginalCurrency(result.originalCurrency);
      setOriginalAmount(result.originalAmount);
      setExchangeRate(result.exchangeRate);
      setActiveTab("manual");
      toast.success(
        (result.categoryName
          ? `Parsed as ${result.categoryName}${result.categorySource === "ai" ? " (AI)" : ""} — review below`
          : "Parsed — pick a category below") + extraNote,
      );
    }
  }

  const isPending = createExpense.isPending || updateExpense.isPending || createCreditExpense.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!isEdit && activeTab === "credit") {
      const totalAmount = Number(creditTotalAmount);
      const totalCycleEntered = creditTotalCycle.trim() ? Number(creditTotalCycle) : null;

      if (!totalAmount || totalAmount <= 0) {
        toast.error(creditBillingType === "installment" ? "Enter a valid total amount" : "Enter a valid monthly amount");
        return;
      }
      if (
        creditBillingType === "installment" &&
        (!totalCycleEntered || !Number.isInteger(totalCycleEntered) || totalCycleEntered < 1)
      ) {
        toast.error("Enter a valid number of cycles");
        return;
      }
      if (totalCycleEntered !== null && (!Number.isInteger(totalCycleEntered) || totalCycleEntered < 1)) {
        toast.error("Enter a valid number of cycles, or leave it blank for an ongoing subscription");
        return;
      }
      if (!creditTransactionDate) {
        toast.error("Pick a transaction date");
        return;
      }
      if (!description.trim()) {
        toast.error("Enter a description");
        return;
      }

      try {
        await createCreditExpense.mutateAsync({
          billingType: creditBillingType,
          totalAmount,
          totalCycle: totalCycleEntered,
          transactionDate: creditTransactionDate,
          description: description.trim(),
          categoryId: categoryId === UNCATEGORIZED ? null : Number(categoryId),
          source: "web",
        });
        toast.success(
          creditBillingType === "installment"
            ? `Credit expense added — ${totalCycleEntered} cycles created`
            : "Subscription added",
        );
        setOpen(false);
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
      return;
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!description.trim()) {
      toast.error("Enter a description");
      return;
    }

    const payload = {
      amount: parsedAmount,
      description: description.trim(),
      categoryId: categoryId === UNCATEGORIZED ? null : Number(categoryId),
      occurredAt,
    };

    try {
      if (isEdit) {
        await updateExpense.mutateAsync({ id: expense.id, input: payload });
        toast.success("Expense updated");
      } else {
        await createExpense.mutateAsync({
          ...payload,
          source: "web",
          originalCurrency,
          originalAmount,
          exchangeRate,
        });
        toast.success("Expense added");
      }
      setOpen(false);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  const creditTotalCycleCount = Number(creditTotalCycle);
  const creditPerCyclePreview =
    creditBillingType === "installment" && creditTotalAmount && creditTotalCycleCount > 0
      ? Math.round(Number(creditTotalAmount) / creditTotalCycleCount)
      : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit expense" : "Add expense"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update the details below." : "Log a new expense."}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(String(value))} className="py-4">
            {!isEdit && (
              <TabsList>
                <TabsTrigger value="manual">Manual</TabsTrigger>
                <TabsTrigger value="credit">Credit</TabsTrigger>
                <TabsTrigger value="quick">Quick add (text)</TabsTrigger>
              </TabsList>
            )}

            {!isEdit && (
              <TabsContent value="quick">
                <div className="grid gap-2">
                  <Label htmlFor="quick-text">Describe the expense</Label>
                  <Input
                    id="quick-text"
                    placeholder="50k coffee, or installment laptop 12tr for 12 months from March 2026"
                    value={quickText}
                    onChange={(e) => setQuickText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleParse();
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void handleParse()}
                    disabled={parseExpenseText.isPending || !quickText.trim()}
                  >
                    {parseExpenseText.isPending ? "Parsing..." : "Parse"}
                  </Button>
                </div>
              </TabsContent>
            )}

            <TabsContent value="manual">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      // Editing the amount by hand invalidates the currency/rate that
                      // came from a parsed quick-add result.
                      setOriginalCurrency(null);
                      setOriginalAmount(null);
                      setExchangeRate(null);
                    }}
                  />
                  {originalCurrency && originalAmount !== null && (
                    <p className="text-xs text-muted-foreground">
                      Converted from {formatOriginalAmount(originalAmount, originalCurrency)}
                      {exchangeRate !== null && ` @ ${formatExchangeRate(exchangeRate)}`}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Coffee, groceries, ..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <CategoryField
                      id="category"
                      value={categoryId}
                      items={categorySelectItems}
                      categories={categories}
                      onValueChange={setCategoryId}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={occurredAt}
                      onChange={(e) => setOccurredAt(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {!isEdit && (
              <TabsContent value="credit">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="credit-billing-type">Billing type</Label>
                    <Select
                      items={BILLING_TYPE_ITEMS}
                      value={creditBillingType}
                      onValueChange={(v) => setCreditBillingType((v as BillingType) ?? "installment")}
                    >
                      <SelectTrigger id="credit-billing-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BILLING_TYPE_ITEMS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {creditBillingType === "installment"
                        ? "A one-time purchase paid off over a fixed number of months."
                        : "A recurring charge — enter the amount charged each month."}
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="credit-amount">
                      {creditBillingType === "installment" ? "Total amount" : "Amount per month"}
                    </Label>
                    <Input
                      id="credit-amount"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={creditTotalAmount}
                      onChange={(e) => setCreditTotalAmount(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="credit-description">Description</Label>
                    <Input
                      id="credit-description"
                      placeholder="Laptop, phone, ..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="credit-category">Category</Label>
                      <CategoryField
                        id="credit-category"
                        value={categoryId}
                        items={categorySelectItems}
                        categories={categories}
                        onValueChange={setCategoryId}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="credit-total-cycle">Total cycles</Label>
                      <Input
                        id="credit-total-cycle"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        step="1"
                        placeholder={creditBillingType === "installment" ? "12" : "Leave blank if ongoing"}
                        value={creditTotalCycle}
                        onChange={(e) => setCreditTotalCycle(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="credit-transaction-date">Transaction date</Label>
                    <Input
                      id="credit-transaction-date"
                      type="date"
                      value={creditTransactionDate}
                      onChange={(e) => setCreditTransactionDate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      The date you actually made the purchase — each cycle's billing date is
                      calculated from this automatically based on your statement's close day.
                    </p>
                  </div>

                  {creditPerCyclePreview !== null && (
                    <p className="text-xs text-muted-foreground">
                      ≈ {formatCurrency(creditPerCyclePreview, "VND")} / cycle for {creditTotalCycleCount} cycles
                    </p>
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isEdit ? "Save changes" : activeTab === "credit" ? "Add credit expense" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
