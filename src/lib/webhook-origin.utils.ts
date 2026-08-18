export function getWebhookOrigin(
  hostname: string | undefined,
  requestUrl: string
): string | undefined {
  const value = hostname?.trim();
  if (!value) return undefined;

  const requestOrigin = new URL(requestUrl).origin;
  const requestProtocol = new URL(requestOrigin).protocol;
  const candidate = value.includes("://")
    ? value
    : `${isLocalHostname(value) ? requestProtocol : "https:"}//${value}`;
  const url = new URL(candidate);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Webhook hostname must use HTTP or HTTPS");
  }

  return url.origin;
}

function isLocalHostname(value: string): boolean {
  const hostname = value.split(":")[0]?.toLowerCase();
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    value.toLowerCase().startsWith("[::1]")
  );
}
