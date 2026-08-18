import { randomUUID } from "crypto";

export function uid(): string {
  return randomUUID();
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function absoluteUrl(
  path: string,
  requestUrl?: string,
  originOverride?: string
): string {
  const base =
    originOverride ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (requestUrl ? new URL(requestUrl).origin : "http://localhost:3000");
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
