export function escapeEmailHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function stripEmailDisplayName(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim();
}

export function getEmailDisplayName(value: string) {
  const match = value.match(/^(.+?)\s*<[^>]+>$/);
  return match?.[1]?.trim().replace(/^["']|["']$/g, "") || "";
}

export function formatEmailDate(value?: string) {
  return new Date(value || Date.now()).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

export function humanizeSubscriptionStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}
