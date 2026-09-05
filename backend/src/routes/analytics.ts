import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { createDb } from "../db/client";
import type {
  AnalyticsPeriod,
  AnalyticsSummary,
  AnalyticsTrendPoint,
  Env,
} from "../types";

export const analyticsRoute = new Hono<{ Bindings: Env }>();

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

analyticsRoute.get("/summary", async (c) => {
  const month = c.req.query("month") ?? currentMonth();
  const db = createDb(c.env.DB);

  const totalRow = await db.get<{ total: number | null; dayCount: number }>(
    sql`select sum(amount) as total, count(distinct occurred_at) as dayCount
        from expenses
        where strftime('%Y-%m', occurred_at) = ${month}`,
  );

  const byCategory = await db.all<{
    categoryId: number | null;
    categoryName: string | null;
    total: number;
  }>(
    sql`select e.category_id as categoryId, c.name as categoryName, sum(e.amount) as total
        from expenses e
        left join categories c on c.id = e.category_id
        where strftime('%Y-%m', e.occurred_at) = ${month}
        group by e.category_id
        order by total desc`,
  );

  const total = totalRow?.total ?? 0;
  const dayCount = totalRow?.dayCount ?? 0;

  const summary: AnalyticsSummary = {
    month,
    total,
    currency: c.env.DEFAULT_CURRENCY,
    byCategory,
    dayCount,
    avgPerDay: dayCount > 0 ? Math.round(total / dayCount) : 0,
  };

  return c.json(summary);
});

const DEFAULT_LIMIT: Record<AnalyticsPeriod, number> = {
  daily: 14,
  weekly: 8,
  monthly: 6,
  yearly: 5,
};

type Bucket = { date: string; from: string; to: string };

// Formats using local calendar date parts, not toISOString() (which converts to UTC
// and would shift the date backward by a day in any timezone ahead of UTC — every
// other date computed in this file is local-time-based, via getDate/getMonth/setDate).
function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Start of the bucket containing `date`: the day itself (daily), that week's Monday
// (weekly), the 1st of the month (monthly), or Jan 1 (yearly).
function startOfPeriod(date: Date, period: AnalyticsPeriod): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  switch (period) {
    case "daily":
      return d;
    case "weekly": {
      const daysSinceMonday = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - daysSinceMonday);
      return d;
    }
    case "monthly":
      d.setDate(1);
      return d;
    case "yearly":
      d.setMonth(0, 1);
      return d;
  }
}

function endOfPeriod(start: Date, period: AnalyticsPeriod): Date {
  const end = new Date(start);
  switch (period) {
    case "daily":
      return end;
    case "weekly":
      end.setDate(end.getDate() + 6);
      return end;
    case "monthly":
      end.setMonth(end.getMonth() + 1, 0); // day 0 = last day of the previous month
      return end;
    case "yearly":
      end.setMonth(11, 31);
      return end;
  }
}

function stepBack(date: Date, period: AnalyticsPeriod, count: number): Date {
  const d = new Date(date);
  switch (period) {
    case "daily":
      d.setDate(d.getDate() - count);
      break;
    case "weekly":
      d.setDate(d.getDate() - count * 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() - count);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() - count);
      break;
  }
  return d;
}

// Builds `limit` consecutive buckets of `period`, oldest first, ending at the bucket
// containing today — including buckets with no expenses at all, so a "how much did I
// spend each day this week" chart doesn't silently skip empty days.
function buildBuckets(period: AnalyticsPeriod, limit: number): Bucket[] {
  const currentStart = startOfPeriod(new Date(), period);
  const buckets: Bucket[] = [];
  for (let i = limit - 1; i >= 0; i--) {
    const start = stepBack(currentStart, period, i);
    const end = endOfPeriod(start, period);
    buckets.push({ date: toIsoDate(start), from: toIsoDate(start), to: toIsoDate(end) });
  }
  return buckets;
}

analyticsRoute.get("/trends", async (c) => {
  const period = (c.req.query("period") ?? "monthly") as AnalyticsPeriod;
  if (!(period in DEFAULT_LIMIT)) {
    return c.json({ error: "period must be one of daily, weekly, monthly, yearly" }, 400);
  }
  const limit = Number(c.req.query("limit") ?? DEFAULT_LIMIT[period]);
  const breakdown = c.req.query("breakdown"); // "type" | "category" | undefined
  const db = createDb(c.env.DB);
  const buckets = buildBuckets(period, limit);

  if (breakdown !== "type" && breakdown !== "category") {
    const totals = await Promise.all(
      buckets.map((b) =>
        db.get<{ total: number | null }>(
          sql`select sum(amount) as total from expenses where occurred_at >= ${b.from} and occurred_at <= ${b.to}`,
        ),
      ),
    );
    return c.json(
      buckets.map((b, i) => ({ date: b.date, total: totals[i]?.total ?? 0 })) satisfies AnalyticsTrendPoint[],
    );
  }

  if (breakdown === "type") {
    const rows = await Promise.all(
      buckets.map((b) =>
        db.all<{ key: "cash" | "credit"; total: number }>(
          sql`select case when credit_expense_id is null then 'cash' else 'credit' end as key,
                     sum(amount) as total
              from expenses
              where occurred_at >= ${b.from} and occurred_at <= ${b.to}
              group by key`,
        ),
      ),
    );
    return c.json(
      buckets.map((b, i) => ({
        date: b.date,
        total: rows[i].reduce((sum, r) => sum + r.total, 0),
        breakdown: rows[i].map((r) => ({
          key: r.key,
          label: r.key === "cash" ? "Cash" : "Credit",
          total: r.total,
        })),
      })) satisfies AnalyticsTrendPoint[],
    );
  }

  const rows = await Promise.all(
    buckets.map((b) =>
      db.all<{ categoryId: number | null; categoryName: string | null; total: number }>(
        sql`select e.category_id as categoryId, c.name as categoryName, sum(e.amount) as total
            from expenses e
            left join categories c on c.id = e.category_id
            where e.occurred_at >= ${b.from} and e.occurred_at <= ${b.to}
            group by e.category_id`,
      ),
    ),
  );
  return c.json(
    buckets.map((b, i) => ({
      date: b.date,
      total: rows[i].reduce((sum, r) => sum + r.total, 0),
      breakdown: rows[i].map((r) => ({
        key: r.categoryId === null ? "none" : String(r.categoryId),
        label: r.categoryName ?? "Uncategorized",
        total: r.total,
        categoryId: r.categoryId,
      })),
    })) satisfies AnalyticsTrendPoint[],
  );
});
