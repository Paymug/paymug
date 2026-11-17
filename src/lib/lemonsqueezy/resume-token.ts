import { createHmac, timingSafeEqual } from "node:crypto";

/** Header value the cron worker sends to resume stalled migration jobs. */
export function migrationResumeToken(secret: string): string {
  return createHmac("sha256", secret).update("migration-resume").digest("hex");
}

export function isValidMigrationResumeToken(token: string | null, secret: string): boolean {
  if (!token) return false;
  const expected = Buffer.from(migrationResumeToken(secret));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
