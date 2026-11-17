import type { LemonSqueezyClient } from "./client";
import {
  dedupeCustomers,
  mapAffiliate,
  mapCustomer,
  mapDiscount,
  mapFile,
  mapLicense,
  mapLicenseInstance,
  mapOrder,
  mapProduct,
  mapSubscription,
  mapVariant,
  slugify,
  type MappedAffiliate,
  type MappedCustomer,
  type MappedDiscount,
  type MappedFile,
  type MappedLicense,
  type MappedLicenseInstance,
  type MappedOrder,
  type MappedProduct,
  type MappedSubscription,
  type MappedVariant,
} from "./mappers";
import {
  importStages,
  type ImportCounts,
  type ImportErrorEntry,
  type ImportStage,
} from "./types";

export type UpsertResult = { id: string; created: boolean };

export interface StoredFileRef {
  id: string;
  name: string;
  size: number;
  type: string;
  storageKey: string;
}

/** Persistence the engine needs. Every upsert is keyed on the LS source id. */
export interface ImportSink {
  upsertProduct(item: MappedProduct): Promise<UpsertResult>;
  upsertVariant(item: MappedVariant, productId: string): Promise<UpsertResult>;
  getVariantFileNames(variantId: string): Promise<string[]>;
  storeFile(bytes: ArrayBuffer, name: string, type: string): Promise<StoredFileRef>;
  appendVariantFiles(variantId: string, files: StoredFileRef[]): Promise<void>;
  upsertCustomer(item: MappedCustomer): Promise<UpsertResult>;
  upsertOrder(
    item: MappedOrder,
    refs: { productId: string; variantId: string | null },
  ): Promise<UpsertResult>;
  upsertLicense(
    item: MappedLicense,
    refs: {
      orderId: string | null;
      productId: string | null;
      productName: string | null;
      instances: MappedLicenseInstance[];
    },
  ): Promise<UpsertResult>;
  upsertDiscount(item: MappedDiscount, productIds: string[] | "all"): Promise<UpsertResult>;
  upsertAffiliate(item: MappedAffiliate): Promise<UpsertResult>;
  upsertSubscription(
    item: MappedSubscription,
    refs: { productId: string | null; variantId: string | null },
  ): Promise<UpsertResult>;
  existingProductSlugs(): Promise<Set<string>>;
  existingAffiliateCodes(): Promise<Set<string>>;
  /** Marks imported orders of a source transaction refunded. Returns rows changed. */
  markOrdersRefunded?(sourceId: string): Promise<number>;
}

export interface ImportState {
  stage: ImportStage | "done";
  /** Position inside the current stage. */
  page: number;
  index: number;
  idMap: {
    products: Record<string, string>;
    productNames: Record<string, string>;
    variants: Record<string, string>;
    /** Variants that belong to each product, to run the files stage. */
    variantProduct: Record<string, string>;
    orders: Record<string, string>;
    licenses: Record<string, string>;
    discounts: Record<string, string>;
    affiliates: Record<string, string>;
    customers: Record<string, string>;
    subscriptions: Record<string, string>;
  };
  counts: ImportCounts;
  errors: ImportErrorEntry[];
  /** Slugs handed out so far in this job, to avoid in-job collisions. */
  usedSlugs: string[];
  variantSlugs: Record<string, string[]>;
  usedAffiliateCodes: string[];
  /** Opaque cursor for cursor-paginated sources (Paddle). */
  cursor?: string;
  /** Source-specific scratch (benefit -> product etc.). Kept small. */
  extra?: Record<string, Record<string, string>>;
}

export interface ImportOptions {
  lsStoreId: string;
  /** Stages the seller turned on. */
  stages: ImportStage[];
}

export function createInitialState(): ImportState {
  return {
    stage: "products",
    page: 1,
    index: 0,
    idMap: {
      products: {},
      productNames: {},
      variants: {},
      variantProduct: {},
      orders: {},
      licenses: {},
      discounts: {},
      affiliates: {},
      customers: {},
      subscriptions: {},
    },
    counts: {},
    errors: [],
    usedSlugs: [],
    variantSlugs: {},
    usedAffiliateCodes: [],
  };
}

