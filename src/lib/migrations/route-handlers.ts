import { z } from "zod";
import { authorizeMigration, lsErrorResponse } from "@/app/api/settings/migrate/lemonsqueezy/auth";
import { toFailuresCsv, toIdMapCsv } from "@/lib/lemonsqueezy/import-engine";
import {
  advanceMigrationJob,
  buildJobReports,
  cancelMigrationJob,
  createMigrationJob,
  getLatestMigrationJob,
  getSourceStores,
  previewImport,
  viewMigrationJob,
} from "@/lib/lemonsqueezy/import-job";
import { sourceAdapters } from "./adapters";
import { cancelSourceSubscription } from "./cancel";
import {
  isMigrationSource,
  migrationSources,
  type MigrationSourceId,
} from "./sources";
import {
  applyStripeMapping,
  linkStripeSubscriptions,
  listMigrationSubscriptions,
  markLemonSqueezyCancelled,
} from "@/lib/lemonsqueezy/subscription-migration";
import { isReadyToCancelOnLemonSqueezy } from "@/lib/lemonsqueezy/subscription-state";
import { sendResubscribeEmails } from "@/lib/lemonsqueezy/resubscribe.server";
import { MappingParseError, parseStripeMappingCsv } from "./stripe-import-mapping";
import { jsonError } from "@/lib/utils";

export type SourceRouteContext = { params: Promise<{ source: string }> };

/** Resolves the `[source]` segment. Lemon Squeezy has its own static routes. */
export async function resolveSource(ctx: SourceRouteContext): Promise<MigrationSourceId | null> {
  const { source } = await ctx.params;
  return isMigrationSource(source) ? source : null;
}

const unknownSource = () => jsonError("Unknown migration source", 404);

const secretSchema = z.string().trim().min(8).max(4000);
const modeSchema = z.enum(["test", "live"]).default("live");

const connectSchema = z.object({ apiKey: secretSchema, mode: modeSchema });
const previewSchema = z.object({
  apiKey: secretSchema,
  lsStoreId: z.string().trim().min(1).max(60),
  mode: modeSchema,
});
const startSchema = previewSchema.extend({ stages: z.array(z.string()).max(20).optional() });

export async function connect(request: Request, ctx: SourceRouteContext) {
  const source = await resolveSource(ctx);
  if (!source) return unknownSource();
  const auth = await authorizeMigration(request, "write");
  if ("error" in auth) return auth.error;
  const parsed = connectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(`Enter your ${migrationSources[source].secretLabel}`);
  try {
    return Response.json({
      stores: await getSourceStores(source, parsed.data.apiKey, parsed.data.mode),
      mode: sourceAdapters[source].resolveMode(parsed.data.apiKey, parsed.data.mode),
    });
  } catch (error) {
    return lsErrorResponse(error);
  }
}

export async function preview(request: Request, ctx: SourceRouteContext) {
  const source = await resolveSource(ctx);
  if (!source) return unknownSource();
  const auth = await authorizeMigration(request, "write");
  if ("error" in auth) return auth.error;
  const parsed = previewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request");
  try {
    return Response.json(
      await previewImport({ ...parsed.data, source, userId: auth.user.id, storeId: auth.user.activeStoreId }),
    );
  } catch (error) {
    return lsErrorResponse(error);
  }
}

export async function start(request: Request, ctx: SourceRouteContext) {
  const source = await resolveSource(ctx);
  if (!source) return unknownSource();
  const auth = await authorizeMigration(request, "write");
  if ("error" in auth) return auth.error;
  const parsed = startSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request");
  try {
    const job = await createMigrationJob({
      ...parsed.data,
      source,
      userId: auth.user.id,
      storeId: auth.user.activeStoreId,
    });
    return Response.json({ job }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not start", 409);
  }
}

export async function statusGet(request: Request, ctx: SourceRouteContext) {
  const source = await resolveSource(ctx);
  if (!source) return unknownSource();
  const auth = await authorizeMigration(request, "read");
  if ("error" in auth) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  const job = id
    ? await viewMigrationJob(auth.user.id, id)
    : await getLatestMigrationJob(auth.user.id, source);
  if (id && (!job || job.source !== source)) return jsonError("Job not found", 404);
  return Response.json({ job });
}

export async function statusPost(request: Request, ctx: SourceRouteContext) {
  const source = await resolveSource(ctx);
  if (!source) return unknownSource();
  const auth = await authorizeMigration(request, "write");
  if ("error" in auth) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("id is required");
  const existing = await viewMigrationJob(auth.user.id, id);
  if (!existing || existing.source !== source) return jsonError("Job not found", 404);
  const job = await advanceMigrationJob(auth.user.id, id);
  if (!job) return jsonError("Job not found", 404);
  return Response.json({ job });
}

export async function cancel(request: Request, ctx: SourceRouteContext) {
  const source = await resolveSource(ctx);
  if (!source) return unknownSource();
  const auth = await authorizeMigration(request, "write");
  if ("error" in auth) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("id is required");
  const existing = await viewMigrationJob(auth.user.id, id);
  if (!existing || existing.source !== source) return jsonError("Job not found", 404);
  const job = await cancelMigrationJob(auth.user.id, id);
  if (!job) return jsonError("Job not found", 404);
  return Response.json({ job });
}

export async function report(request: Request, ctx: SourceRouteContext, kind: "failures" | "id-map") {
  const source = await resolveSource(ctx);
  if (!source) return unknownSource();
  const auth = await authorizeMigration(request, "read");
  if ("error" in auth) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("id is required");
  const result = await buildJobReports(auth.user.id, id);
  if (!result || result.source !== source) return jsonError("Job not found", 404);
  const body =
    kind === "failures"
      ? toFailuresCsv(result.state.errors, source)
      : toIdMapCsv(result.state, source);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${source}-${kind === "failures" ? "report" : "id-map"}.csv"`,
    },
  });
}

