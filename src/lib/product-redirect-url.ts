import { z } from "zod";
import type { ProductRedirectValues } from "./product-redirect-url.types";

const productRedirectPlaceholders = new Set([
  "[order_id]",
  "[email]",
  "[product_id]",
]);

export function resolveProductRedirectUrl(
  template: string,
  values: ProductRedirectValues,
): string {
  return template
    .replaceAll("[order_id]", encodeURIComponent(values.orderId))
    .replaceAll("[email]", encodeURIComponent(values.email))
    .replaceAll("[product_id]", encodeURIComponent(values.productId));
}

export const productRedirectUrlSchema = z
  .string()
  .trim()
  .max(2_000)
  .superRefine((value, context) => {
    const placeholders = value.match(/\[[^\]]+\]/g) || [];
    if (
      placeholders.some(
        (placeholder) => !productRedirectPlaceholders.has(placeholder),
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Only [order_id], [email], and [product_id] placeholders are supported",
      });
      return;
    }

    try {
      const resolved = new URL(
        resolveProductRedirectUrl(value, {
          orderId: "order",
          email: "customer@example.com",
          productId: "product",
        }),
      );
      if (resolved.protocol !== "https:" && resolved.protocol !== "http:") {
        throw new Error("Unsupported protocol");
      }
    } catch {
      context.addIssue({
        code: "custom",
        message: "Enter a valid HTTP or HTTPS redirect URL",
      });
    }
  });
