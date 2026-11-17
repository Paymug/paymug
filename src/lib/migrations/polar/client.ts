import { ThrottledHttp, type ThrottledHttpOptions } from "../http";

export type PolarResource = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const bases = {
  live: "https://api.polar.sh/v1",
  sandbox: "https://sandbox-api.polar.sh/v1",
} as const;

export interface PolarClientOptions {
  token: string;
  mode: "test" | "live";
  fetchImpl?: typeof fetch;
  sleep?: ThrottledHttpOptions["sleep"];
  now?: ThrottledHttpOptions["now"];
  baseUrl?: string;
  /** Override the default throttle (tests only). */
  requestsPerMinute?: number;
}

/** Polar: page/limit pagination, 500 req/min live, 100 req/min sandbox. */
export class PolarClient {
  readonly http: ThrottledHttp;

  constructor(private readonly options: PolarClientOptions) {
    // Stay under the published limits: 500 live, 100 sandbox.
    const rpm = options.mode === "live" ? 400 : 80;
    this.http = new ThrottledHttp({
      label: "Polar",
      baseUrl: options.baseUrl ?? (options.mode === "live" ? bases.live : bases.sandbox),
      headers: { Authorization: `Bearer ${options.token}` },
      requestsPerMinute: options.requestsPerMinute ?? rpm,
      fetchImpl: options.fetchImpl,
      sleep: options.sleep,
      now: options.now,
    });
  }

  async listPage(
    path: string,
    params: Record<string, string | number | undefined>,
    page = 1,
    limit = 100,
  ): Promise<{ data: PolarResource[]; hasMore: boolean }> {
    const body = await this.http.getJson<{
      items?: PolarResource[];
      pagination?: { max_page?: number };
    }>(path, { ...params, page, limit });
    const maxPage = body.pagination?.max_page ?? page;
    return { data: body.items ?? [], hasMore: page < maxPage };
  }

  async listAll(path: string, params: Record<string, string | number | undefined> = {}) {
    const all: PolarResource[] = [];
    for (let page = 1; ; page += 1) {
      const result = await this.listPage(path, params, page);
      all.push(...result.data);
      if (!result.hasMore) return all;
    }
  }

  async count(path: string, params: Record<string, string | number | undefined> = {}) {
    const body = await this.http.getJson<{ pagination?: { total_count?: number } }>(path, {
      ...params,
      page: 1,
      limit: 1,
    });
    return body.pagination?.total_count ?? 0;
  }

  getLicenseKey(id: string): Promise<PolarResource> {
    return this.http.getJson<PolarResource>(`/license-keys/${encodeURIComponent(id)}`);
  }

  /** Ends the subscription at period end so the customer keeps paid time. */
  async cancelSubscription(id: string): Promise<void> {
    await this.http.send("PATCH", `/subscriptions/${encodeURIComponent(id)}`, {
      cancel_at_period_end: true,
    });
  }
}

export const polarPaths = {
  organizations: "/organizations/",
  products: "/products/",
  customers: "/customers/",
  orders: "/orders/",
  licenseKeys: "/license-keys/",
  discounts: "/discounts/",
  subscriptions: "/subscriptions/",
} as const;
