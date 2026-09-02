import type { Context } from "grammy";
import type { ApiClient } from "./api-client";

export type BotContext = Context & {
  backend: ApiClient;
};
