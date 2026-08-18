import type { RequestHeaderReader } from "./request-origin.types";

export function getRequestOrigin(
  requestHeaders: RequestHeaderReader
): string | undefined {
  const hostname =
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  if (!hostname) return undefined;
  const protocol =
    requestHeaders.get("x-forwarded-proto") ||
    (hostname.startsWith("localhost") || hostname.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${protocol}://${hostname}`;
}
