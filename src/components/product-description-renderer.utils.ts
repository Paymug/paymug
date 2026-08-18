import sanitizeHtml from "sanitize-html";

export function sanitizeProductDescriptionHtml(value: unknown) {
  if (typeof value !== "string") return "";
  return sanitizeHtml(value, {
    allowedTags: ["b", "strong", "i", "em", "u", "br", "a"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
      }),
    },
  });
}

export function getSafeProductDescriptionImageUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  if (value.startsWith("/api/product-files/image?key=")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}
