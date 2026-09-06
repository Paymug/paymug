export function normalizeStoreDomain(value: string): string | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  let url: URL;
  try {
    url = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(trimmedValue)
        ? trimmedValue
        : `https://${trimmedValue}`,
    );
  } catch {
    throw new Error("Enter a valid store domain");
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search ||
    url.hash
  ) {
    throw new Error("Store domain must be an HTTP or HTTPS origin without a path");
  }

  return url.origin;
}
