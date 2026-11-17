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
import type { PaddleClient } from "./client";
import {
  mapPaddleCustomer,
  mapPaddleDiscount,
  mapPaddlePrice,
  mapPaddleProduct,
  mapPaddleSubscription,
  mapPaddleTransaction,
} from "./mappers";

export const paddleStages = ["products", "customers", "orders", "discounts", "subscriptions"] as const;

function note(state: ImportState, stage: string, sourceId: string, message: string) {
  if (state.errors.length < 500) state.errors.push({ stage, sourceId, message: message.slice(0, 300) });
}

/** Advances the cursor, or moves to the next stage when exhausted. */
function advance(state: ImportState, options: ImportOptions, page: { hasMore: boolean; next?: string }) {
  if (page.hasMore && page.next) state.cursor = page.next;
  else nextStage(state, options);
}

/** One bounded unit of Paddle import work. Every write is an upsert. */
export async function runPaddleChunk(
  input: ImportState,
  options: ImportOptions,
  client: PaddleClient,
  sink: ImportSink,
): Promise<{ state: ImportState; done: boolean }> {
  const state: ImportState = structuredClone(input);
  if (state.stage !== "done" && !options.stages.includes(state.stage)) nextStage(state, options);

  switch (state.stage) {
    case "products": {
      const page = await client.listPage("/products", { status: "active,archived" }, state.cursor);
      const slugs = new Set([...(await sink.existingProductSlugs()), ...state.usedSlugs]);
      for (const resource of page.data) {
        try {
          const mapped = mapPaddleProduct(resource, slugs);
          const saved = await sink.upsertProduct(mapped);
          state.idMap.products[resource.id] = saved.id;
          state.idMap.productNames[resource.id] = mapped.name;
          state.usedSlugs.push(mapped.slug);
          record(state, "products", saved);
          const variantSlugs = new Set(state.variantSlugs[saved.id] ?? []);
          const prices = await client.listAll("/prices", { product_id: resource.id, status: "active,archived" });
          let overrides = 0;
          for (const [index, price] of prices.entries()) {
            try {
              const { variant, overrideCount } = mapPaddlePrice(price, variantSlugs, index);
              overrides += overrideCount;
              const result = await sink.upsertVariant(variant, saved.id);
              state.idMap.variants[variant.sourceId] = result.id;
              state.idMap.variantProduct[variant.sourceId] = resource.id;
              record(state, "variants", result);
            } catch (error) {
              fail(state, "variants", String(price.id), error);
            }
          }
          state.variantSlugs[saved.id] = [...variantSlugs];
          if (overrides) {
            note(state, "products", resource.id, `${mapped.name}: ${overrides} country price overrides not imported (base currency only).`);
          }
          if (prices.length === 0) note(state, "products", resource.id, `${mapped.name}: no prices found.`);
        } catch (error) {
          fail(state, "products", resource.id, error);
        }
      }
      advance(state, options, page);
      break;
    }

    case "customers": {
      const page = await client.listPage("/customers", {}, state.cursor);
      const mapped = dedupeCustomers(
        page.data.flatMap((resource) => {
          const customer = mapPaddleCustomer(resource);
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
      advance(state, options, page);
      break;
    }

    case "orders": {
      // index 0: transactions, index 1: refund adjustments.
      if (state.index === 0) {
        const page = await client.listPage("/transactions", { status: "completed,billed" }, state.cursor);
        const customers = await client.customersById(
          page.data.map((txn) => String(txn.customer_id ?? "")).filter(Boolean),
        );
        for (const resource of page.data) {
          const orders = mapPaddleTransaction(resource, customers.get(String(resource.customer_id)));
          if (orders.length === 0) {
            bump(state, "orders", "skipped");
            continue;
          }
          for (const mapped of orders) {
            try {
              const productId = mapped.productSourceId ? state.idMap.products[mapped.productSourceId] : undefined;
              if (!productId) throw new Error("Product was not imported");
              const variantId = mapped.variantSourceId ? state.idMap.variants[mapped.variantSourceId] ?? null : null;
              const result = await sink.upsertOrder(
                { ...mapped, productName: state.idMap.productNames[mapped.productSourceId ?? ""] ?? mapped.productName },
                { productId, variantId },
              );
              state.idMap.orders[mapped.sourceId] = result.id;
              record(state, "orders", result);
            } catch (error) {
              fail(state, "orders", mapped.sourceId, error);
            }
          }
        }
        if (page.hasMore && page.next) state.cursor = page.next;
        else {
          state.index = 1;
          state.cursor = undefined;
        }
      } else {
        const page = await client.listPage("/adjustments", { status: "approved", action: "refund" }, state.cursor);
        for (const adjustment of page.data) {
          try {
            const changed = (await sink.markOrdersRefunded?.(String(adjustment.transaction_id))) ?? 0;
            if (changed) bump(state, "refunds", "imported");
            else bump(state, "refunds", "skipped");
          } catch (error) {
            fail(state, "refunds", String(adjustment.id), error);
          }
        }
        advance(state, options, page);
      }
      break;
    }

    case "discounts": {
      const page = await client.listPage("/discounts", { status: "active,archived,expired,used" }, state.cursor);
      for (const resource of page.data) {
        const priceIds: string[] = Array.isArray(resource.restrict_to) ? resource.restrict_to.map(String) : [];
        const mapped = mapPaddleDiscount(resource, priceIds);
        if (!mapped) {
          bump(state, "discounts", "skipped");
          continue;
        }
        try {
          const scoped = [
            ...new Set(
              priceIds
                .map((id) => state.idMap.variantProduct[id])
                .filter(Boolean)
                .map((sourceProduct) => state.idMap.products[sourceProduct])
                .filter(Boolean),
            ),
          ];
          const unresolved = mapped.limitedToProducts && scoped.length === 0;
          const result = await sink.upsertDiscount(
            unresolved ? { ...mapped, active: false } : mapped,
            mapped.limitedToProducts ? scoped : "all",
          );
          state.idMap.discounts[resource.id] = result.id;
          record(state, "discounts", result);
          if (unresolved && result.created) {
            note(state, "discounts", resource.id, `${mapped.code}: product scope not resolved; imported inactive, review and enable`);
          }
          if (resource.recur === true && resource.maximum_recurring_intervals) {
            note(state, "discounts", resource.id, `${mapped.code}: recurring limit (${resource.maximum_recurring_intervals} intervals) is not carried over`);
          }
        } catch (error) {
          fail(state, "discounts", resource.id, error);
        }
      }
      advance(state, options, page);
      break;
    }

    case "subscriptions": {
      const page = await client.listPage("/subscriptions", {}, state.cursor);
      const customers = await client.customersById(
        page.data.map((sub) => String(sub.customer_id ?? "")).filter(Boolean),
      );
      for (const resource of page.data) {
        const customer = customers.get(String(resource.customer_id));
        const billing = ["active", "trialing", "past_due", "paused"].includes(String(resource.status));
        const method = billing && customer ? await client.primaryPaymentMethod(String(resource.customer_id)) : null;
        const mapped = mapPaddleSubscription(resource, customer, method);
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
      advance(state, options, page);
      break;
    }

    default:
      break;
  }
  return { state, done: state.stage === "done" };
}
