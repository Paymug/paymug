import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRuntimeConfiguration } from "./runtime-env";
import { runtimeDatabaseMigrations } from "./setup-database-migrations.config";
import type {
  InitialSetupDatabaseResult,
  InitialSetupEnvironmentItem,
  InitialSetupEnvironmentResult,
} from "./initial-setup.types";

const migrationsTable = "d1_migrations";

async function getSetupDatabase(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) throw new Error("The DB binding is not configured");
  return env.DB;
}

async function tableExists(
  database: D1Database,
  tableName: string,
): Promise<boolean> {
  const row = await database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    )
    .bind(tableName)
    .first<{ name: string }>();
  return Boolean(row);
}

export async function initialSetupHasRegisteredUser(): Promise<boolean> {
  try {
    const database = await getSetupDatabase();
    if (!(await tableExists(database, "users"))) return false;
    const row = await database
      .prepare("SELECT id FROM users LIMIT 1")
      .first<{ id: string }>();
    return Boolean(row);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "The DB binding is not configured"
    ) {
      return false;
    }
    throw error;
  }
}

async function getAppliedMigrationNames(
  database: D1Database,
): Promise<Set<string>> {
  await database
    .prepare(
      `CREATE TABLE IF NOT EXISTS ${migrationsTable}(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`,
    )
    .run();
  const result = await database
    .prepare(`SELECT name FROM ${migrationsTable} ORDER BY id`)
    .all<{ name: string }>();
  return new Set(result.results.map((row) => row.name));
}

let migrationsKnownApplied = false;

/** Names of bundled migrations the database has not applied yet. */
export async function getPendingDatabaseMigrations(): Promise<string[]> {
  if (migrationsKnownApplied) return [];
  const database = await getSetupDatabase();
  if (!(await tableExists(database, migrationsTable))) {
    return runtimeDatabaseMigrations.map((migration) => migration.name);
  }
  const result = await database
    .prepare(`SELECT name FROM ${migrationsTable}`)
    .all<{ name: string }>();
  const applied = new Set(result.results.map((row) => row.name));
  const pending = runtimeDatabaseMigrations
    .filter((migration) => !applied.has(migration.name))
    .map((migration) => migration.name);
  if (pending.length === 0) migrationsKnownApplied = true;
  return pending;
}

/** Whether `userId` exists, using raw SQL so it works against an outdated schema. */
export async function databaseUserExists(userId: string): Promise<boolean> {
  const database = await getSetupDatabase();
  const row = await database
    .prepare("SELECT id FROM users WHERE id = ? LIMIT 1")
    .bind(userId)
    .first<{ id: string }>();
  return Boolean(row);
}

export async function migrateInitialSetupDatabase(): Promise<InitialSetupDatabaseResult> {
  if (await initialSetupHasRegisteredUser()) {
    throw new Error("Initial setup is no longer available");
  }
  return applyPendingDatabaseMigrations();
}

export async function applyPendingDatabaseMigrations(): Promise<InitialSetupDatabaseResult> {
  const database = await getSetupDatabase();
  const appliedNames = await getAppliedMigrationNames(database);
  let appliedMigrations = 0;

  for (const migration of runtimeDatabaseMigrations) {
    if (appliedNames.has(migration.name)) continue;
    await database.batch([
      ...migration.statements.map((statement) => database.prepare(statement)),
      database
        .prepare(`INSERT INTO ${migrationsTable} (name) VALUES (?)`)
        .bind(migration.name),
    ]);
    appliedMigrations += 1;
  }
  migrationsKnownApplied = true;

  return {
    appliedMigrations,
    totalMigrations: runtimeDatabaseMigrations.length,
  };
}

export async function getInitialSetupEnvironment(): Promise<InitialSetupEnvironmentResult> {
  const runtime = await getRuntimeConfiguration();
  const definitions: Array<
    Omit<InitialSetupEnvironmentItem, "configured">
  > = [
    {
      key: "AUTH_SECRET",
      description: "Signs administrator sessions. Use a long, random value.",
    },
    {
      key: "ENCRYPTION_SECRET",
      description: "Encrypts credentials stored by the app. Use a different random value.",
    },
    {
      key: "NEXT_PUBLIC_APP_URL",
      description: "The full public URL of this app, including https:// in production.",
    },
  ];
  const items = definitions.map((item) => ({
    ...item,
    configured: Boolean(runtime.values[item.key]),
  }));
  return {
    complete: items.every((item) => item.configured),
    items,
  };
}
