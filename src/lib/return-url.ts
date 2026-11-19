/** Per-checkout return URL: validation against the seller's domain allowlist. */

export const returnUrlCustomKey = "return_url";

const domainPatternRegex =
  /^(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;

/** Turns "https://*.Example.com/path" into "*.example.com"; undefined if invalid. */
export function normalizeRedirectDomain(input: string): string | undefined {
  let value = input.trim().toLowerCase();
  if (!value) return undefined;
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  value = value.split(/[/?#]/)[0].replace(/:\d+$/, "");
  if (!value || value.length > 253) return undefined;
  if (!domainPatternRegex.test(value)) return undefined;
  const bare = value.replace(/^\*\./, "");
  // A wildcard must sit on a real domain, never "*.com" or "*".
  if (value.startsWith("*.") && !bare.includes(".")) return undefined;
  return value;
}

export function parseRedirectDomains(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) =>
      typeof entry === "string" ? normalizeRedirectDomain(entry) ?? [] : [],
    );
  } catch {
    return [];
  }
}

export function isRedirectHostAllowed(
  hostname: string,
  allowedDomains: readonly string[],
): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return allowedDomains.some((pattern) => {
    if (pattern.startsWith("*.")) {
      return host.endsWith(pattern.slice(1)) && host.length > pattern.length - 1;
    }
    return host === pattern;
  });
}

function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost")
  );
}

/**
 * Returns the URL when it is safe to send the buyer there, otherwise undefined.
 * https only (http for localhost in sandbox mode), no embedded credentials, and
 * the host must be on the seller's allowlist.
 */
export function resolveReturnUrl(
  value: string | null | undefined,
  options: { allowedDomains: readonly string[]; sandbox: boolean },
): string | undefined {
  if (!value || value.length > 1_000) return undefined;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return undefined;
  }
  if (url.username || url.password) return undefined;
  const hostname = url.hostname.toLowerCase();
  const local = options.sandbox && isLocalHost(hostname);
  if (url.protocol === "http:") {
    if (!local) return undefined;
  } else if (url.protocol !== "https:") {
    return undefined;
  }
  if (!local && !isRedirectHostAllowed(hostname, options.allowedDomains)) {
    return undefined;
  }
  return url.toString();
}
