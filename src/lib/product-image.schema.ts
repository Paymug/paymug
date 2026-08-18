import { z } from "zod";

export const productImageUrlSchema = z
  .string()
  .max(2000)
  .refine((value) => {
    if (!value) return true;
    if (value.startsWith("/api/product-files/image?key=")) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Cover photo URL is invalid");
