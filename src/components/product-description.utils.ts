import type {
  ProductDescriptionData,
  ProductDescriptionListItem,
} from "./product-description.types";

function escapeEditorText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("\n", "<br>");
}

export function parseProductDescription(value: string): ProductDescriptionData {
  if (value) {
    try {
      const parsed = JSON.parse(value) as Partial<ProductDescriptionData>;
      if (Array.isArray(parsed.blocks)) {
        return { ...parsed, blocks: parsed.blocks } as ProductDescriptionData;
      }
    } catch {
      // Existing plain-text descriptions are converted into a paragraph block.
    }
  }
  return {
    blocks: value
      ? [
          {
            type: "paragraph",
            data: { text: escapeEditorText(value) },
          },
        ]
      : [],
  };
}

export function getProductDescriptionPlainText(value: string) {
  const description = parseProductDescription(value);
  return description.blocks
    .flatMap((block) => {
      if (block.type === "image") return [];
      if (block.type === "list") {
        const items = Array.isArray(block.data.items) ? block.data.items : [];
        return items.map(getProductDescriptionListItemText);
      }
      return typeof block.data.text === "string" ? [block.data.text] : [];
    })
    .join(" ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getProductDescriptionListItemText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const item = value as Partial<ProductDescriptionListItem>;
  return [
    typeof item.content === "string" ? item.content : "",
    ...(Array.isArray(item.items)
      ? item.items.map(getProductDescriptionListItemText)
      : []),
  ].join(" ");
}
