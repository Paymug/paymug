import { z } from "zod";
import { sendAffiliateApplicationConfirmationEmail } from "@/lib/affiliate-application-email";
import { createUniqueAffiliateCode } from "@/lib/feature-import.utils";
import {
  createFeatureRecord,
  listFeatureRecords,
  updateFeatureRecord,
} from "@/lib/feature-records";
import { notifyAffiliateApplied } from "@/lib/notification-events";
import { sendStoreAffiliateRegisteredEmail } from "@/lib/store-notification-emails";
import { findUserById } from "@/lib/db";
import { getStoreBySlug } from "@/lib/stores";
import { jsonError } from "@/lib/utils";
import type { PublicAffiliateApplicationRouteContext } from "./route.types";
import { getAffiliateSignupMetadata } from "./route.utils";
import { requireProFeature } from "@/lib/pro-feature-access";

const affiliateApplicationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(240),
  about: z.string().trim().min(1).max(4000),
  websites: z.string().trim().max(4000),
  socialLinks: z.string().trim().max(4000),
});

export async function POST(
  request: Request,
  { params }: PublicAffiliateApplicationRouteContext
) {
  const denied = await requireProFeature("affiliates");
  if (denied) return denied;
  const { id: storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);
  if (!store?.affiliatesEnabled) return jsonError("Not found", 404);
  const seller = await findUserById(store.userId);
  if (!seller) return jsonError("Not found", 404);
  const environment = seller.environment;
  const parsed = affiliateApplicationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid application");
  }

  const affiliates = await listFeatureRecords(
    store.userId,
    "affiliates",
    environment
  );
  const email = parsed.data.email.toLowerCase();
  const existingApplication = affiliates.find(
    (affiliate) =>
      String(affiliate.subtitle || "").toLowerCase() === email &&
      (!affiliate.data.storeId || affiliate.data.storeId === store.id)
  );
  if (existingApplication && existingApplication.status !== "rejected") {
    return jsonError("An application already exists for this email", 409);
  }

  const usedCodes = new Set(
    affiliates.map((affiliate) =>
      String(affiliate.data.code || "").trim().toLowerCase()
    )
  );
  const code = createUniqueAffiliateCode(email.split("@")[0], usedCodes);
  const signupMetadata = getAffiliateSignupMetadata(request);
  const applicationInput = {
    environment,
    title: parsed.data.name,
    subtitle: email,
    status: "inactive",
    data: {
      storeId: store.id,
      code: existingApplication
        ? String(existingApplication.data.code || code)
        : code,
      trackingPath: `/r/${store.slug}/${
        existingApplication
          ? String(existingApplication.data.code || code)
          : code
      }`,
      about: parsed.data.about,
      websites: parsed.data.websites,
      socialLinks: parsed.data.socialLinks,
      city: signupMetadata.city,
      country: signupMetadata.country,
      signupIp: signupMetadata.signupIp,
      source: "public_application",
      appliedAt: new Date().toISOString(),
      rejectionMessage: "",
      ...(existingApplication
        ? { resubmittedAt: new Date().toISOString() }
        : {}),
    },
  };
  const affiliate = existingApplication
    ? await updateFeatureRecord(
        existingApplication.id,
        store.userId,
        applicationInput,
      )
    : await createFeatureRecord(
        store.userId,
        "affiliates",
        applicationInput,
      );
  if (!affiliate) return jsonError("Could not submit application", 500);
  await notifyAffiliateApplied(store.userId, affiliate);
  await sendStoreAffiliateRegisteredEmail({
    userId: store.userId,
    storeId: store.id,
    affiliate,
  });
  await sendAffiliateApplicationConfirmationEmail({ store, affiliate });
  return Response.json({ applied: true }, { status: 201 });
}
