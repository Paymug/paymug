import {
  bump,
  fail,
  nextStage,
  record,
  type ImportOptions,
  type ImportSink,
  type ImportState,
} from "../../lemonsqueezy/import-engine";
import { dedupeCustomers } from "../../lemonsqueezy/mappers";
import type { PolarClient } from "./client";
import { polarPaths } from "./client";
import {
  mapPolarActivation,
  mapPolarCustomer,
  mapPolarDiscount,
  mapPolarLicense,
  mapPolarOrder,
  mapPolarProduct,
  mapPolarSubscription,
} from "./mappers";

export const polarStages = [
  "products",
  "customers",
  "orders",
  "licenses",
  "discounts",
  "subscriptions",
] as const;

function note(state: ImportState, stage: string, sourceId: string, message: string) {
  if (state.errors.length < 500) state.errors.push({ stage, sourceId, message: message.slice(0, 300) });
}

/** One bounded unit of Polar import work. Every write is an upsert. */
export async function runPolarChunk(
  input: ImportState,
  options: ImportOptions,
  client: PolarClient,
  sink: ImportSink,
): Promise<{ state: ImportState; done: boolean }> {
  const state: ImportState = structuredClone(input);
  if (state.stage !== "done" && !options.stages.includes(state.stage)) nextStage(state, options);
  const org = { organization_id: options.lsStoreId };
  state.extra ??= {};
  state.extra.benefitProduct ??= {};

  switch (state.stage) {
    case "products": {
      const { data, hasMore } = await client.listPage(polarPaths.products, org, state.page, 10);
      const slugs = new Set([...(await sink.existingProductSlugs()), ...state.usedSlugs]);
      for (const resource of data) {
        try {
          const mapped = mapPolarProduct(resource, slugs);
          const saved = await sink.upsertProduct(mapped.product);
          state.idMap.products[resource.id] = saved.id;
          state.idMap.productNames[resource.id] = mapped.product.name;
          state.usedSlugs.push(mapped.product.slug);
          record(state, "products", saved);
          for (const benefitId of mapped.benefitIds) state.extra.benefitProduct[benefitId] = resource.id;
          for (const n of mapped.notes) note(state, "products", n.sourceId, n.message);
          for (const variant of mapped.variants) {
            try {
              const result = await sink.upsertVariant(variant, saved.id);
              state.idMap.variants[variant.sourceId] = result.id;
              state.idMap.variantProduct[variant.sourceId] = resource.id;
              record(state, "variants", result);
            } catch (error) {
              fail(state, "variants", variant.sourceId, error);
            }
          }
        } catch (error) {
          fail(state, "products", resource.id, error);
        }
      }
      if (hasMore) state.page += 1;
      else nextStage(state, options);
      break;
    }

    case "customers": {
      const { data, hasMore } = await client.listPage(polarPaths.customers, org, state.page);
      const mapped = dedupeCustomers(
        data.flatMap((resource) => {
          const customer = mapPolarCustomer(resource);
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
      const { data, hasMore } = await client.listPage(polarPaths.orders, org, state.page);
      for (const resource of data) {
        const mapped = mapPolarOrder(resource);
        if (!mapped) {
          bump(state, "orders", "skipped");
          continue;
        }
        try {
          const productId = mapped.productSourceId ? state.idMap.products[mapped.productSourceId] : undefined;
          if (!productId) throw new Error("Product was not imported");
          const variantId = mapped.variantSourceId ? state.idMap.variants[mapped.variantSourceId] ?? null : null;
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
      const { data, hasMore } = await client.listPage(polarPaths.licenseKeys, org, state.page, 25);
      for (const resource of data) {
        const mapped = mapPolarLicense(resource, state.extra.benefitProduct);
        if (!mapped) {
          bump(state, "licenses", "skipped");
          continue;
        }
        try {
          const detail = await client.getLicenseKey(resource.id);
          const instances = (Array.isArray(detail.activations) ? detail.activations : []).map(mapPolarActivation);
          const result = await sink.upsertLicense(mapped, {
            orderId: null,
            productId: mapped.productSourceId ? state.idMap.products[mapped.productSourceId] ?? null : null,
            productName: mapped.productSourceId ? state.idMap.productNames[mapped.productSourceId] ?? null : null,
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
      const { data, hasMore } = await client.listPage(polarPaths.discounts, org, state.page);
      for (const resource of data) {
        const sourceProducts: string[] = (Array.isArray(resource.products) ? resource.products : []).map(
          (product: { id: unknown }) => String(product.id),
        );
        const mapped = mapPolarDiscount(resource, sourceProducts);
        if (!mapped) {
          bump(state, "discounts", "skipped");
          continue;
        }
        try {
          const scoped = sourceProducts.map((id) => state.idMap.products[id]).filter(Boolean);
          const unresolved = mapped.limitedToProducts && scoped.length === 0;
          const result = await sink.upsertDiscount(
            unresolved ? { ...mapped, active: false } : mapped,
            mapped.limitedToProducts ? scoped : "all",
          );
          state.idMap.discounts[resource.id] = result.id;
          record(state, "discounts", result);
          if (unresolved && result.created) {
            note(state, "discounts", resource.id, `${mapped.code}: products not imported; imported inactive, review and enable`);
          }
        } catch (error) {
          fail(state, "discounts", resource.id, error);
        }
      }
      if (hasMore) state.page += 1;
      else nextStage(state, options);
      break;
    }

    case "subscriptions": {
      const { data, hasMore } = await client.listPage(polarPaths.subscriptions, org, state.page);
      for (const resource of data) {
        const mapped = mapPolarSubscription(resource);
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
