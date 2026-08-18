import { z } from "zod";
import { getCustomerSession } from "@/lib/customer-auth";
import {
  findFeatureRecord,
  listFeatureRecords,
  updateFeatureRecord,
} from "@/lib/feature-records";
import { getStoreById } from "@/lib/stores";
import { jsonError } from "@/lib/utils";
import type { CustomerAffiliateRouteContext } from "./route.types";
import { requireProFeature } from "@/lib/pro-feature-access";

const usernameSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(48)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and single hyphens",
    ),
});

export async function PATCH(
  request: Request,
  { params }: CustomerAffiliateRouteContext,
) {
  const denied = await requireProFeature("affiliates");
  if (denied) return denied;
  const customer = await getCustomerSession();
  if (!customer) return jsonError("Unauthorized", 401);
  const parsed = usernameSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid username");
  }

  const { id } = await params;
  const affiliate = await findFeatureRecord(id);
  if (
    !affiliate ||
    affiliate.environment !== "live" ||
    affiliate.feature !== "affiliates" ||
    affiliate.status !== "active" ||
    affiliate.subtitle?.trim().toLowerCase() !== customer.email.toLowerCase()
  ) {
    return jsonError("Affiliate account not found", 404);
  }
  if (affiliate.data.usernameSetAt) {
    return jsonError("Your referral username has already been set", 409);
  }
  const storeId = String(affiliate.data.storeId || "");
  const store = storeId
    ? await getStoreById(storeId, affiliate.userId)
    : undefined;
  if (!store) return jsonError("Store not found", 404);

  const affiliates = await listFeatureRecords(
    affiliate.userId,
    "affiliates",
    "live"
  );
  const usernameTaken = affiliates.some(
    (candidate) =>
      candidate.id !== affiliate.id &&
      String(candidate.data.storeId || "") === store.id &&
      String(candidate.data.code || "").toLowerCase() === parsed.data.username,
  );
  if (usernameTaken) return jsonError("This referral username is taken", 409);

  const updated = await updateFeatureRecord(affiliate.id, affiliate.userId, {
    data: {
      ...affiliate.data,
      code: parsed.data.username,
      trackingPath: `/r/${store.slug}/${parsed.data.username}`,
      usernameSetAt: new Date().toISOString(),
    },
  });
  return Response.json({ affiliate: updated });
}
