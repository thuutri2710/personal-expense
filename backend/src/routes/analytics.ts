import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { createDb } from "../db/client";
import type { AnalyticsSummary, AnalyticsTrendPoint, Env } from "../types";

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

analyticsRoute.get("/trends", async (c) => {
  const months = Number(c.req.query("months") ?? "6");
  const db = createDb(c.env.DB);

  const rows = await db.all<AnalyticsTrendPoint>(
    sql`select strftime('%Y-%m', occurred_at) as month, sum(amount) as total
        from expenses
        group by month
        order by month desc
        limit ${months}`,
  );

  return c.json(rows.reverse());
});
