import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware } from "./middleware/auth";
import { categoriesRoute } from "./routes/categories";
import { expensesRoute } from "./routes/expenses";
import { creditExpensesRoute } from "./routes/credit-expenses";
import { analyticsRoute } from "./routes/analytics";
import { messagesRoute } from "./routes/messages";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

app.use("*", async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.CORS_ORIGINS.split(",").map((o) => o.trim()),
  });
  return corsMiddleware(c, next);
});

app.get("/health", (c) => c.json({ ok: true }));

const api = new Hono<{ Bindings: Env }>();
api.use("*", authMiddleware);
api.route("/expenses", expensesRoute);
api.route("/credit-expenses", creditExpensesRoute);
api.route("/categories", categoriesRoute);
api.route("/analytics", analyticsRoute);
api.route("/messages", messagesRoute);

app.route("/", api);

export default app;
