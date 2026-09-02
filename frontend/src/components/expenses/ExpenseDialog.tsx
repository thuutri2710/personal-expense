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
import {
  useCreateExpense,
  useParseExpenseText,
  useUpdateExpense,
} from "@/hooks/useExpenses";
import { todayIso } from "@/lib/format";
import type { Expense } from "@/types";

type ExpenseDialogProps = {
  trigger: ReactElement;
  expense?: Expense;
};

const UNCATEGORIZED = "none";

export function ExpenseDialog({ trigger, expense }: ExpenseDialogProps) {
  const isEdit = !!expense;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>(UNCATEGORIZED);
  const [occurredAt, setOccurredAt] = useState(todayIso());
  const [activeTab, setActiveTab] = useState("manual");
  const [quickText, setQuickText] = useState("");

  const { data: categories = [] } = useCategories();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const parseExpenseText = useParseExpenseText();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setAmount(expense ? String(expense.amount) : "");
      setDescription(expense?.description ?? "");
      setCategoryId(expense?.categoryId ? String(expense.categoryId) : UNCATEGORIZED);
      setOccurredAt(expense?.occurredAt ?? todayIso());
      setActiveTab("manual");
      setQuickText("");
    }
    setOpen(nextOpen);
  }

  async function handleParse() {
    if (!quickText.trim()) return;

    const result = await parseExpenseText.mutateAsync(quickText.trim());
    if (!result.ok) {
      toast.error("Couldn't find an amount in that text. Try something like \"50k coffee\".");
      return;
    }

    setAmount(String(result.amount));
    setDescription(result.description);
    setCategoryId(result.categoryId ? String(result.categoryId) : UNCATEGORIZED);
    setActiveTab("manual");
    toast.success(
      result.categoryName
        ? `Parsed as ${result.categoryName}${result.categorySource === "ai" ? " (AI)" : ""} — review below`
        : "Parsed — pick a category below",
    );
  }

  const isPending = createExpense.isPending || updateExpense.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

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
        await createExpense.mutateAsync({ ...payload, source: "web" });
        toast.success("Expense added");
      }
      setOpen(false);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

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
                <TabsTrigger value="quick">Quick add (text)</TabsTrigger>
              </TabsList>
            )}

            {!isEdit && (
              <TabsContent value="quick">
                <div className="grid gap-2">
                  <Label htmlFor="quick-text">Describe the expense</Label>
                  <Input
                    id="quick-text"
                    placeholder="50k coffee"
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
                    onChange={(e) => setAmount(e.target.value)}
                  />
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
                    <Select
                      value={categoryId}
                      onValueChange={(value) => setCategoryId(value ?? UNCATEGORIZED)}
                    >
                      <SelectTrigger id="category">
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
          </Tabs>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isEdit ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
