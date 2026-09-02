import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseDialog } from "@/components/expenses/ExpenseDialog";

export function Topbar({ title }: { title: string }) {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-4 md:px-8">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      <ExpenseDialog
        trigger={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add expense
          </Button>
        }
      />
    </header>
  );
}
