import { z } from "zod";

export const storePageSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(1).max(100),
  description: z.string().trim().max(320),
  coverImageUrl: z.string().trim().max(2000).optional().default(""),
  content: z.string().max(1_000_000),
  navigation: z.enum(["none", "top", "footer"]),
  navigationLabel: z.string().trim().max(80).default(""),
  status: z.enum(["draft", "published"]),
});
