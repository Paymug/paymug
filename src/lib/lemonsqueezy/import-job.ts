import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { featureRecords, migrationJobs, products } from "@/db/schema";
import { decryptSecret, encryptSecret } from "../crypto";
import { uid } from "../utils";
import { sourceAdapters } from "../migrations/adapters";
import {
  isMigrationSource,
  normalizeSourceStages,
  migrationSources,
  type MigrationSourceId,
} from "../migrations/sources";
import { LemonSqueezyClient } from "./client";
import { createInitialState, type ImportOptions, type ImportState } from "./import-engine";
import { createD1ImportSink } from "./import-sink";
import { lsModeToEnvironment } from "./mappers";
import { importStages, type ImportStage } from "./types";

export const migrationSource = "lemonsqueezy";

type JobRow = typeof migrationJobs.$inferSelect;

export interface MigrationJobView {
  id: string;
  source: string;
  status: JobRow["status"];
  stage: string;
  environment: "sandbox" | "live";
  counts: ImportState["counts"];
  errorCount: number;
  errors: ImportState["errors"];
  stages: ImportStage[];
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

function parse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toState(row: JobRow): ImportState {
  const base = createInitialState();
  const cursor = parse<Partial<ImportState>>(row.cursor, {});
  return {
    ...base,
    ...cursor,
    stage: (row.stage as ImportState["stage"]) || base.stage,
    idMap: { ...base.idMap, ...parse(row.idMap, {}) },
    counts: parse(row.counts, {}),
    errors: parse(row.errors, []),
  };
}

function toView(row: JobRow): MigrationJobView {
  const options = parse<{ stages?: ImportStage[] }>(row.options, {});
  const errors = parse<ImportState["errors"]>(row.errors, []);
  return {
    id: row.id,
    source: row.source,
    status: row.status,
    stage: row.stage,
    environment: row.environment,
    counts: parse(row.counts, {}),
    errorCount: errors.length,
    errors: errors.slice(0, 50),
    stages: options.stages ?? [...(isMigrationSource(row.source) ? migrationSources[row.source].stages : importStages)],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    finishedAt: row.finishedAt,
  };
}

export function normalizeStages(
  requested: readonly string[] | undefined,
  source: MigrationSourceId = "lemonsqueezy",
): ImportStage[] {
  return normalizeSourceStages(source, requested);
}

export function createLsClient(apiKey: string) {
  return new LemonSqueezyClient({ apiKey });
}

export async function getSourceStores(
  source: MigrationSourceId,
  secret: string,
  mode: "test" | "live",
) {
  return sourceAdapters[source].listStores(secret, mode);
}

export async function getLsStores(apiKey: string) {
  return getSourceStores("lemonsqueezy", apiKey, "live");
}

export async function previewImport(params: {
  source?: MigrationSourceId;
  apiKey: string;
  lsStoreId: string;
  storeId: string;
  userId: string;
  mode: "test" | "live";
}) {
  const source = params.source ?? "lemonsqueezy";
  const adapter = sourceAdapters[source];
  const mode = adapter.resolveMode(params.apiKey, params.mode);
  const environment = lsModeToEnvironment(mode);
  const data = await adapter.preview(params.apiKey, mode, params.lsStoreId);
  const db = await getDb();
  const existing = await db
    .select({ slug: products.slug, sourceId: products.sourceId, source: products.source })
    .from(products)
    .where(and(eq(products.storeId, params.storeId), eq(products.environment, environment)));
  const taken = new Set(existing.map((row) => row.slug));
  const imported = new Set(
    existing
      .filter((row) => row.sourceId && row.source === source)
      .map((row) => row.sourceId as string),
  );
  const slugConflicts = data.products
    .filter((product) => !imported.has(product.sourceId))
    .map((product) => product.slug)
    .filter((slug) => taken.has(slug));
  const existingDiscounts = await db.query.featureRecords.findMany({
    columns: { title: true },
    where: and(
      eq(featureRecords.userId, params.userId),
      eq(featureRecords.environment, environment),
      eq(featureRecords.feature, "discounts"),
    ),
  });
  const discountCodes = new Set(existingDiscounts.map((row) => row.title.toUpperCase()));
  const discountConflicts = data.discountCodes
    .map((code) => code.toUpperCase())
    .filter((code) => code && discountCodes.has(code));
  return {
    environment,
    mode,
    counts: data.counts,
    alreadyImportedProducts: imported.size,
    conflicts: { productSlugs: slugConflicts, discountCodes: discountConflicts },
    notes: migrationSources[source].notes,
  };
}

export async function createMigrationJob(params: {
  source?: MigrationSourceId;
  userId: string;
  storeId: string;
  apiKey: string;
  lsStoreId: string;
  mode: "test" | "live";
  stages?: readonly string[];
}): Promise<MigrationJobView> {
  const db = await getDb();
  const running = await db.query.migrationJobs.findFirst({
    where: and(
      eq(migrationJobs.userId, params.userId),
      eq(migrationJobs.status, "running"),
    ),
  });
  if (running) throw new Error("A migration is already running");
  const source = params.source ?? "lemonsqueezy";
  const mode = sourceAdapters[source].resolveMode(params.apiKey, params.mode);
  const stages = normalizeStages(params.stages, source);
  const now = new Date().toISOString();
  const row: typeof migrationJobs.$inferInsert = {
    id: uid(),
    userId: params.userId,
    storeId: params.storeId,
    source,
    environment: lsModeToEnvironment(mode),
    status: "running",
    stage: "products",
    cursor: JSON.stringify({}),
    options: JSON.stringify({ stages, lsStoreId: params.lsStoreId, mode }),
    counts: "{}",
    errors: "[]",
    idMap: "{}",
    encryptedKey: await encryptSecret(params.apiKey),
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(migrationJobs).values(row);
  return toView(row as JobRow);
}

export async function getMigrationJob(userId: string, id: string) {
  const db = await getDb();
  return db.query.migrationJobs.findFirst({
    where: and(eq(migrationJobs.id, id), eq(migrationJobs.userId, userId)),
  });
}

export async function getLatestMigrationJob(
  userId: string,
  source: MigrationSourceId = "lemonsqueezy",
) {
  const db = await getDb();
  const row = await db.query.migrationJobs.findFirst({
    where: and(
      eq(migrationJobs.userId, userId),
      eq(migrationJobs.source, source),
    ),
    orderBy: [desc(migrationJobs.createdAt)],
  });
  return row ? toView(row) : null;
}

export async function viewMigrationJob(userId: string, id: string) {
  const row = await getMigrationJob(userId, id);
  return row ? toView(row) : null;
}

/** Runs one chunk of a running job and saves progress. Safe to call repeatedly. */
export async function advanceMigrationJob(
  userId: string,
  id: string,
): Promise<MigrationJobView | null> {
  const db = await getDb();
  const row = await getMigrationJob(userId, id);
  if (!row) return null;
  if (row.status !== "running") return toView(row);
  const source: MigrationSourceId = isMigrationSource(row.source) ? row.source : "lemonsqueezy";
  const jobOptions = parse<{ stages: ImportStage[]; lsStoreId: string; mode?: "test" | "live" }>(row.options, {
    stages: [...migrationSources[source].stages],
    lsStoreId: "",
  });
  const options: ImportOptions & { mode?: "test" | "live" } = {
    lsStoreId: jobOptions.lsStoreId,
    stages: jobOptions.stages,
    mode: jobOptions.mode ?? (row.environment === "sandbox" ? "test" : "live"),
  };
  const now = () => new Date().toISOString();
  try {
    if (!row.encryptedKey) throw new Error("API key is no longer available");
    const secret = await decryptSecret(row.encryptedKey);
    const sink = await createD1ImportSink({
      userId: row.userId,
      storeId: row.storeId,
      environment: row.environment,
      source,
    });
    const { state, done } = await sourceAdapters[source].runChunk(toState(row), options, secret, sink);
    const { idMap, counts, errors, stage, ...cursor } = state;
    await db
      .update(migrationJobs)
      .set({
        stage,
        cursor: JSON.stringify(cursor),
        idMap: JSON.stringify(idMap),
        counts: JSON.stringify(counts),
        errors: JSON.stringify(errors),
        status: done ? "completed" : "running",
        // The key only lives for the job.
        ...(done ? { encryptedKey: null, finishedAt: now() } : {}),
        updatedAt: now(),
      })
      .where(eq(migrationJobs.id, id));
  } catch (error) {
    const errors = parse<ImportState["errors"]>(row.errors, []);
    errors.push({
      stage: row.stage,
      sourceId: "-",
      message: error instanceof Error ? error.message : "Import failed",
    });
    await db
      .update(migrationJobs)
      .set({
        status: "failed",
        errors: JSON.stringify(errors),
        encryptedKey: null,
        finishedAt: now(),
        updatedAt: now(),
      })
      .where(eq(migrationJobs.id, id));
  }
  return viewMigrationJob(userId, id);
}

export async function cancelMigrationJob(userId: string, id: string) {
  const db = await getDb();
  const row = await getMigrationJob(userId, id);
  if (!row) return null;
  if (row.status === "running" || row.status === "pending") {
    await db
      .update(migrationJobs)
      .set({
        status: "cancelled",
        encryptedKey: null,
        finishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(migrationJobs.id, id));
  }
  return viewMigrationJob(userId, id);
}

export async function buildJobReports(userId: string, id: string) {
  const row = await getMigrationJob(userId, id);
  if (!row) return null;
  return { state: toState(row), source: row.source };
}

/** Cron entry: advances a job on behalf of its owner until `budgetMs` is used. */
export async function advanceMigrationJobById(id: string, budgetMs: number) {
  const db = await getDb();
  const row = await db.query.migrationJobs.findFirst({ where: eq(migrationJobs.id, id) });
  if (!row) return null;
  const deadline = Date.now() + budgetMs;
  let view = toView(row);
  while (view.status === "running" && Date.now() < deadline) {
    view = (await advanceMigrationJob(row.userId, id)) ?? view;
  }
  return view;
}
