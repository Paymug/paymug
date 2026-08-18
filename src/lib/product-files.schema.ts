import { z } from "zod";

export const productFileInputSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  size: z.number().int().min(0).max(25 * 1024 * 1024),
  type: z.string().max(200),
  storageKey: z.string().min(1).max(500),
});
