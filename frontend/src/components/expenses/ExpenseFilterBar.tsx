import { Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isFilterActive, type ExpenseFilterParams, type ExpenseType } from "@/lib/expense-filters";
import type { Category } from "@/types";

const TYPE_OPTIONS: Array<{ value: ExpenseType; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "installment", label: "Installment" },
  { value: "subscription", label: "Subscription" },
];

const UNCATEGORIZED = null;

type ExpenseFilterBarProps = {
  categories: Category[];
  currencies: string[];
  value: ExpenseFilterParams;
  onChange: (value: ExpenseFilterParams) => void;
};

function toggle<T>(list: T[] | undefined, item: T): T[] {
  const current = list ?? [];
  return current.includes(item) ? current.filter((v) => v !== item) : [...current, item];
}

type FilterChipProps = {
  label: string;
  selected: boolean;
  onClick: () => void;
};

function FilterChip({ label, selected, onClick }: FilterChipProps) {
  return (
    <Badge
      render={<button type="button" onClick={onClick} />}
      variant={selected ? "default" : "outline"}
      className="cursor-pointer font-normal"
    >
      {label}
    </Badge>
  );
}

export function ExpenseFilterBar({ categories, currencies, value, onChange }: ExpenseFilterBarProps) {
  const activeCount =
    (value.categoryIds?.length ?? 0) + (value.types?.length ?? 0) + (value.currencies?.length ?? 0);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeCount > 0 && (
              <Badge variant="secondary" className="h-4 min-w-4 px-1">
                {activeCount}
              </Badge>
            )}
          </Button>
        }
      />
      <PopoverContent className="w-80" align="start">
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Type</p>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_OPTIONS.map((opt) => (
                <FilterChip
                  key={opt.value}
                  label={opt.label}
                  selected={value.types?.includes(opt.value) ?? false}
                  onClick={() => onChange({ ...value, types: toggle(value.types, opt.value) })}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Category</p>
            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
              {categories.map((c) => (
                <FilterChip
                  key={c.id}
                  label={c.icon ? `${c.icon} ${c.name}` : c.name}
                  selected={value.categoryIds?.includes(c.id) ?? false}
                  onClick={() => onChange({ ...value, categoryIds: toggle(value.categoryIds, c.id) })}
                />
              ))}
              <FilterChip
                label="Uncategorized"
                selected={value.categoryIds?.includes(UNCATEGORIZED) ?? false}
                onClick={() =>
                  onChange({ ...value, categoryIds: toggle(value.categoryIds, UNCATEGORIZED) })
                }
              />
            </div>
          </div>

          {currencies.length > 1 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Currency</p>
              <div className="flex flex-wrap gap-1.5">
                {currencies.map((cur) => (
                  <FilterChip
                    key={cur}
                    label={cur}
                    selected={value.currencies?.includes(cur) ?? false}
                    onClick={() => onChange({ ...value, currencies: toggle(value.currencies, cur) })}
                  />
                ))}
              </div>
            </div>
          )}

          {isFilterActive(value) && (
            <Button
              variant="ghost"
              size="sm"
              className="w-fit gap-1 text-muted-foreground"
              onClick={() => onChange({})}
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