export async function subscriptionsList(request: Request, ctx: SourceRouteContext) {
  const source = await resolveSource(ctx);
  if (!source) return unknownSource();
  const auth = await authorizeMigration(request, "read");
  if ("error" in auth) return auth.error;
  const subscriptions = await listMigrationSubscriptions(
    auth.user.id,
    auth.user.activeStoreId,
    auth.user.environment,
    source,
  );
  return Response.json({ subscriptions });
}

const linkSchema = z.object({
  dryRun: z.boolean().default(true),
  recordIds: z.array(z.string().min(1)).max(500).optional(),
});

export async function subscriptionsLink(request: Request, ctx: SourceRouteContext) {
  const source = await resolveSource(ctx);
  if (!source) return unknownSource();
  const auth = await authorizeMigration(request, "write");
  if ("error" in auth) return auth.error;
  const parsed = linkSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid request");
  try {
    return Response.json(
      await linkStripeSubscriptions({
        userId: auth.user.id,
        storeId: auth.user.activeStoreId,
        environment: auth.user.environment,
        source,
        ...parsed.data,
      }),
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not link", 409);
  }
}

const resubscribeSchema = z.object({
  recordIds: z.array(z.string().min(1)).max(500).optional(),
  resend: z.boolean().optional(),
});

export async function subscriptionsResubscribe(request: Request, ctx: SourceRouteContext) {
  const source = await resolveSource(ctx);
  if (!source) return unknownSource();
  const auth = await authorizeMigration(request, "write");
  if ("error" in auth) return auth.error;
  const parsed = resubscribeSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid request");
  return Response.json(
    await sendResubscribeEmails({
      userId: auth.user.id,
      storeId: auth.user.activeStoreId,
      environment: auth.user.environment,
      requestUrl: request.url,
      source,
      ...parsed.data,
    }),
  );
}

const cancelSchema = z.object({
  apiKey: secretSchema,
  mode: modeSchema,
  recordIds: z.array(z.string().min(1)).min(1).max(100),
});

/** Ends the source copy of subscriptions that already bill through Paymug. */
export async function subscriptionsCancel(request: Request, ctx: SourceRouteContext) {
  const source = await resolveSource(ctx);
  if (!source) return unknownSource();
  const auth = await authorizeMigration(request, "write");
  if ("error" in auth) return auth.error;
  const parsed = cancelSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request");
  // Sandbox data was imported with a test key, so cancel with one too.
  const mode = sourceAdapters[source].resolveMode(
    parsed.data.apiKey,
    auth.user.environment === "sandbox" ? "test" : "live",
  );
  const rows = await listMigrationSubscriptions(
    auth.user.id,
    auth.user.activeStoreId,
    auth.user.environment,
    source,
  );
  const cancelled: string[] = [];
  const skipped: Array<{ recordId: string; reason: string }> = [];
  const failed: Array<{ recordId: string; message: string }> = [];
  for (const recordId of parsed.data.recordIds) {
    const row = rows.find((candidate) => candidate.id === recordId);
    if (!row || !row.lsSourceId) {
      skipped.push({ recordId, reason: "Not an imported subscription" });
    } else if (!isReadyToCancelOnLemonSqueezy(row)) {
      // Cancelling before the customer pays through Paymug would drop them.
      skipped.push({ recordId, reason: "Not live on Paymug yet, or already cancelled" });
    } else {
      try {
        await cancelSourceSubscription(source, parsed.data.apiKey, row.lsSourceId, mode);
        await markLemonSqueezyCancelled(recordId);
        cancelled.push(recordId);
      } catch (error) {
        failed.push({
          recordId,
          message: error instanceof Error ? error.message.slice(0, 300) : "Cancel failed",
        });
      }
    }
  }
  return Response.json({ cancelled, skipped, failed });
}

/** Stripe import mapping CSV (source ids -> Stripe ids), sent as text. */
export async function subscriptionsMapping(request: Request, ctx: SourceRouteContext) {
  const source = await resolveSource(ctx);
  if (!source) return unknownSource();
  const auth = await authorizeMigration(request, "write");
  if ("error" in auth) return auth.error;
  const parsed = z
    .object({ csv: z.string().min(10).max(5_000_000) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Send the mapping file as { csv }");
  try {
    const rows = parseStripeMappingCsv(parsed.data.csv);
    if (rows.length === 0) return jsonError("The mapping file has no usable rows");
    return Response.json({
      rows: rows.length,
      ...(await applyStripeMapping({
        userId: auth.user.id,
        storeId: auth.user.activeStoreId,
        environment: auth.user.environment,
        source,
        rows,
      })),
    });
  } catch (error) {
    if (error instanceof MappingParseError) return jsonError(error.message);
    return jsonError(error instanceof Error ? error.message : "Could not apply mapping", 409);
  }
}
