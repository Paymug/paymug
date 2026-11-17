import type { LsPage, LsResource, LsResourceKind } from "./types";

/** Overridable for tests against a mock API; production uses the real one. */
const apiBase = (
  (typeof process !== "undefined" && process.env?.LEMONSQUEEZY_API_BASE) ||
  "https://api.lemonsqueezy.com/v1"
).replace(/\/$/, "");

export class LemonSqueezyApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "LemonSqueezyApiError";
  }
}

export interface LemonSqueezyClientOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  /** Max requests per minute. Lemon Squeezy allows 300; stay below it. */
  requestsPerMinute?: number;
  maxRetries?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

/** Token bucket: refills continuously, waits when empty. */
export class TokenBucket {
  private tokens: number;
  private last: number;
  constructor(
    private readonly capacity: number,
    private readonly refillPerMs: number,
    private readonly now: () => number,
    private readonly sleep: (ms: number) => Promise<void>,
  ) {
    this.tokens = capacity;
    this.last = now();
  }

  async take(): Promise<void> {
    for (;;) {
      const current = this.now();
      this.tokens = Math.min(
        this.capacity,
        this.tokens + (current - this.last) * this.refillPerMs,
      );
      this.last = current;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      await this.sleep(Math.ceil((1 - this.tokens) / this.refillPerMs));
    }
  }
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export class LemonSqueezyClient {
  private readonly fetchImpl: typeof fetch;
  private readonly bucket: TokenBucket;
  private readonly maxRetries: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly options: LemonSqueezyClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleep ?? defaultSleep;
    const perMinute = options.requestsPerMinute ?? 250;
    this.bucket = new TokenBucket(
      Math.min(perMinute, 20),
      perMinute / 60_000,
      options.now ?? Date.now,
      this.sleep,
    );
    this.maxRetries = options.maxRetries ?? 4;
  }

  private async request(url: string): Promise<Response> {
    let attempt = 0;
    for (;;) {
      await this.bucket.take();
      let response: Response | undefined;
      try {
        response = await this.fetchImpl(url, {
          headers: {
            Accept: "application/vnd.api+json",
            Authorization: `Bearer ${this.options.apiKey}`,
          },
        });
      } catch (error) {
        if (attempt >= this.maxRetries) throw error;
      }
      if (response && response.status !== 429 && response.status < 500) {
        return response;
      }
      if (attempt >= this.maxRetries) {
        throw new LemonSqueezyApiError(
          `Lemon Squeezy request failed (${response?.status ?? "network"})`,
          response?.status ?? 0,
        );
      }
      const retryAfter = Number(response?.headers.get("retry-after"));
      await this.sleep(
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : Math.min(30_000, 500 * 2 ** attempt),
      );
      attempt += 1;
    }
  }

  buildUrl(
    kind: LsResourceKind,
    filters: Record<string, string | undefined> = {},
    page = 1,
    pageSize = 100,
  ): string {
    const url = new URL(`${apiBase}/${kind}`);
    for (const [key, value] of Object.entries(filters)) {
      if (value) url.searchParams.set(`filter[${key}]`, value);
    }
    url.searchParams.set("page[size]", String(pageSize));
    url.searchParams.set("page[number]", String(page));
    return url.toString();
  }

  /** One page of a collection. Follow `hasMore` to continue. */
  async listPage(
    kind: LsResourceKind,
    filters: Record<string, string | undefined> = {},
    page = 1,
    pageSize = 100,
  ): Promise<{ data: LsResource[]; hasMore: boolean }> {
    const response = await this.request(this.buildUrl(kind, filters, page, pageSize));
    if (response.status === 401 || response.status === 403) {
      throw new LemonSqueezyApiError("Lemon Squeezy rejected the API key", response.status);
    }
    if (!response.ok) {
      throw new LemonSqueezyApiError(
        `Lemon Squeezy returned ${response.status}`,
        response.status,
      );
    }
    const body = (await response.json()) as LsPage;
    return { data: body.data ?? [], hasMore: Boolean(body.links?.next) };
  }

  /** Every item of a collection, following pagination. */
  async listAll(
    kind: LsResourceKind,
    filters: Record<string, string | undefined> = {},
  ): Promise<LsResource[]> {
    const all: LsResource[] = [];
    for (let page = 1; ; page += 1) {
      const result = await this.listPage(kind, filters, page);
      all.push(...result.data);
      if (!result.hasMore) return all;
    }
  }

  /** Counts without paging through everything: reads `meta.page.total`. */
  async count(
    kind: LsResourceKind,
    filters: Record<string, string | undefined> = {},
  ): Promise<number> {
    const response = await this.request(this.buildUrl(kind, filters, 1, 1));
    if (!response.ok) {
      throw new LemonSqueezyApiError(
        `Lemon Squeezy returned ${response.status}`,
        response.status,
      );
    }
    const body = (await response.json()) as {
      meta?: { page?: { total?: number } };
      data?: unknown[];
    };
    return body.meta?.page?.total ?? body.data?.length ?? 0;
  }

  /** Fresh single file object, for a not-yet-expired signed download URL. */
  async getFile(id: string): Promise<LsResource> {
    const response = await this.request(`${apiBase}/files/${encodeURIComponent(id)}`);
    if (!response.ok) {
      throw new LemonSqueezyApiError(`Lemon Squeezy returned ${response.status}`, response.status);
    }
    return ((await response.json()) as { data: LsResource }).data;
  }

  /** Cancels (ends) a Lemon Squeezy subscription. Needs the seller's own key. */
  async cancelSubscription(id: string): Promise<void> {
    const url = `${apiBase}/subscriptions/${encodeURIComponent(id)}`;
    await this.bucket.take();
    const response = await this.fetchImpl(url, {
      method: "DELETE",
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${this.options.apiKey}`,
      },
    });
    if (!response.ok) {
      throw new LemonSqueezyApiError(
        `Lemon Squeezy could not cancel subscription ${id} (${response.status})`,
        response.status,
      );
    }
  }

  /** Downloads a signed URL once. No retry: the URL is limited to 10 downloads/IP/day. */
  async download(url: string): Promise<Response> {
    const response = await this.fetchImpl(url);
    if (!response.ok) {
      throw new LemonSqueezyApiError(
        response.status === 403 || response.status === 410
          ? "Download link expired or limit reached"
          : `Download failed (${response.status})`,
        response.status,
      );
    }
    return response;
  }
}
