import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpenseTable } from "@/components/expenses/ExpenseTable";
import { useCategories } from "@/hooks/useCategories";
import { useExpenses } from "@/hooks/useExpenses";
import { formatCurrency } from "@/lib/format";

const ALL_CATEGORIES = "all";

export function Expenses() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [categoryId, setCategoryId] = useState(ALL_CATEGORIES);

  const { data: categories = [] } = useCategories();
  const { data: expenses = [], isLoading } = useExpenses({
    from: from || undefined,
    to: to || undefined,
    categoryId: categoryId === ALL_CATEGORIES ? undefined : Number(categoryId),
  });

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const currency = expenses[0]?.currency ?? "VND";

  return (
    <div>
      <Topbar title="Expenses" />
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="from" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select
              value={categoryId}
              onValueChange={(value) => setCategoryId(value ?? ALL_CATEGORIES)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.icon ? `${c.icon} ` : ""}
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isLoading && expenses.length > 0 && (
            <p className="ml-auto text-sm text-muted-foreground">
              {expenses.length} expenses · {formatCurrency(total, currency)}
            </p>
          )}
        </div>

        <Card>
          <CardContent className="px-0">
            <ExpenseTable expenses={expenses} categories={categories} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
