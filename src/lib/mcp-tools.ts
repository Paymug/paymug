import "server-only";

import { z } from "zod";
import * as categoriesRoute from "@/app/api/categories/route";
import * as categoryRoute from "@/app/api/categories/[id]/route";
import * as featureRoute from "@/app/api/features/[feature]/route";
import * as featureRecordRoute from "@/app/api/features/[feature]/[id]/route";
import * as ordersRoute from "@/app/api/orders/route";
import * as productsRoute from "@/app/api/products/route";
import * as migrateConnectRoute from "@/app/api/settings/migrate/lemonsqueezy/connect/route";
import * as migrateStartRoute from "@/app/api/settings/migrate/lemonsqueezy/start/route";
import * as migrateStatusRoute from "@/app/api/settings/migrate/lemonsqueezy/status/route";
import * as productRoute from "@/app/api/products/[id]/route";
import {
  apiKeyResourceActions,
  hasApiKeyScope,
  type ApiKeyAction,
  type ApiKeyResource,
} from "./api-key-scopes";

/** Resources that are plain feature records (`/api/features/[feature]`). */
const recordResources = [
  "customers",
  "discounts",
  "licenses",
  "subscribers",
] as const satisfies readonly ApiKeyResource[];
type RecordResource = (typeof recordResources)[number];

export interface McpToolContext {
  scopes: readonly string[];
  origin: string;
}

export interface McpToolResult {
  ok: boolean;
  status: number;
  body: unknown;
}

interface McpToolDefinition {
  name: string;
  description: string;
  action: ApiKeyAction;
  /** Resources the tool operates on. Visible when the key grants any of them. */
  resources: readonly ApiKeyResource[];
  /** Input schema; receives the resources the key may use for this action. */
  input: (allowed: readonly ApiKeyResource[]) => z.ZodType;
  run: (
    args: Record<string, unknown>,
    ctx: McpToolContext,
    allowed: readonly ApiKeyResource[]
  ) => Promise<McpToolResult>;
}

const idField = z.string().min(1).describe("Record ID");
const looseObject = (description: string) =>
  z.looseObject({}).describe(description);

