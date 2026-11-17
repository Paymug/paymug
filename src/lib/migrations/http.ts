import { TokenBucket } from "../lemonsqueezy/client";

export class SourceApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SourceApiError";
  }
}

export interface ThrottledHttpOptions {
  /** Shown in error messages, e.g. "Polar". */
  label: string;
  baseUrl: string;
  headers: Record<string, string>;
  requestsPerMinute: number;
  maxRetries?: number;
  /** Wait applied after a 429 when no Retry-After header is sent. */
  rateLimitWaitMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Bearer-style JSON client with a token bucket and 429/5xx retry. */
export class ThrottledHttp {
  readonly sleep: (ms: number) => Promise<void>;
  private readonly fetchImpl: typeof fetch;
  private readonly bucket: TokenBucket;
  private readonly maxRetries: number;

  constructor(private readonly options: ThrottledHttpOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleep ?? defaultSleep;
    this.bucket = new TokenBucket(
      Math.min(options.requestsPerMinute, 20),
      options.requestsPerMinute / 60_000,
      options.now ?? Date.now,
      this.sleep,
    );
    this.maxRetries = options.maxRetries ?? 4;
  }

  url(path: string, params: Record<string, string | number | undefined> = {}): string {
    const url = new URL(`${this.options.baseUrl.replace(/\/$/, "")}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  async request(url: string, init: RequestInit = {}): Promise<Response> {
    let attempt = 0;
    for (;;) {
      await this.bucket.take();
      let response: Response | undefined;
      try {
        response = await this.fetchImpl(url, {
          ...init,
          headers: { Accept: "application/json", ...this.options.headers, ...init.headers },
        });
      } catch (error) {
        if (attempt >= this.maxRetries) throw error;
      }
      if (response && response.status !== 429 && response.status < 500) return response;
      if (attempt >= this.maxRetries) {
        throw new SourceApiError(
          `${this.options.label} request failed (${response?.status ?? "network"})`,
          response?.status ?? 0,
        );
      }
      const retryAfter = Number(response?.headers.get("retry-after"));
      const rateLimited = response?.status === 429;
      await this.sleep(
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : rateLimited && this.options.rateLimitWaitMs
            ? this.options.rateLimitWaitMs
            : Math.min(30_000, 500 * 2 ** attempt),
      );
      attempt += 1;
    }
  }

  /** GET JSON. 401/403 become key errors; other non-2xx throw with the status. */
  async getJson<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const response = await this.request(this.url(path, params));
    if (response.status === 401 || response.status === 403) {
      throw new SourceApiError(`${this.options.label} rejected the API key`, response.status);
    }
    if (!response.ok) {
      throw new SourceApiError(`${this.options.label} returned ${response.status}`, response.status);
    }
    return (await response.json()) as T;
  }

  async send(
    method: "POST" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<Response> {
    await this.bucket.take();
    const response = await this.fetchImpl(this.url(path), {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...this.options.headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      throw new SourceApiError(
        `${this.options.label} returned ${response.status} for ${method} ${path}`,
        response.status,
      );
    }
    return response;
  }

  /** Downloads a signed URL once, without auth headers and without retry. */
  async download(url: string): Promise<Response> {
    const response = await this.fetchImpl(url);
    if (!response.ok) {
      throw new SourceApiError(
        response.status === 403 || response.status === 410
          ? "Download link expired or limit reached"
          : `Download failed (${response.status})`,
        response.status,
      );
    }
    return response;
  }
}
