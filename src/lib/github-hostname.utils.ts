export function normalizeGitHubHostname(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) throw new Error("GitHub callback hostname is required");
  const url = new URL(
    trimmedValue.includes("://")
      ? trimmedValue
      : `https://${trimmedValue}`
  );
  if (!url.host || (url.protocol !== "http:" && url.protocol !== "https:")) {
    throw new Error("Enter a valid hostname");
  }
  return url.host;
}

export function getStoredGitHubHostname(
  value?: string | null
): string | undefined {
  if (!value || value === "github_oauth_hostname") return undefined;
  try {
    return normalizeGitHubHostname(value);
  } catch {
    return undefined;
  }
}

export function getGitHubCallbackUrlForHostname(
  hostname: string,
  requestUrl: string
): string {
  const normalizedHostname = normalizeGitHubHostname(hostname);
  const local =
    normalizedHostname.startsWith("localhost") ||
    normalizedHostname.startsWith("127.0.0.1") ||
    normalizedHostname.startsWith("[::1]");
  const currentUrl = new URL(requestUrl);
  const protocol =
    local || normalizedHostname === currentUrl.host
      ? currentUrl.protocol
      : "https:";
  return `${protocol}//${normalizedHostname}/api/github/oauth/callback`;
}
