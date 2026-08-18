import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { updateStore } from "@/lib/stores";
import { jsonError } from "@/lib/utils";
import type { StoreRouteProps } from "./route.types";
import { requireProFeature } from "@/lib/pro-feature-access";

const updateStoreSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().min(1).max(80),
  description: z.string().trim().max(1000),
  logoImageUrl: z
    .string()
    .max(1_500_000)
    .refine(
      (value) =>
        value === "" ||
        value.startsWith("data:image/jpeg;base64,") ||
        value.startsWith("data:image/png;base64,") ||
        value.startsWith("data:image/webp;base64,"),
      "Store logo must be a JPEG, PNG, or WebP image"
    ),
  coverImageUrl: z
    .string()
    .max(1_500_000)
    .refine(
      (value) =>
        value === "" ||
        value.startsWith("/api/product-files/image?key=") ||
        value.startsWith("data:image/jpeg;base64,") ||
        value.startsWith("data:image/png;base64,") ||
        value.startsWith("data:image/webp;base64,"),
      "Cover image must be a JPEG, PNG, or WebP image"
    ),
  emailFrom: z.string().trim().email().or(z.literal("")),
  emailReplyTo: z.string().trim().email().or(z.literal("")),
  currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]),
  transactionFeeType: z.enum(["fixed", "percentage"]),
  transactionFeeValue: z.number().int().min(0).max(1000000000),
}).refine(
  (data) =>
    data.transactionFeeType !== "percentage" ||
    data.transactionFeeValue <= 10000,
  {
    message: "Percentage transaction fee cannot exceed 100%",
    path: ["transactionFeeValue"],
  },
);

export async function PATCH(
  request: Request,
  { params }: StoreRouteProps
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = updateStoreSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid store");
  }
  try {
    const { id } = await params;
    if (id !== user.activeStoreId) {
      const denied = await requireProFeature("multi_store");
      if (denied) return denied;
    }
    const store = await updateStore(id, user.id, {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      logoImageUrl: parsed.data.logoImageUrl || null,
      coverImageUrl: parsed.data.coverImageUrl || null,
      emailFrom: parsed.data.emailFrom || null,
      emailReplyTo: parsed.data.emailReplyTo || null,
      currency: parsed.data.currency,
      transactionFeeType: parsed.data.transactionFeeType,
      transactionFeeValue: parsed.data.transactionFeeValue,
    });
    if (!store) return jsonError("Store not found", 404);
    return Response.json({ store });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not update store",
      409
    );
  }
}
