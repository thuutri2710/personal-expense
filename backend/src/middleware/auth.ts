import type { MiddlewareHandler } from "hono";
import type { Env } from "../types";

export const authMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (
  c,
  next,
) => {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token || token !== c.env.API_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
};
