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

export function Settings() {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");

  const { data: categories = [] } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

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
      </div>
    </div>
  );
}
