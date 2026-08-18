import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { cache } from "react";
import * as schema from "./schema";

export type Db = DrizzleD1Database<typeof schema>;

/**
 * D1 + Drizzle client for request handlers and Server Components.
 * Uses OpenNext's getCloudflareContext so bindings work in `next dev` and on Workers.
 */
export const getDb = cache(async (): Promise<Db> => {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) {
    throw new Error(
      "D1 binding `DB` is missing. Check wrangler.jsonc and run migrations: npm run db:migrate:local"
    );
  }
  return drizzle(env.DB, { schema });
});

export { schema };
