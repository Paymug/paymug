import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { featureRecords, migrationJobs, products } from "@/db/schema";
import { decryptSecret, encryptSecret } from "../crypto";
import { uid } from "../utils";
import { LemonSqueezyClient } from "./client";
import {
  createInitialState,
  runImportChunk,
  type ImportOptions,
  type ImportState,
} from "./import-engine";
import { createD1ImportSink } from "./import-sink";
import { lsModeToEnvironment, mapProduct, lemonSqueezySource } from "./mappers";
import { importStages, type ImportStage } from "./types";

export const migrationSource = "lemonsqueezy";

type JobRow = typeof migrationJobs.$inferSelect;

export interface MigrationJobView {
  id: string;
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
    status: row.status,
    stage: row.stage,
    environment: row.environment,
    counts: parse(row.counts, {}),
    errorCount: errors.length,
    errors: errors.slice(0, 50),
    stages: options.stages ?? [...importStages],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    finishedAt: row.finishedAt,
  };
}

export function normalizeStages(requested: readonly string[] | undefined): ImportStage[] {
  const wanted = new Set(requested ?? importStages);
  // Everything else hangs off products, so it is always imported.
  wanted.add("products");
  return importStages.filter((stage) => wanted.has(stage));
}

export function createLsClient(apiKey: string) {
  return new LemonSqueezyClient({ apiKey });
}

export async function getLsStores(apiKey: string) {
  const stores = await createLsClient(apiKey).listAll("stores");
  return stores.map((store) => ({
    id: store.id,
    name: String(store.attributes.name ?? store.id),
    currency: String(store.attributes.currency ?? ""),
    url: String(store.attributes.url ?? ""),
  }));
}

export async function previewImport(params: {
  apiKey: string;
  lsStoreId: string;
  storeId: string;
  userId: string;
  mode: "test" | "live";
}) {
  const client = createLsClient(params.apiKey);
  const environment = lsModeToEnvironment(params.mode);
  const filter = { store_id: params.lsStoreId };
  const [productsList, customers, orders, licenses, discounts, affiliates, subscriptions] =
    await Promise.all([
      client.listAll("products", filter),
      client.count("customers", filter),
      client.count("orders", filter),
      client.count("license-keys", filter),
      client.count("discounts", filter),
      client.count("affiliates", filter).catch(() => 0),
      client.count("subscriptions", filter),
    ]);
  const db = await getDb();
  const existing = await db
    .select({ slug: products.slug, sourceId: products.sourceId })
    .from(products)
    .where(and(eq(products.storeId, params.storeId), eq(products.environment, environment)));
  const taken = new Set(existing.map((row) => row.slug));
  const imported = new Set(
    existing.filter((row) => row.sourceId).map((row) => row.sourceId as string),
  );
  const slugConflicts = productsList
    .filter((resource) => !imported.has(resource.id))
    .map((resource) => mapProduct(resource, new Set()))
    .filter((product) => taken.has(product.slug))
    .map((product) => product.slug);
  const existingDiscounts = await db.query.featureRecords.findMany({
    columns: { title: true },
    where: and(
      eq(featureRecords.userId, params.userId),
      eq(featureRecords.environment, environment),
      eq(featureRecords.feature, "discounts"),
    ),
  });
  const discountCodes = new Set(existingDiscounts.map((row) => row.title.toUpperCase()));
  const lsDiscounts = discounts
    ? await client.listAll("discounts", filter)
    : [];
  const discountConflicts = lsDiscounts
    .map((resource) => String(resource.attributes.code ?? "").toUpperCase())
    .filter((code) => code && discountCodes.has(code));
  return {
    environment,
    counts: {
      products: productsList.length,
      customers,
      orders,
      licenses,
      discounts,
      affiliates,
      subscriptions,
    },
    alreadyImportedProducts: imported.size,
    conflicts: { productSlugs: slugConflicts, discountCodes: discountConflicts },
  };
}

export async function createMigrationJob(params: {
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
  const stages = normalizeStages(params.stages);
  const now = new Date().toISOString();
  const row: typeof migrationJobs.$inferInsert = {
    id: uid(),
    userId: params.userId,
    storeId: params.storeId,
    source: migrationSource,
    environment: lsModeToEnvironment(params.mode),
    status: "running",
    stage: "products",
    cursor: JSON.stringify({}),
    options: JSON.stringify({ stages, lsStoreId: params.lsStoreId }),
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

export async function getLatestMigrationJob(userId: string) {
  const db = await getDb();
  const row = await db.query.migrationJobs.findFirst({
    where: and(
      eq(migrationJobs.userId, userId),
      eq(migrationJobs.source, migrationSource),
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
  const jobOptions = parse<{ stages: ImportStage[]; lsStoreId: string }>(row.options, {
    stages: [...importStages],
    lsStoreId: "",
  });
  const options: ImportOptions = {
    lsStoreId: jobOptions.lsStoreId,
    stages: jobOptions.stages,
  };
  const now = () => new Date().toISOString();
  try {
    if (!row.encryptedKey) throw new Error("API key is no longer available");
    const client = createLsClient(await decryptSecret(row.encryptedKey));
    const sink = await createD1ImportSink({
      userId: row.userId,
      storeId: row.storeId,
      environment: row.environment,
    });
    const { state, done } = await runImportChunk(toState(row), options, client, sink);
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
  return { state: toState(row), source: lemonSqueezySource };
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
