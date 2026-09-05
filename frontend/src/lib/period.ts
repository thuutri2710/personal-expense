export type PeriodType = "day" | "week" | "month" | "year";

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

export function getPeriodRange(period: PeriodType, anchor: Date): { from: string; to: string } {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  switch (period) {
    case "day":
      return { from: toIso(anchor), to: toIso(anchor) };
    case "week": {
      const start = startOfWeek(anchor);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: toIso(start), to: toIso(end) };
    }
    case "month": {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return { from: toIso(start), to: toIso(end) };
    }
    case "year": {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      return { from: toIso(start), to: toIso(end) };
    }
  }
}

export function shiftAnchor(period: PeriodType, anchor: Date, direction: 1 | -1): Date {
  const date = new Date(anchor);
  switch (period) {
    case "day":
      date.setDate(date.getDate() + direction);
      break;
    case "week":
      date.setDate(date.getDate() + direction * 7);
      break;
    case "month":
      date.setMonth(date.getMonth() + direction);
      break;
    case "year":
      date.setFullYear(date.getFullYear() + direction);
      break;
  }
  return date;
}

export function formatPeriodLabel(period: PeriodType, anchor: Date): string {
  switch (period) {
    case "day":
      return anchor.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    case "week": {
      const start = startOfWeek(anchor);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const endStr = end.toLocaleDateString("en-US", {
        month: start.getMonth() === end.getMonth() ? undefined : "short",
        day: "numeric",
        year: "numeric",
      });
      return `${startStr} – ${endStr}`;
    }
    case "month":
      return anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    case "year":
      return String(anchor.getFullYear());
  }
}

export function isCurrentPeriod(period: PeriodType, anchor: Date): boolean {
  const { from, to } = getPeriodRange(period, anchor);
  const todayIso = toIso(new Date());
  return todayIso >= from && todayIso <= to;
}
