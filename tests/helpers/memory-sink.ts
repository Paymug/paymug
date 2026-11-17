import type { ImportSink, ImportState, UpsertResult } from "../../src/lib/lemonsqueezy/import-engine";

export type Row = Record<string, unknown>;

/** In-memory sink; upsert keyed on source id like the real one. */
export function memorySink() {
  const t: Record<string, Map<string, Row & { id: string }>> = {};
  let n = 0;
  const up = (table: string, key: string, row: Row): UpsertResult => {
    const m = (t[table] ??= new Map());
    const hit = m.get(key);
    if (hit) return { id: hit.id, created: false };
    const id = `${table}-${++n}`;
    m.set(key, { ...row, id });
    return { id, created: true };
  };
  const files = new Map<string, string[]>();
  const sink: ImportSink = {
    async upsertProduct(i) { return up("products", i.sourceId, i as unknown as Row); },
    async upsertVariant(i, productId) { return up("variants", i.sourceId, { ...i, productId }); },
    async getVariantFileNames(v) { return files.get(v) ?? []; },
    async storeFile(_b, name, type) { return { id: name, name, size: 1, type, storageKey: `k/${name}` }; },
    async appendVariantFiles(v, f) { files.set(v, [...(files.get(v) ?? []), ...f.map((x) => x.name)]); },
    async upsertCustomer(i) { return up("customers", i.email, i as unknown as Row); },
    async upsertOrder(i, refs) { return up("orders", i.sourceId, { ...i, ...refs }); },
    async upsertLicense(i, refs) { return up("licenses", i.sourceId, { ...i, ...refs }); },
    async upsertDiscount(i, scope) { return up("discounts", i.sourceId, { ...i, scope }); },
    async upsertAffiliate(i) { return up("affiliates", i.sourceId, i as unknown as Row); },
    async upsertSubscription(i, refs) { return up("subscriptions", i.sourceId, { ...i, ...refs }); },
    async existingProductSlugs() { return new Set([...(t.products?.values() ?? [])].map((p) => String(p.slug))); },
    async existingAffiliateCodes() { return new Set(); },
    async markOrdersRefunded(sourceId) {
      let changed = 0;
      for (const [key, row] of t.orders ?? []) {
        if ((key === sourceId || key.startsWith(`${sourceId}:`)) && row.status === "paid") {
          row.status = "refunded";
          changed += 1;
        }
      }
      return changed;
    },
  };
  return { sink, t, files };
}

export async function runAll<C>(
  runChunk: (state: any, options: any, client: C, sink: ImportSink) => Promise<{ state: any; done: boolean }>, // eslint-disable-line @typescript-eslint/no-explicit-any
  state: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  options: unknown,
  client: C,
  sink: ImportSink,
): Promise<ImportState> {
  let current = state;
  for (let guard = 0; guard < 500; guard += 1) {
    const result = await runChunk(current, options, client, sink);
    current = result.state;
    if (result.done) return current;
  }
  throw new Error("did not terminate");
}
