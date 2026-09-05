import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/Topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCategories, useCreateCategory, useDeleteCategory } from "@/hooks/useCategories";
import { useCreditExpenses, useDeleteCreditExpense } from "@/hooks/useCreditExpenses";
import { formatCurrency } from "@/lib/format";

export function Settings() {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");

  const { data: categories = [] } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const { data: creditExpenses = [] } = useCreditExpenses();
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const deleteCreditExpense = useDeleteCreditExpense();

  async function handleDeleteCreditExpense(id: number) {
    try {
      await deleteCreditExpense.mutateAsync(id);
      toast.success("Credit expense deleted");
    } catch {
      toast.error("Failed to delete credit expense");
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Enter a category name");
      return;
    }

    try {
      await createCategory.mutateAsync({ name: name.trim(), icon: icon.trim() || null });
      setName("");
      setIcon("");
      toast.success("Category added");
    } catch {
      toast.error("Failed to add category");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteCategory.mutateAsync(id);
      toast.success("Category deleted");
    } catch {
      toast.error("Failed to delete category");
    }
  }

  return (
    <div>
      <Topbar title="Settings" />
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Categories</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="icon" className="text-xs text-muted-foreground">
                  Icon
                </Label>
                <Input
                  id="icon"
                  placeholder="🍜"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-16"
                  maxLength={4}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="name" className="text-xs text-muted-foreground">
                  Name
                </Label>
                <Input
                  id="name"
                  placeholder="New category"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-56"
                />
              </div>
              <Button type="submit" disabled={createCategory.isPending}>
                Add
              </Button>
            </form>

            <div className="flex flex-col divide-y divide-border rounded-md border border-border">
              {categories.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">No categories yet.</p>
              )}
              {categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm font-medium">
                    {c.icon ? `${c.icon} ` : ""}
                    {c.name}
                  </span>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{c.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Expenses in this category will become uncategorized. This can't be
                          undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(c.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credit expenses</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Installment plans created from the "Add expense" dialog. Deleting a plan removes
              all of its remaining monthly installments.
            </p>
            <div className="flex flex-col divide-y divide-border rounded-md border border-border">
              {creditExpenses.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">No credit expenses yet.</p>
              )}
              {creditExpenses.map((ce) => {
                const category = ce.categoryId ? categoryById.get(ce.categoryId) : null;
                const monthly = Math.round(ce.totalAmount / ce.months);
                return (
                  <div key={ce.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{ce.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(ce.totalAmount, ce.currency)} over {ce.months} months (
                        {formatCurrency(monthly, ce.currency)}/mo) starting {ce.startMonth}
                        {category ? ` · ${category.icon ? `${category.icon} ` : ""}${category.name}` : ""}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{ce.description}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes the plan and all of its generated monthly installments,
                            including past ones. This can't be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteCreditExpense(ce.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
