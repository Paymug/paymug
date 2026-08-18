import type { CustomerAffiliateProduct } from "@/lib/customer-affiliate-portal.types";
import type { AffiliateEmbedFormat } from "./AffiliateReferralTools.types";

function escapeHtmlAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function getProductAffiliatePath(
  productId: string,
  username: string,
) {
  return `/buy/${encodeURIComponent(productId)}?ref=${encodeURIComponent(username)}`;
}

export function buildAffiliateEmbedCode(
  format: AffiliateEmbedFormat,
  url: string,
  product: CustomerAffiliateProduct,
) {
  const safeUrl = escapeHtmlAttribute(url);
  const safeName = escapeHtmlAttribute(product.name);
  if (format === "button") {
    return `<a href="${safeUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#23221f;color:#fff;text-decoration:none;font:600 14px/1.2 system-ui">Buy ${safeName}</a>`;
  }
  if (format === "card") {
    const image = product.imageUrl
      ? `<img src="${escapeHtmlAttribute(product.imageUrl)}" alt="" style="display:block;width:100%;aspect-ratio:16/9;object-fit:cover">`
      : "";
    return `<a href="${safeUrl}" style="display:block;max-width:320px;overflow:hidden;border:1px solid #e8e8ee;border-radius:14px;color:#2f2f38;text-decoration:none;font-family:system-ui">${image}<span style="display:block;padding:16px;font-weight:700">${safeName}</span></a>`;
  }
  return `<a href="${safeUrl}">Buy ${safeName}</a>`;
}
