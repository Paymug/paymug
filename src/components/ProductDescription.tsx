import { ProductDescriptionList } from "./ProductDescriptionList";
import {
  getSafeProductDescriptionImageUrl,
  sanitizeProductDescriptionHtml,
} from "./product-description-renderer.utils";
import { parseProductDescription } from "./product-description.utils";
import type { ProductDescriptionProps } from "./product-description.types";

export function ProductDescription({
  value,
  className = "",
}: ProductDescriptionProps) {
  const description = parseProductDescription(value);
  return (
    <div className={`space-y-4 text-sm leading-relaxed ${className}`}>
      {description.blocks.map((block, index) => {
        if (block.type === "header") {
          const level = Number(block.data.level);
          const content = sanitizeProductDescriptionHtml(block.data.text);
          if (level === 3) {
            return (
              <h3
                key={block.id || index}
                className="text-lg font-semibold"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            );
          }
          if (level === 4) {
            return (
              <h4
                key={block.id || index}
                className="text-base font-semibold"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            );
          }
          if (level === 5) {
            return (
              <h5
                key={block.id || index}
                className="text-sm font-semibold"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            );
          }
          return (
            <h2
              key={block.id || index}
              className="text-xl font-semibold"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          );
        }
        if (block.type === "list") {
          const items = Array.isArray(block.data.items)
            ? block.data.items
            : [];
          return (
            <ProductDescriptionList
              key={block.id || index}
              items={items}
              ordered={block.data.style === "ordered"}
            />
          );
        }
        if (block.type === "image") {
          const file =
            block.data.file && typeof block.data.file === "object"
              ? (block.data.file as Record<string, unknown>)
              : {};
          const imageUrl = getSafeProductDescriptionImageUrl(file.url);
          if (!imageUrl) return null;
          const caption =
            typeof block.data.caption === "string"
              ? block.data.caption.replace(/<[^>]+>/g, "")
              : "";
          return (
            <figure key={block.id || index} className="space-y-2">
              <img
                src={imageUrl}
                alt={caption}
                className="w-full rounded-xl object-cover"
              />
              {caption && (
                <figcaption className="text-center text-xs text-muted">
                  {caption}
                </figcaption>
              )}
            </figure>
          );
        }
        if (block.type !== "paragraph") return null;
        return (
          <p
            key={block.id || index}
            dangerouslySetInnerHTML={{
              __html: sanitizeProductDescriptionHtml(block.data.text),
            }}
          />
        );
      })}
    </div>
  );
}
