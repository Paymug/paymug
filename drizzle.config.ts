import { defineConfig } from "drizzle-kit";

/**
 * Used by `drizzle-kit generate` to produce SQL migrations from the schema.
 * Apply migrations with Wrangler:
 *   npm run db:migrate:local
 *   npm run db:migrate:remote
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
});
