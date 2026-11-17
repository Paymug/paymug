import {
  bump,
  fail,
  nextStage,
  record,
  type ImportOptions,
  type ImportSink,
  type ImportState,
  type StoredFileRef,
} from "../../lemonsqueezy/import-engine";
import { dedupeCustomers } from "../../lemonsqueezy/mappers";
import type { DodoClient } from "./client";
import {
  mapDodoCustomer,
  mapDodoDiscount,
  mapDodoInstance,
  mapDodoLicense,
  mapDodoPayment,
  mapDodoProduct,
  mapDodoSubscription,
} from "./mappers";


export const dodoStages = [
  "products",
  "files",
  "customers",
  "orders",
  "licenses",
  "discounts",
  "subscriptions",
] as const;

const filesPerChunk = 2;

function note(state: ImportState, stage: string, sourceId: string, message: string) {
  if (state.errors.length < 500) state.errors.push({ stage, sourceId, message: message.slice(0, 300) });
}

/** One bounded unit of Dodo Payments import work. Every write is an upsert. */
export async function runDodoChunk(
  input: ImportState,
  options: ImportOptions,
  client: DodoClient,
  sink: ImportSink,
): Promise<{ state: ImportState; done: boolean }> {
  const state: ImportState = structuredClone(input);
  if (state.stage !== "done" && !options.stages.includes(state.stage)) nextStage(state, options);
  // Dodo pages are zero-based; the shared state counts from 1.
  const pageNumber = state.page - 1;

  switch (state.stage) {
    case "products": {
      const { data, hasMore } = await client.listPage("/products", {}, pageNumber, 25);
      const slugs = new Set([...(await sink.existingProductSlugs()), ...state.usedSlugs]);
      for (const resource of data) {
        const sourceId = String(resource.product_id);
        try {
          const mapped = mapDodoProduct(resource, slugs);
          for (const message of mapped.notes) note(state, "products", sourceId, message);
          if (!mapped.product || !mapped.variant) {
            bump(state, "products", "skipped");
            continue;
          }
          const saved = await sink.upsertProduct(mapped.product);
          state.idMap.products[sourceId] = saved.id;
          state.idMap.productNames[sourceId] = mapped.product.name;
          state.usedSlugs.push(mapped.product.slug);
          record(state, "products", saved);
          const variant = await sink.upsertVariant(mapped.variant, saved.id);
          state.idMap.variants[sourceId] = variant.id;
          state.idMap.variantProduct[sourceId] = sourceId;
          record(state, "variants", variant);
        } catch (error) {
          fail(state, "products", sourceId, error);
        }
      }
      if (hasMore) state.page += 1;
      else nextStage(state, options);
      break;
    }

    case "files": {
      const ids = Object.keys(state.idMap.variants);
      const slice = ids.slice(state.index, state.index + filesPerChunk);
      for (const sourceId of slice) {
        const variantId = state.idMap.variants[sourceId];
        try {
          // Presigned URLs expire: always read a fresh product object.
          const fresh = await client.getProduct(sourceId);
          const files = (Array.isArray(fresh.entitlements) ? fresh.entitlements : [])
            .filter((e: { integration_type?: string }) => e.integration_type === "digital_files")
            .flatMap(
              (e: { integration_config?: { digital_files?: { files?: unknown[] } } }) =>
                (e.integration_config?.digital_files?.files ?? []) as Array<Record<string, any>>, // eslint-disable-line @typescript-eslint/no-explicit-any
            );
          const present = new Set(await sink.getVariantFileNames(variantId));
          const stored: StoredFileRef[] = [];
          for (const file of files) {
            const name = String(file.filename || `file-${file.file_id}`);
            if (present.has(name)) {
              bump(state, "files", "skipped");
              continue;
            }
            try {
              if (!file.download_url) throw new Error("No download URL");
              const response = await client.http.download(String(file.download_url));
              stored.push(
                await sink.storeFile(
                  await response.arrayBuffer(),
                  name,
                  String(file.content_type || "application/octet-stream"),
                ),
              );
              bump(state, "files", "imported");
            } catch (error) {
              fail(state, "files", String(file.file_id), error);
            }
          }
          if (stored.length) await sink.appendVariantFiles(variantId, stored);
        } catch (error) {
          fail(state, "files", sourceId, error);
        }
      }
      state.index += slice.length;
      if (state.index >= ids.length) nextStage(state, options);
      break;
    }

    case "customers": {
      const { data, hasMore } = await client.listPage("/customers", {}, pageNumber);
      const mapped = dedupeCustomers(
        data.flatMap((resource) => {
          const customer = mapDodoCustomer(resource);
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
      const { data, hasMore } = await client.listPage("/payments", { status: "succeeded" }, pageNumber, 25);
      for (const resource of data) {
        const sourceId = String(resource.payment_id);
        try {
          const detail = await client.getPayment(sourceId).catch(() => null);
          const mapped = mapDodoPayment(resource, detail);
          if (!mapped) {
            bump(state, "orders", "skipped");
            continue;
          }
          const productId = mapped.productSourceId ? state.idMap.products[mapped.productSourceId] : undefined;
          if (!productId) throw new Error("Product was not imported");
          const variantId = mapped.variantSourceId ? state.idMap.variants[mapped.variantSourceId] ?? null : null;
          const result = await sink.upsertOrder(
            { ...mapped, productName: state.idMap.productNames[mapped.productSourceId ?? ""] ?? mapped.productName },
            { productId, variantId },
          );
          state.idMap.orders[sourceId] = result.id;
          record(state, "orders", result);
        } catch (error) {
          fail(state, "orders", sourceId, error);
        }
      }
      if (hasMore) state.page += 1;
      else nextStage(state, options);
      break;
    }

    case "licenses": {
      const { data, hasMore } = await client.listPage("/license_keys", {}, pageNumber, 25);
      for (const resource of data) {
        try {
          const customer = resource.customer_id ? await client.getCustomer(String(resource.customer_id)) : null;
          const mapped = mapDodoLicense(resource, customer);
          if (!mapped) {
            bump(state, "licenses", "skipped");
            continue;
          }
          const instances = (
            await client.listAll("/license_key_instances", { license_key_id: String(resource.id) })
          ).map(mapDodoInstance);
          const result = await sink.upsertLicense(mapped, {
            orderId: mapped.orderSourceId ? state.idMap.orders[mapped.orderSourceId] ?? null : null,
            productId: mapped.productSourceId ? state.idMap.products[mapped.productSourceId] ?? null : null,
            productName: mapped.productSourceId ? state.idMap.productNames[mapped.productSourceId] ?? null : null,
            instances,
          });
          state.idMap.licenses[resource.id] = result.id;
          record(state, "licenses", result);
          bump(state, "instances", result.created ? "imported" : "skipped");
        } catch (error) {
          fail(state, "licenses", String(resource.id), error);
        }
      }
      if (hasMore) state.page += 1;
      else nextStage(state, options);
      break;
    }

    case "discounts": {
      const { data, hasMore } = await client.listPage("/discounts", {}, pageNumber);
      for (const resource of data) {
        const sourceId = String(resource.discount_id);
        const mapped = mapDodoDiscount(resource);
        if (!mapped) {
          bump(state, "discounts", "skipped");
          continue;
        }
        try {
          const scoped = mapped.productSourceIds.map((id) => state.idMap.products[id]).filter(Boolean);
          const unresolved = mapped.limitedToProducts && scoped.length === 0;
          const result = await sink.upsertDiscount(
            unresolved ? { ...mapped, active: false } : mapped,
            mapped.limitedToProducts ? scoped : "all",
          );
          state.idMap.discounts[sourceId] = result.id;
          record(state, "discounts", result);
          if (unresolved && result.created) {
            note(state, "discounts", sourceId, `${mapped.code}: product scope not resolved; imported inactive, review and enable`);
          }
        } catch (error) {
          fail(state, "discounts", sourceId, error);
        }
      }
      if (hasMore) state.page += 1;
      else nextStage(state, options);
      break;
    }

    case "subscriptions": {
      const { data, hasMore } = await client.listPage("/subscriptions", {}, pageNumber);
      for (const resource of data) {
        const sourceId = String(resource.subscription_id);
        const mapped = mapDodoSubscription(resource);
        if (!mapped) {
          bump(state, "subscriptions", "skipped");
          continue;
        }
        try {
          const result = await sink.upsertSubscription(mapped, {
            productId: mapped.productSourceId ? state.idMap.products[mapped.productSourceId] ?? null : null,
            variantId: mapped.variantSourceId ? state.idMap.variants[mapped.variantSourceId] ?? null : null,
          });
          state.idMap.subscriptions[sourceId] = result.id;
          record(state, "subscriptions", result);
        } catch (error) {
          fail(state, "subscriptions", sourceId, error);
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
