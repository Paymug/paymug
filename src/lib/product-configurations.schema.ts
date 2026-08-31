import { z } from "zod";

export const productOptionSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  price: z.number().int().min(0).max(1_000_000_000),
});

export const productBundleSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  selectionMode: z.enum(["single", "multiple"]),
  choices: z.array(
    z.object({
      id: z.string().min(1).max(80),
      name: z.string().trim().min(1).max(120),
      price: z.number().int().min(0).max(1_000_000_000),
    }),
  ).max(50),
});
