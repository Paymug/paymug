import { sanitizeProductDescriptionHtml } from "./product-description-renderer.utils";
import type { ProductDescriptionListProps } from "./product-description.types";

export function ProductDescriptionList({
  items,
  ordered,
}: ProductDescriptionListProps) {
  const ListTag = ordered ? "ol" : "ul";
  return (
    <ListTag
      className={`space-y-1 pl-6 ${ordered ? "list-decimal" : "list-disc"}`}
    >
      {items.map((item, index) => {
        const content =
          typeof item === "string"
            ? item
            : typeof item.content === "string"
              ? item.content
              : "";
        const children =
          typeof item !== "string" && Array.isArray(item.items)
            ? item.items
            : [];
        return (
          <li key={`${index}-${content.slice(0, 20)}`}>
            <span
              dangerouslySetInnerHTML={{
                __html: sanitizeProductDescriptionHtml(content),
              }}
            />
            {!!children.length && (
              <ProductDescriptionList items={children} ordered={ordered} />
            )}
          </li>
        );
      })}
    </ListTag>
  );
}
