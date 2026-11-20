import sanitizeHtml from "sanitize-html";
import { parseProductDescription } from "./product-description.utils";
import type { ProductDescriptionListItem } from "./product-description.types";

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

function renderListHtml(
  items: Array<string | ProductDescriptionListItem>,
  ordered: boolean,
): string {
  const tag = ordered ? "ol" : "ul";
  const body = items
    .map((item) => {
      const content = typeof item === "string" ? item : item?.content;
      const children =
        typeof item !== "string" && Array.isArray(item?.items) ? item.items : [];
      return `<li>${sanitizeProductDescriptionHtml(content)}${
        children.length ? renderListHtml(children, ordered) : ""
      }</li>`;
    })
    .join("");
  return `<${tag}>${body}</${tag}>`;
}

/** Static HTML string for a product description (no images), for emails/downloads. */
export function renderProductDescriptionHtml(value: string): string {
  return parseProductDescription(value)
    .blocks.map((block) => {
      if (block.type === "header") {
        const level = Math.min(5, Math.max(2, Number(block.data.level) || 2));
        return `<h${level}>${sanitizeProductDescriptionHtml(block.data.text)}</h${level}>`;
      }
      if (block.type === "list") {
        const items = Array.isArray(block.data.items) ? block.data.items : [];
        return renderListHtml(items, block.data.style === "ordered");
      }
      if (block.type === "paragraph") {
        return `<p>${sanitizeProductDescriptionHtml(block.data.text)}</p>`;
      }
      return "";
    })
    .join("");
}
