import "server-only";

import { LemonSqueezyClient } from "../lemonsqueezy/client";
import {
  runImportChunk,
  type ImportOptions,
  type ImportSink,
  type ImportState,
} from "../lemonsqueezy/import-engine";
import { mapProduct } from "../lemonsqueezy/mappers";
import { runDodoChunk } from "./dodo/engine";
import { DodoClient, dodoModeFromKey } from "./dodo/client";
import { runPaddleChunk } from "./paddle/engine";
import { PaddleClient } from "./paddle/client";
import { runPolarChunk } from "./polar/engine";
import { PolarClient, polarPaths } from "./polar/client";
import { slugify } from "../lemonsqueezy/mappers";
import type { MigrationSourceId } from "./sources";

export interface StoreOption {
  id: string;
  name: string;
  currency: string;
  url: string;
}

export interface PreviewData {
  counts: Record<string, number>;
  products: Array<{ sourceId: string; slug: string }>;
  discountCodes: string[];
}

export interface SourceAdapter {
  listStores(secret: string, mode: "test" | "live"): Promise<StoreOption[]>;
  preview(secret: string, mode: "test" | "live", storeId: string): Promise<PreviewData>;
  runChunk(
    state: ImportState,
    options: ImportOptions & { mode?: "test" | "live" },
    secret: string,
    sink: ImportSink,
  ): Promise<{ state: ImportState; done: boolean }>;
  /** Test/live as the seller picked it, corrected by the key where it shows. */
  resolveMode(secret: string, mode: "test" | "live"): "test" | "live";
}

const lemonsqueezy: SourceAdapter = {
  resolveMode: (_secret, mode) => mode,
  async listStores(secret) {
    const stores = await new LemonSqueezyClient({ apiKey: secret }).listAll("stores");
    return stores.map((store) => ({
      id: store.id,
      name: String(store.attributes.name ?? store.id),
      currency: String(store.attributes.currency ?? ""),
      url: String(store.attributes.url ?? ""),
    }));
  },
  async preview(secret, _mode, storeId) {
    const client = new LemonSqueezyClient({ apiKey: secret });
    const filter = { store_id: storeId };
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
    const lsDiscounts = discounts ? await client.listAll("discounts", filter) : [];
    return {
      counts: { products: productsList.length, customers, orders, licenses, discounts, affiliates, subscriptions },
      products: productsList.map((resource) => ({
        sourceId: resource.id,
        slug: mapProduct(resource, new Set()).slug,
      })),
      discountCodes: lsDiscounts.map((resource) => String(resource.attributes.code ?? "")),
    };
  },
  runChunk: (state, options, secret, sink) =>
    runImportChunk(state, options, new LemonSqueezyClient({ apiKey: secret }), sink),
};

const polar: SourceAdapter = {
  resolveMode: (_secret, mode) => mode,
  async listStores(secret, mode) {
    const client = new PolarClient({ token: secret, mode });
    const orgs = await client.listAll(polarPaths.organizations);
    return orgs.map((org) => ({
      id: String(org.id),
      name: String(org.name ?? org.slug ?? org.id),
      currency: String(org.default_presentment_currency ?? "").toUpperCase(),
      url: String(org.website ?? ""),
    }));
  },
  async preview(secret, mode, storeId) {
    const client = new PolarClient({ token: secret, mode });
    const org = { organization_id: storeId };
    const [productsList, customers, orders, licenses, discounts, subscriptions] = await Promise.all([
      client.listAll(polarPaths.products, org),
      client.count(polarPaths.customers, org),
      client.count(polarPaths.orders, org),
      client.count(polarPaths.licenseKeys, org),
      client.count(polarPaths.discounts, org),
      client.count(polarPaths.subscriptions, org),
    ]);
    const discountRows = discounts ? await client.listAll(polarPaths.discounts, org) : [];
    return {
      counts: { products: productsList.length, customers, orders, licenses, discounts, subscriptions },
      products: productsList.map((p) => ({ sourceId: String(p.id), slug: slugify(String(p.name ?? ""), "product") })),
      discountCodes: discountRows.map((row) => String(row.code ?? "")),
    };
  },
  runChunk: (state, options, secret, sink) =>
    runPolarChunk(state, options, new PolarClient({ token: secret, mode: options.mode ?? "live" }), sink),
};

const paddle: SourceAdapter = {
  resolveMode: (_secret, mode) => mode,
  async listStores(secret, mode) {
    // Validates the key with a list call; Paddle accounts have one catalog.
    await new PaddleClient({ apiKey: secret, mode }).listPage("/products", { per_page: 1 });
    return [{ id: "default", name: mode === "test" ? "Paddle sandbox" : "Paddle account", currency: "", url: "" }];
  },
  async preview(secret, mode) {
    const client = new PaddleClient({ apiKey: secret, mode });
    const [productsList, customers, orders, discounts, subscriptions] = await Promise.all([
      client.listAll("/products", { status: "active,archived" }),
      client.count("/customers"),
      client.count("/transactions", { status: "completed,billed" }),
      client.count("/discounts"),
      client.count("/subscriptions"),
    ]);
    const discountRows = discounts ? await client.listAll("/discounts") : [];
    return {
      counts: { products: productsList.length, customers, orders, discounts, subscriptions },
      products: productsList.map((p) => ({ sourceId: String(p.id), slug: slugify(String(p.name ?? ""), "product") })),
      discountCodes: discountRows.map((row) => String(row.code ?? "")),
    };
  },
  runChunk: (state, options, secret, sink) =>
    runPaddleChunk(state, options, new PaddleClient({ apiKey: secret, mode: options.mode ?? "live" }), sink),
};

const dodo: SourceAdapter = {
  resolveMode: (secret, mode) => dodoModeFromKey(secret, mode),
  async listStores(secret, mode) {
    const client = new DodoClient({ apiKey: secret, mode });
    await client.listPage("/products", {}, 0, 1);
    return [{ id: "default", name: `Dodo Payments (${client.mode})`, currency: "", url: "" }];
  },
  async preview(secret, mode) {
    const client = new DodoClient({ apiKey: secret, mode });
    const [productsList, customers, orders, licenses, discounts, subscriptions] = await Promise.all([
      client.listAll("/products"),
      client.count("/customers"),
      client.count("/payments", { status: "succeeded" }),
      client.count("/license_keys"),
      client.count("/discounts"),
      client.count("/subscriptions"),
    ]);
    const discountRows = discounts ? await client.listAll("/discounts") : [];
    return {
      counts: { products: productsList.length, customers, orders, licenses, discounts, subscriptions },
      products: productsList.map((p) => ({ sourceId: String(p.product_id), slug: slugify(String(p.name ?? ""), "product") })),
      discountCodes: discountRows.map((row) => String(row.code ?? "")),
    };
  },
  runChunk: (state, options, secret, sink) =>
    runDodoChunk(state, options, new DodoClient({ apiKey: secret, mode: options.mode }), sink),
};

export const sourceAdapters: Record<MigrationSourceId, SourceAdapter> = {
  lemonsqueezy,
  polar,
  paddle,
  dodo,
};