const maxErrors = 500;
const filesPerChunk = 3;

export function bump(state: ImportState, stage: string, key: "imported" | "skipped" | "failed") {
  const entry = (state.counts[stage] ??= { imported: 0, skipped: 0, failed: 0 });
  entry[key] += 1;
}

export function fail(state: ImportState, stage: string, sourceId: string, error: unknown) {
  bump(state, stage, "failed");
  if (state.errors.length < maxErrors) {
    state.errors.push({
      stage,
      sourceId,
      message: (error instanceof Error ? error.message : String(error)).slice(0, 300),
    });
  }
}

export function record(state: ImportState, stage: string, result: UpsertResult) {
  bump(state, stage, result.created ? "imported" : "skipped");
}

export function nextStage(state: ImportState, options: ImportOptions) {
  const current = state.stage === "done" ? importStages.length : importStages.indexOf(state.stage);
  const next = importStages.slice(current + 1).find((stage) => options.stages.includes(stage));
  state.stage = next ?? "done";
  state.page = 1;
  state.index = 0;
  state.cursor = undefined;
}

/**
 * Runs one bounded unit of work (one page or a few files) and returns the new
 * state. Safe to call again after a crash: every write is an upsert.
 */
export async function runImportChunk(
  input: ImportState,
  options: ImportOptions,
  client: LemonSqueezyClient,
  sink: ImportSink,
): Promise<{ state: ImportState; done: boolean }> {
  const state: ImportState = structuredClone(input);
  if (state.stage !== "done" && !options.stages.includes(state.stage)) {
    nextStage(state, options);
  }
  const stage = state.stage;
  const storeFilter = { store_id: options.lsStoreId };

  switch (stage) {
    case "products": {
      const { data, hasMore } = await client.listPage("products", storeFilter, state.page, 10);
      const slugs = new Set([...(await sink.existingProductSlugs()), ...state.usedSlugs]);
      for (const resource of data) {
        try {
          const mapped = mapProduct(resource, slugs);
          const result = await sink.upsertProduct(mapped);
          state.idMap.products[resource.id] = result.id;
          state.idMap.productNames[resource.id] = mapped.name;
          state.usedSlugs.push(mapped.slug);
          record(state, "products", result);
          const variantSlugs = new Set(state.variantSlugs[result.id] ?? []);
          const variants = await client.listAll("variants", { product_id: resource.id });
          for (const variantResource of variants) {
            // LS creates a hidden "Default" variant for single-variant products.
            try {
              const variant = mapVariant(variantResource, variantSlugs);
              const saved = await sink.upsertVariant(variant, result.id);
              state.idMap.variants[variantResource.id] = saved.id;
              state.idMap.variantProduct[variantResource.id] = resource.id;
              record(state, "variants", saved);
            } catch (error) {
              fail(state, "variants", variantResource.id, error);
            }
          }
          state.variantSlugs[result.id] = [...variantSlugs];
        } catch (error) {
          fail(state, "products", resource.id, error);
        }
      }
      if (hasMore) state.page += 1;
      else nextStage(state, options);
      break;
    }

    case "files": {
      const variantIds = Object.keys(state.idMap.variants);
      const slice = variantIds.slice(state.index, state.index + filesPerChunk);
      for (const lsVariantId of slice) {
        const variantId = state.idMap.variants[lsVariantId];
        try {
          const files = (await client.listAll("files", { variant_id: lsVariantId }))
            .map(mapFile)
            .sort((a, b) => a.sort - b.sort);
          const present = new Set(await sink.getVariantFileNames(variantId));
          const stored: StoredFileRef[] = [];
          for (const file of files) {
            if (present.has(displayName(file))) {
              bump(state, "files", "skipped");
              continue;
            }
            try {
              // The signed URL expires in 1h: fetch a fresh object, download once.
              const fresh = mapFile(await client.getFile(file.sourceId));
              if (!fresh.downloadUrl) throw new Error("No download URL");
              const response = await client.download(fresh.downloadUrl);
              const bytes = await response.arrayBuffer();
              stored.push(
                await sink.storeFile(
                  bytes,
                  displayName(fresh),
                  fresh.type,
                ),
              );
              bump(state, "files", "imported");
            } catch (error) {
              fail(state, "files", file.sourceId, error);
            }
          }
          if (stored.length) await sink.appendVariantFiles(variantId, stored);
        } catch (error) {
          fail(state, "files", lsVariantId, error);
        }
      }
      state.index += slice.length;
      if (state.index >= variantIds.length) nextStage(state, options);
      break;
    }

    case "customers": {
      const { data, hasMore } = await client.listPage("customers", storeFilter, state.page);
      const mapped = dedupeCustomers(
        data.flatMap((resource) => {
          const customer = mapCustomer(resource);
          if (!customer) {
            bump(state, "customers", "skipped");
            return [];
          }
          return [customer];
        }),
      );
      for (const customer of mapped) {
        try {
          const result = await sink.upsertCustomer(customer);
          state.idMap.customers[customer.sourceId] = result.id;
          record(state, "customers", result);
        } catch (error) {
          fail(state, "customers", customer.sourceId, error);
        }
      }
      if (hasMore) state.page += 1;
      else nextStage(state, options);
      break;
    }

    case "orders": {
      const { data, hasMore } = await client.listPage("orders", storeFilter, state.page);
      for (const resource of data) {
        const mapped = mapOrder(resource);
        if (!mapped) {
          bump(state, "orders", "skipped");
          continue;
        }
        try {
          const productId = mapped.productSourceId
            ? state.idMap.products[mapped.productSourceId]
            : undefined;
          if (!productId) throw new Error("Product was not imported");
          const variantId = mapped.variantSourceId
            ? state.idMap.variants[mapped.variantSourceId] ?? null
            : null;
          const result = await sink.upsertOrder(mapped, { productId, variantId });
          state.idMap.orders[resource.id] = result.id;
          record(state, "orders", result);
        } catch (error) {
          fail(state, "orders", resource.id, error);
        }
      }
      if (hasMore) state.page += 1;
      else nextStage(state, options);
      break;
    }

    case "licenses": {
      const { data, hasMore } = await client.listPage("license-keys", storeFilter, state.page, 25);
      for (const resource of data) {
        const mapped = mapLicense(resource);
        if (!mapped) {
          bump(state, "licenses", "skipped");
          continue;
        }
        try {
          const instances = (
            await client.listAll("license-key-instances", { license_key_id: resource.id })
          ).map(mapLicenseInstance);
          const productId = mapped.productSourceId
            ? state.idMap.products[mapped.productSourceId] ?? null
            : null;
          const result = await sink.upsertLicense(mapped, {
            orderId: mapped.orderSourceId ? state.idMap.orders[mapped.orderSourceId] ?? null : null,
            productId,
            productName: mapped.productSourceId
              ? state.idMap.productNames[mapped.productSourceId] ?? null
              : null,
            instances,
          });
          state.idMap.licenses[resource.id] = result.id;
          record(state, "licenses", result);
          bump(state, "instances", result.created ? "imported" : "skipped");
        } catch (error) {
          fail(state, "licenses", resource.id, error);
        }
      }
      if (hasMore) state.page += 1;
      else nextStage(state, options);
      break;
    }

    case "discounts": {
      const { data, hasMore } = await client.listPage("discounts", storeFilter, state.page);
      for (const resource of data) {
        const variantRefs = resource.relationships?.variants?.data;
        const scopedVariantIds = Array.isArray(variantRefs)
          ? variantRefs.map((ref) => String((ref as { id: unknown }).id))
          : [];
        const scopedProducts = [
          ...new Set(
            scopedVariantIds
              .map((id) => state.idMap.variantProduct[id])
              .filter(Boolean)
              .map((lsProductId) => state.idMap.products[lsProductId])
              .filter(Boolean),
          ),
        ];
        const mapped = mapDiscount(resource, scopedVariantIds);
        if (!mapped) {
          bump(state, "discounts", "skipped");
          continue;
        }
        try {
          // A product-limited discount whose scope we cannot resolve must not
          // silently become store-wide: import it inactive instead.
          const unresolved = mapped.limitedToProducts && scopedProducts.length === 0;
          const result = await sink.upsertDiscount(
            unresolved ? { ...mapped, active: false } : mapped,
            mapped.limitedToProducts ? scopedProducts : "all",
          );
          state.idMap.discounts[resource.id] = result.id;
          record(state, "discounts", result);
          if (unresolved && result.created) {
            state.errors.push({
              stage: "discounts",
              sourceId: resource.id,
              message: `${mapped.code}: product scope not available from Lemon Squeezy; imported inactive, review and enable`,
            });
          }
        } catch (error) {
          fail(state, "discounts", resource.id, error);
        }
      }
      if (hasMore) state.page += 1;
      else nextStage(state, options);
      break;
    }

    case "affiliates": {
      const { data, hasMore } = await client.listPage("affiliates", storeFilter, state.page);
      const codes = new Set([...(await sink.existingAffiliateCodes()), ...state.usedAffiliateCodes]);
      for (const resource of data) {
        const mapped = mapAffiliate(resource, codes);
        if (!mapped) {
          bump(state, "affiliates", "skipped");
          continue;
        }
        try {
          const result = await sink.upsertAffiliate(mapped);
          state.idMap.affiliates[resource.id] = result.id;
          state.usedAffiliateCodes.push(mapped.code);
          record(state, "affiliates", result);
        } catch (error) {
          fail(state, "affiliates", resource.id, error);
        }
      }
      if (hasMore) state.page += 1;
      else nextStage(state, options);
      break;
    }

    case "subscriptions": {
      const { data, hasMore } = await client.listPage("subscriptions", storeFilter, state.page);
      for (const resource of data) {
        const mapped = mapSubscription(resource);
        if (!mapped) {
          bump(state, "subscriptions", "skipped");
          continue;
        }
        try {
          const result = await sink.upsertSubscription(mapped, {
            productId: mapped.productSourceId ? state.idMap.products[mapped.productSourceId] ?? null : null,
            variantId: mapped.variantSourceId ? state.idMap.variants[mapped.variantSourceId] ?? null : null,
          });
          state.idMap.subscriptions[resource.id] = result.id;
          record(state, "subscriptions", result);
        } catch (error) {
          fail(state, "subscriptions", resource.id, error);
        }
      }
      if (hasMore) state.page += 1;
      else nextStage(state, options);
      break;
    }

    default:
      break;
  }

  return { state, done: state.stage === "done" };
}

export function displayName(file: MappedFile): string {
  return file.version ? withVersion(file) : file.name;
}

function withVersion(file: MappedFile): string {
  const dot = file.name.lastIndexOf(".");
  const base = dot > 0 ? file.name.slice(0, dot) : file.name;
  const ext = dot > 0 ? file.name.slice(dot) : "";
  return `${slugify(base, "file")}-v${file.version}${ext}`;
}

export function toIdMapCsv(state: ImportState, sourceLabel = "lemonsqueezy"): string {
  const rows = [["type", `${sourceLabel}_id`, "paymug_id"]];
  for (const [type, map] of Object.entries(state.idMap)) {
    if (type === "productNames" || type === "variantProduct") continue;
    for (const [from, to] of Object.entries(map)) rows.push([type, from, to]);
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function toFailuresCsv(errors: ImportErrorEntry[], sourceLabel = "lemonsqueezy"): string {
  const rows = [["stage", `${sourceLabel}_id`, "message"]];
  for (const e of errors) rows.push([e.stage, e.sourceId, e.message]);
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
