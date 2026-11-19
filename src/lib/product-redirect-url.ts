import { z } from "zod";
import type { ProductRedirectValues } from "./product-redirect-url.types";

const customPlaceholderName = "[A-Za-z0-9_.-]{1,64}";
const placeholderPattern = new RegExp(
  `\\[custom\\]\\[${customPlaceholderName}\\]|\\[[^\\]]+\\]`,
  "g",
);
const customPlaceholderPattern = new RegExp(
  `^\\[custom\\]\\[(${customPlaceholderName})\\]$`,
);

const productRedirectPlaceholders = new Set([
  "[order_id]",
  "[email]",
  "[product_id]",
]);

function substitutePlaceholders(
  template: string,
  lookup: (placeholder: string, customName?: string) => string | undefined,
): string {
  // One pass, so a substituted value is never scanned for placeholders again.
  return template.replace(placeholderPattern, (placeholder) => {
    const customName = customPlaceholderPattern.exec(placeholder)?.[1];
    const value = lookup(placeholder, customName);
    return value === undefined ? placeholder : encodeURIComponent(value);
  });
}

export function resolveProductRedirectUrl(
  template: string,
  values: ProductRedirectValues,
): string {
  return substitutePlaceholders(template, (placeholder, customName) => {
    if (customName) {
      return Object.hasOwn(values.custom ?? {}, customName)
        ? values.custom![customName]
        : "";
    }
    if (placeholder === "[order_id]") return values.orderId;
    if (placeholder === "[email]") return values.email;
    if (placeholder === "[product_id]") return values.productId;
    return undefined;
  });
}

export const productRedirectUrlSchema = z
  .string()
  .trim()
  .max(2_000)
  .superRefine((value, context) => {
    const placeholders = value.match(placeholderPattern) || [];
    if (
      placeholders.some(
        (placeholder) =>
          !productRedirectPlaceholders.has(placeholder) &&
          !customPlaceholderPattern.test(placeholder),
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Only [order_id], [email], [product_id], and [custom][name] placeholders are supported",
      });
      return;
    }

    try {
      const resolved = new URL(
        substitutePlaceholders(value, (placeholder) =>
          placeholder === "[email]" ? "customer@example.com" : "sample",
        ),
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
