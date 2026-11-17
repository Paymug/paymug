import { ThrottledHttp, type ThrottledHttpOptions } from "../http";

export type PaddleResource = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface PaddleClientOptions {
  apiKey: string;
  mode: "test" | "live";
  fetchImpl?: typeof fetch;
  sleep?: ThrottledHttpOptions["sleep"];
  now?: ThrottledHttpOptions["now"];
  baseUrl?: string;
  /** Override the default throttle (tests only). */
  requestsPerMinute?: number;
}

/** Page sizes per Paddle docs: default 50, max 200; transactions max 30. */
export const paddlePageSize: Record<string, number> = { transactions: 30 };

interface PaddlePageBody {
  data?: PaddleResource[];
  meta?: { pagination?: { has_more?: boolean; next?: string } };
}

/** Extracts the `after` cursor from Paddle's `meta.pagination.next` URL. */
export function cursorFromNext(next: string | undefined): string | undefined {
  if (!next) return undefined;
  try {
    return new URL(next).searchParams.get("after") ?? undefined;
  } catch {
    return undefined;
  }
}

/** Paddle: cursor pagination, 240 req/min per IP, 60 s wait after a 429. */
export class PaddleClient {
  readonly http: ThrottledHttp;
  private readonly customerCache = new Map<string, PaddleResource>();
  private readonly paymentMethodCache = new Map<string, PaddleResource | null>();

  constructor(options: PaddleClientOptions) {
    this.http = new ThrottledHttp({
      label: "Paddle",
      baseUrl:
        options.baseUrl ??
        (options.mode === "live" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com"),
      headers: { Authorization: `Bearer ${options.apiKey}` },
      requestsPerMinute: options.requestsPerMinute ?? 200,
      rateLimitWaitMs: 60_000,
      fetchImpl: options.fetchImpl,
      sleep: options.sleep,
      now: options.now,
    });
  }

  async listPage(
    path: string,
    params: Record<string, string | number | undefined> = {},
    after?: string,
  ): Promise<{ data: PaddleResource[]; hasMore: boolean; next?: string }> {
    const kind = path.replace(/^\//, "");
    const body = await this.http.getJson<PaddlePageBody>(path, {
      per_page: paddlePageSize[kind] ?? 100,
      ...params,
      after,
    });
    const pagination = body.meta?.pagination;
    // `next` is always present; only `has_more` says whether there is more.
    const hasMore = pagination?.has_more === true;
    return { data: body.data ?? [], hasMore, next: hasMore ? cursorFromNext(pagination?.next) : undefined };
  }

  async listAll(path: string, params: Record<string, string | number | undefined> = {}) {
    const all: PaddleResource[] = [];
    let after: string | undefined;
    for (;;) {
      const page = await this.listPage(path, params, after);
      all.push(...page.data);
      if (!page.hasMore || !page.next) return all;
      after = page.next;
    }
  }

  async count(path: string, params: Record<string, string | number | undefined> = {}) {
    const body = await this.http.getJson<PaddlePageBody & { meta?: { pagination?: { estimated_total?: number } } }>(
      path,
      { ...params, per_page: 1 },
    );
    return (
      (body.meta?.pagination as { estimated_total?: number } | undefined)?.estimated_total ??
      body.data?.length ??
      0
    );
  }

  /** Customers by id, batched and cached for the life of the client. */
  async customersById(ids: string[]): Promise<Map<string, PaddleResource>> {
    const missing = [...new Set(ids)].filter((id) => !this.customerCache.has(id));
    for (let i = 0; i < missing.length; i += 50) {
      const batch = missing.slice(i, i + 50);
      const rows = await this.listAll("/customers", { id: batch.join(",") });
      for (const row of rows) this.customerCache.set(String(row.id), row);
    }
    return new Map(ids.flatMap((id) => (this.customerCache.has(id) ? [[id, this.customerCache.get(id)!] as const] : [])));
  }

  /** First saved card of a customer, for display and ID linking. */
  async primaryPaymentMethod(customerId: string): Promise<PaddleResource | null> {
    if (this.paymentMethodCache.has(customerId)) return this.paymentMethodCache.get(customerId) ?? null;
    let method: PaddleResource | null = null;
    try {
      const rows = await this.listAll(`/customers/${encodeURIComponent(customerId)}/payment-methods`);
      method = rows.find((row) => row.type === "card") ?? rows[0] ?? null;
    } catch {
      method = null;
    }
    this.paymentMethodCache.set(customerId, method);
    return method;
  }

  /** Cancels at the end of the paid period so nobody loses paid time. */
  async cancelSubscription(id: string): Promise<void> {
    await this.http.send("POST", `/subscriptions/${encodeURIComponent(id)}/cancel`, {
      effective_from: "next_billing_period",
    });
  }
}
