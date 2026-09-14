import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isFilterActive, type ExpenseFilterParams, type ExpenseType } from "@/lib/expense-filters";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

// A Jira/Contentful-style faceted filter bar: each active filter is its own removable
// chip ("Category: Health, Shopping ×"); "+ Add filter" adds a new one and immediately
// opens its value picker. Multiple chips combine with AND; values within one chip
// combine with OR (matches lib/expense-filters.ts's semantics exactly).

type FieldKey = "type" | "category" | "currency";

type Option = { id: string; label: string };

const UNCATEGORIZED_ID = "none";

const TYPE_OPTIONS: Option[] = [
  { id: "cash", label: "Cash" },
  { id: "installment", label: "Installment" },
  { id: "subscription", label: "Subscription" },
];

const FIELD_LABELS: Record<FieldKey, string> = {
  type: "Type",
  category: "Category",
  currency: "Currency",
};

const ALL_FIELDS: FieldKey[] = ["type", "category", "currency"];

type ExpenseFilterBarProps = {
  categories: Category[];
  currencies: string[];
  value: ExpenseFilterParams;
  onChange: (value: ExpenseFilterParams) => void;
};

export function ExpenseFilterBar({ categories, currencies, value, onChange }: ExpenseFilterBarProps) {
  const [pendingFields, setPendingFields] = useState<FieldKey[]>([]);
  const [openField, setOpenField] = useState<FieldKey | null>(null);

  const fieldOptions: Record<FieldKey, Option[]> = {
    type: TYPE_OPTIONS,
    category: [
      ...categories.map((c) => ({ id: String(c.id), label: c.icon ? `${c.icon} ${c.name}` : c.name })),
      { id: UNCATEGORIZED_ID, label: "Uncategorized" },
    ],
    currency: currencies.map((c) => ({ id: c, label: c })),
  };

  function selectedIds(field: FieldKey): string[] {
    if (field === "type") return value.types ?? [];
    if (field === "category") {
      return (value.categoryIds ?? []).map((id) => (id === null ? UNCATEGORIZED_ID : String(id)));
    }
    return value.currencies ?? [];
  }

  function setSelectedIds(field: FieldKey, ids: string[]) {
    if (field === "type") {
      onChange({ ...value, types: ids as ExpenseType[] });
    } else if (field === "category") {
      onChange({ ...value, categoryIds: ids.map((id) => (id === UNCATEGORIZED_ID ? null : Number(id))) });
    } else {
      onChange({ ...value, currencies: ids });
    }
  }

  const activeFields = ALL_FIELDS.filter((f) => selectedIds(f).length > 0);
  const shownFields = ALL_FIELDS.filter((f) => activeFields.includes(f) || pendingFields.includes(f));
  const addableFields = ALL_FIELDS.filter((f) => !shownFields.includes(f) && fieldOptions[f].length > 0);

  function removeField(field: FieldKey) {
    setSelectedIds(field, []);
    setPendingFields((p) => p.filter((f) => f !== field));
    setOpenField((current) => (current === field ? null : current));
  }

  function addField(field: FieldKey) {
    setPendingFields((p) => (p.includes(field) ? p : [...p, field]));
    setOpenField(field);
  }

  function clearAll() {
    onChange({});
    setPendingFields([]);
    setOpenField(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {shownFields.map((field) => {
        const ids = selectedIds(field);
        const options = fieldOptions[field];
        const chipLabel =
          ids.length === 0
            ? FIELD_LABELS[field]
            : `${FIELD_LABELS[field]}: ${options
                .filter((o) => ids.includes(o.id))
                .map((o) => o.label)
                .join(", ")}`;

        return (
          <div
            key={field}
            className="inline-flex items-center overflow-hidden rounded-lg border border-border bg-background"
          >
            <Popover open={openField === field} onOpenChange={(open) => setOpenField(open ? field : null)}>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    className="max-w-52 truncate px-2.5 py-1 text-left text-sm hover:bg-muted"
                  >
                    {chipLabel}
                  </button>
                }
              />
              <PopoverContent className="w-56" align="start">
                <div className="flex flex-col gap-0.5">
                  {options.length === 0 ? (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">No options</p>
                  ) : (
                    options.map((opt) => {
                      const isSelected = ids.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setSelectedIds(
                              field,
                              isSelected ? ids.filter((id) => id !== opt.id) : [...ids, opt.id],
                            )
                          }
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                        >
                          <span
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border",
                              isSelected && "border-primary bg-primary text-primary-foreground",
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </span>
                          {opt.label}
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <button
              type="button"
              onClick={() => removeField(field)}
              aria-label={`Remove ${FIELD_LABELS[field]} filter`}
              className="border-l border-border px-1.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      {addableFields.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                <Plus className="h-3.5 w-3.5" />
                Add filter
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            {addableFields.map((field) => (
              <DropdownMenuItem key={field} onClick={() => addField(field)}>
                {FIELD_LABELS[field]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {isFilterActive(value) && (
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearAll}>
          Clear all
        </Button>
      )}
    </div>
  );
}
