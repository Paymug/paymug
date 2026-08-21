import { parseProductDescription } from "@/components/product-description.utils";
import { sanitizeProductDescriptionHtml } from "@/components/product-description-renderer.utils";
import { escapeEmailHtml } from "./transactional-email.utils";

export function replaceEmailCampaignPlaceholders(
  value: string,
  receiverName: string,
): string {
  return value.replace(/\[name\]/gi, () => receiverName);
}

export function renderEmailCampaignContent(value: string): string {
  const content = parseProductDescription(value);
  return content.blocks
    .map((block) => {
      const text = sanitizeProductDescriptionHtml(block.data.text);
      if (block.type === "header") {
        const level = Math.min(4, Math.max(2, Number(block.data.level) || 2));
        return `<h${level} style="margin:24px 0 10px">${text}</h${level}>`;
      }
      if (block.type === "list") {
        const items = Array.isArray(block.data.items) ? block.data.items : [];
        const tag = block.data.style === "ordered" ? "ol" : "ul";
        return `<${tag}>${items
          .map((item) => {
            const value =
              typeof item === "string"
                ? item
                : item && typeof item === "object" && "content" in item
                  ? String(item.content || "")
                  : "";
            return `<li>${sanitizeProductDescriptionHtml(value)}</li>`;
          })
          .join("")}</${tag}>`;
      }
      if (block.type === "image") {
        const file = block.data.file as Record<string, unknown> | undefined;
        const url = typeof file?.url === "string" ? file.url : "";
        return url
          ? `<img src="${escapeEmailHtml(url)}" alt="" style="max-width:100%;border-radius:12px">`
          : "";
      }
      return block.type === "paragraph"
        ? `<p style="margin:0 0 16px;line-height:1.7">${text}</p>`
        : "";
    })
    .join("");
}

export function addEmailClickTracking(
  html: string,
  trackingBaseUrl: string,
): string {
  return html.replace(
    /href="(https?:\/\/[^"#]+)"/gi,
    (_match, url: string) =>
      `href="${trackingBaseUrl}?url=${encodeURIComponent(url)}"`,
  );
}