async function callRoute(
  ctx: McpToolContext,
  handler: (req: Request, routeCtx: never) => Promise<Response>,
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string>
): Promise<McpToolResult> {
  const request = new Request(new URL(path, ctx.origin), {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const response = await handler(request, {
    params: Promise.resolve(params ?? {}),
  } as never);
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text
  }
  return { ok: response.ok, status: response.status, body: parsed };
}

function recordFeature(
  args: Record<string, unknown>,
  allowed: readonly ApiKeyResource[]
): RecordResource | undefined {
  const feature = String(args.feature);
  return (allowed as readonly string[]).includes(feature)
    ? (feature as RecordResource)
    : undefined;
}

const featureEnum = (allowed: readonly ApiKeyResource[]) =>
  z
    .enum(allowed as [RecordResource, ...RecordResource[]])
    .describe("Record type");

const forbidden = (feature: unknown): McpToolResult => ({
  ok: false,
  status: 403,
  body: { error: `This API key cannot access "${String(feature)}" for this action` },
});

export const mcpTools: McpToolDefinition[] = [
  // Products
  {
    name: "list_products",
    description:
      "List products in the active store and environment (sandbox/live).",
    action: "read",
    resources: ["products"],
    input: () => z.object({}),
    run: (_args, ctx) => callRoute(ctx, productsRoute.GET, "GET", "/api/products"),
  },
  {
    name: "get_product",
    description: "Get one product by ID.",
    action: "read",
    resources: ["products"],
    input: () => z.object({ id: idField }),
    run: (args, ctx) =>
      callRoute(ctx, productRoute.GET, "GET", `/api/products/${args.id}`, undefined, {
        id: String(args.id),
      }),
  },
  {
    name: "create_product",
    description:
      "Create a product. Prices are integers in minor currency units (e.g. 1999 = $19.99). Defaults to a draft one-time product.",
    action: "write",
    resources: ["products"],
    input: () =>
      z.looseObject({
        name: z.string().min(1).max(120),
        price: z.number().int().nonnegative().describe("Minor currency units"),
        currency: z.string().length(3).optional().describe("ISO code, default USD"),
        description: z.string().optional(),
        slug: z.string().optional(),
        status: z.enum(["draft", "published"]).optional(),
        billingType: z.enum(["one_time", "subscription"]).optional(),
        intervalUnit: z.enum(["week", "month", "year"]).optional(),
        intervalCount: z.number().int().optional(),
        deliveryContent: z.string().optional(),
        categoryIds: z.array(z.string()).optional(),
      }),
    run: (args, ctx) =>
      callRoute(ctx, productsRoute.POST, "POST", "/api/products", args),
  },
  {
    name: "update_product",
    description:
      "Update a product. Pass only the fields to change (same fields as create_product).",
    action: "write",
    resources: ["products"],
    input: () =>
      z.object({ id: idField, fields: looseObject("Product fields to change") }),
    run: (args, ctx) =>
      callRoute(ctx, productRoute.PATCH, "PATCH", `/api/products/${args.id}`, args.fields, {
        id: String(args.id),
      }),
  },
  {
    name: "delete_product",
    description: "Permanently delete a product. This cannot be undone.",
    action: "delete",
    resources: ["products"],
    input: () => z.object({ id: idField }),
    run: (args, ctx) =>
      callRoute(ctx, productRoute.DELETE, "DELETE", `/api/products/${args.id}`, undefined, {
        id: String(args.id),
      }),
  },

  // Categories
  {
    name: "list_categories",
    description: "List product categories in the active store.",
    action: "read",
    resources: ["categories"],
    input: () => z.object({}),
    run: (_args, ctx) =>
      callRoute(ctx, categoriesRoute.GET, "GET", "/api/categories"),
  },
  {
    name: "create_category",
    description: "Create a product category.",
    action: "write",
    resources: ["categories"],
    input: () =>
      z.object({
        name: z.string().min(1).max(80),
        slug: z.string().min(1).max(80),
        description: z.string().max(500).optional(),
        visibleOnStorefront: z.boolean().optional(),
        productIds: z.array(z.string()).optional(),
      }),
    run: (args, ctx) =>
      callRoute(ctx, categoriesRoute.POST, "POST", "/api/categories", args),
  },
  {
    name: "update_category",
    description:
      "Replace a category's settings. name and slug are required; productIds replaces its product list.",
    action: "write",
    resources: ["categories"],
    input: () =>
      z.object({
        id: idField,
        name: z.string().min(1).max(80),
        slug: z.string().min(1).max(80),
        description: z.string().max(500).optional(),
        visibleOnStorefront: z.boolean().optional(),
        productIds: z.array(z.string()).optional(),
      }),
    run: ({ id, ...body }, ctx) =>
      callRoute(ctx, categoryRoute.PATCH, "PATCH", `/api/categories/${id}`, body, {
        id: String(id),
      }),
  },
  {
    name: "delete_category",
    description: "Delete a category. Products in it are kept.",
    action: "delete",
    resources: ["categories"],
    input: () => z.object({ id: idField }),
    run: (args, ctx) =>
      callRoute(ctx, categoryRoute.DELETE, "DELETE", `/api/categories/${args.id}`, undefined, {
        id: String(args.id),
      }),
  },

  // Orders (read-only)
  {
    name: "list_orders",
    description:
      "List orders in the active store and environment, newest first.",
    action: "read",
    resources: ["orders"],
    input: () =>
      z.object({
        limit: z.number().int().min(1).max(200).optional().describe("Default 50"),
        status: z.string().optional().describe("Only orders with this status"),
      }),
    run: async (args, ctx) => {
      const result = await callRoute(ctx, ordersRoute.GET, "GET", "/api/orders");
      const body = result.body as { orders?: Array<{ status?: string }> };
      if (!result.ok || !Array.isArray(body?.orders)) return result;
      const filtered = args.status
        ? body.orders.filter((order) => order.status === args.status)
        : body.orders;
      return {
        ...result,
        body: { orders: filtered.slice(0, Number(args.limit) || 50) },
      };
    },
  },

  // Feature records: customers, discounts, licenses, subscribers
  {
    name: "list_records",
    description:
      "List customers, discounts, licenses or subscribers in the active environment.",
    action: "read",
    resources: recordResources,
    input: (allowed) =>
      z.object({
        feature: featureEnum(allowed),
        limit: z.number().int().min(1).max(500).optional().describe("Default 100"),
      }),
    run: async (args, ctx, allowed) => {
      const feature = recordFeature(args, allowed);
      if (!feature) return forbidden(args.feature);
      const result = await callRoute(
        ctx,
        featureRoute.GET,
        "GET",
        `/api/features/${feature}`,
        undefined,
        { feature }
      );
      const body = result.body as { records?: unknown[] };
      if (!result.ok || !Array.isArray(body?.records)) return result;
      return {
        ...result,
        body: { records: body.records.slice(0, Number(args.limit) || 100) },
      };
    },
  },
  {
    name: "create_record",
    description:
      "Create a customer, discount, license or subscriber. `data` holds type-specific fields (e.g. discount code, percent).",
    action: "write",
    resources: recordResources,
    input: (allowed) =>
      z.object({
        feature: featureEnum(allowed),
        title: z.string().min(1).max(160),
        subtitle: z.string().max(240).optional(),
        status: z.string().max(40).optional(),
        data: looseObject("Type-specific fields").optional(),
      }),
    run: ({ feature: rawFeature, ...body }, ctx, allowed) => {
      const feature = recordFeature({ feature: rawFeature }, allowed);
      if (!feature) return Promise.resolve(forbidden(rawFeature));
      return callRoute(ctx, featureRoute.POST, "POST", `/api/features/${feature}`, body, {
        feature,
      });
    },
  },
  {
    name: "update_record",
    description:
      "Update a customer, discount, license or subscriber. Pass only fields to change; `data` is merged.",
    action: "write",
    resources: recordResources,
    input: (allowed) =>
      z.object({
        feature: featureEnum(allowed),
        id: idField,
        title: z.string().min(1).max(160).optional(),
        subtitle: z.string().max(240).optional(),
        status: z.string().max(40).optional(),
        data: looseObject("Fields to merge").optional(),
      }),
    run: ({ feature: rawFeature, id, ...body }, ctx, allowed) => {
      const feature = recordFeature({ feature: rawFeature }, allowed);
      if (!feature) return Promise.resolve(forbidden(rawFeature));
      return callRoute(
        ctx,
        featureRecordRoute.PATCH,
        "PATCH",
        `/api/features/${feature}/${id}`,
        body,
        { feature, id: String(id) }
      );
    },
  },
  {
    name: "delete_record",
    description:
      "Permanently delete a customer, discount, license or subscriber record.",
    action: "delete",
    resources: recordResources,
    input: (allowed) =>
      z.object({ feature: featureEnum(allowed), id: idField }),
    run: (args, ctx, allowed) => {
      const feature = recordFeature(args, allowed);
      if (!feature) return Promise.resolve(forbidden(args.feature));
      return callRoute(
        ctx,
        featureRecordRoute.DELETE,
        "DELETE",
        `/api/features/${feature}/${args.id}`,
        undefined,
        { feature, id: String(args.id) }
      );
    },
  },
  // Migration (Lemon Squeezy -> Paymug). Free: no Pro check.
  {
    name: "migrate_from_lemonsqueezy",
    description:
      "Start importing a Lemon Squeezy store (products, variants, files, customers, orders, license keys, discounts, affiliates, subscriptions) into the active Paymug store. Test keys import into sandbox, live keys into live. Omit lsStoreId to list the Lemon Squeezy stores first. Then call advance_migration until the job is completed.",
    action: "write",
    resources: ["migrations"],
    input: () =>
      z.object({
        apiKey: z.string().min(20).describe("Lemon Squeezy API key (used for this job only)"),
        mode: z.enum(["test", "live"]),
        lsStoreId: z.string().optional().describe("Lemon Squeezy store ID"),
        stages: z.array(z.string()).optional().describe("Subset of: files, customers, orders, licenses, discounts, affiliates, subscriptions"),
      }),
    run: async (args, ctx) => {
      const connected = await callRoute(ctx, migrateConnectRoute.POST, "POST", "/api/settings/migrate/lemonsqueezy/connect", { apiKey: args.apiKey });
      if (!connected.ok) return connected;
      const stores = (connected.body as { stores: Array<{ id: string }> }).stores;
      const lsStoreId = (args.lsStoreId as string | undefined) ?? (stores.length === 1 ? stores[0].id : undefined);
      if (!lsStoreId) return { ok: true, status: 200, body: { chooseStore: stores } };
      return callRoute(ctx, migrateStartRoute.POST, "POST", "/api/settings/migrate/lemonsqueezy/start", {
        apiKey: args.apiKey,
        lsStoreId,
        mode: args.mode,
        stages: args.stages,
      });
    },
  },
  {
    name: "advance_migration",
    description:
      "Run up to `steps` import chunks of a Lemon Squeezy migration job and return its progress. Call repeatedly until status is completed.",
    action: "write",
    resources: ["migrations"],
    input: () =>
      z.object({
        jobId: idField,
        steps: z.number().int().min(1).max(20).default(5),
      }),
    run: async (args, ctx) => {
      let last: McpToolResult = { ok: false, status: 500, body: null };
      for (let step = 0; step < Number(args.steps ?? 5); step += 1) {
        last = await callRoute(
          ctx,
          migrateStatusRoute.POST,
          "POST",
          `/api/settings/migrate/lemonsqueezy/status?id=${encodeURIComponent(String(args.jobId))}`,
        );
        const status = (last.body as { job?: { status?: string } } | null)?.job?.status;
        if (!last.ok || status !== "running") break;
      }
      return last;
    },
  },
  {
    name: "get_migration_status",
    description: "Read the progress of a Lemon Squeezy migration job (latest when jobId is omitted) without advancing it.",
    action: "read",
    resources: ["migrations"],
    input: () => z.object({ jobId: z.string().optional() }),
    run: (args, ctx) =>
      callRoute(
        ctx,
        migrateStatusRoute.GET,
        "GET",
        `/api/settings/migrate/lemonsqueezy/status${args.jobId ? `?id=${encodeURIComponent(String(args.jobId))}` : ""}`,
      ),
  },
];

/** Resources of `tool` the key may use. Empty means the tool is hidden. */
export function allowedResources(
  tool: McpToolDefinition,
  scopes: readonly string[]
): ApiKeyResource[] {
  return tool.resources.filter(
    (resource) =>
      apiKeyResourceActions[resource].includes(tool.action) &&
      hasApiKeyScope(scopes, resource, tool.action)
  );
}
