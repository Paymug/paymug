import { ThrottledHttp, type ThrottledHttpOptions } from "../http";

export type DodoResource = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** `dodo_test_…` keys use the test host, everything else live. */
export function dodoModeFromKey(apiKey: string, fallback: "test" | "live" = "live"): "test" | "live" {
  if (apiKey.startsWith("dodo_test_")) return "test";
  if (apiKey.startsWith("dodo_live_")) return "live";
  return fallback;
}

export interface DodoClientOptions {
  apiKey: string;
  mode?: "test" | "live";
  fetchImpl?: typeof fetch;
  sleep?: ThrottledHttpOptions["sleep"];
  now?: ThrottledHttpOptions["now"];
  baseUrl?: string;
  /** Override the default throttle (tests only). */
  requestsPerMinute?: number;
}

/** Dodo Payments: page_number (0-based) + page_size (max 100), 240 req/min sustained. */
export class DodoClient {
  readonly http: ThrottledHttp;
  readonly mode: "test" | "live";
  private readonly customerCache = new Map<string, DodoResource | null>();

  constructor(options: DodoClientOptions) {
    this.mode = dodoModeFromKey(options.apiKey, options.mode);
    this.http = new ThrottledHttp({
      label: "Dodo Payments",
      baseUrl:
        options.baseUrl ??
        (this.mode === "test" ? "https://test.dodopayments.com" : "https://live.dodopayments.com"),
      headers: { Authorization: `Bearer ${options.apiKey}` },
      requestsPerMinute: options.requestsPerMinute ?? 200,
      fetchImpl: options.fetchImpl,
      sleep: options.sleep,
      now: options.now,
    });
  }

  /** `page` is zero-based, as in the Dodo API. */
  async listPage(
    path: string,
    params: Record<string, string | number | undefined> = {},
    page = 0,
    pageSize = 100,
  ): Promise<{ data: DodoResource[]; hasMore: boolean }> {
    const body = await this.http.getJson<{ items?: DodoResource[] }>(path, {
      ...params,
      page_size: pageSize,
      page_number: page,
    });
    const data = body.items ?? [];
    return { data, hasMore: data.length >= pageSize };
  }

  async listAll(path: string, params: Record<string, string | number | undefined> = {}) {
    const all: DodoResource[] = [];
    for (let page = 0; ; page += 1) {
      const result = await this.listPage(path, params, page);
      all.push(...result.data);
      if (!result.hasMore) return all;
    }
  }

  /** Counts by paging at the max size; Dodo returns no totals. */
  async count(path: string, params: Record<string, string | number | undefined> = {}) {
    let total = 0;
    for (let page = 0; ; page += 1) {
      const result = await this.listPage(path, params, page);
      total += result.data.length;
      if (!result.hasMore) return total;
    }
  }

  getProduct(id: string): Promise<DodoResource> {
    return this.http.getJson<DodoResource>(`/products/${encodeURIComponent(id)}`);
  }

  getPayment(id: string): Promise<DodoResource> {
    return this.http.getJson<DodoResource>(`/payments/${encodeURIComponent(id)}`);
  }

  async getCustomer(id: string): Promise<DodoResource | null> {
    if (this.customerCache.has(id)) return this.customerCache.get(id) ?? null;
    let customer: DodoResource | null = null;
    try {
      customer = await this.http.getJson<DodoResource>(`/customers/${encodeURIComponent(id)}`);
    } catch {
      customer = null;
    }
    this.customerCache.set(id, customer);
    return customer;
  }

  /** Cancels at the next billing date. Needs Write permission on subscriptions. */
  async cancelSubscription(id: string): Promise<void> {
    await this.http.send("PATCH", `/subscriptions/${encodeURIComponent(id)}`, {
      cancel_at_next_billing_date: true,
    });
  }
}
