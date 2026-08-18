import { z } from "zod";
import { settleAffiliateReferrals } from "@/lib/affiliate-payouts";
import { listAffiliateDashboardRecords } from "@/lib/affiliate-dashboard";
import { getSessionUser } from "@/lib/auth";
import { applyDiscountProductScope } from "@/lib/discount-products";
import { isDashboardFeatureKey } from "@/lib/feature-records.config";
import {
  createFeatureRecord,
  deleteFeatureRecord,
  listFeatureRecords,
  updateFeatureRecord,
} from "@/lib/feature-records";
import { validateNewFeatureRecord } from "@/lib/feature-validation";
import {
  notifyAffiliateApplied,
  notifySubscriptionUpdated,
} from "@/lib/notification-events";
import { provisionPayPalSubscription } from "@/lib/paypal-subscriptions";
import { createPayPalPayout } from "@/lib/paypal-payouts";
import { sendSubscriptionApprovalEmail } from "@/lib/transactional-emails";
import { parseSubscriptionTrialDays } from "@/lib/subscription-trial.utils";
import { jsonError } from "@/lib/utils";
import type { FeatureRouteContext } from "./route.types";
import type { FeatureRecordInput } from "@/lib/feature-records.types";
import {
  getDashboardFeatureProRequirement,
  requireProFeature,
} from "@/lib/pro-feature-access";

const featureScalarSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
const featureValueSchema = z.union([
  featureScalarSchema,
  z.array(featureScalarSchema),
]);

const createSchema = z.object({
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().max(240).optional(),
  status: z.string().trim().min(1).max(40).optional(),
  data: z.record(z.string(), featureValueSchema).optional(),
});

export async function GET(
  _req: Request,
  { params }: FeatureRouteContext
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { feature } = await params;
  const proFeature = getDashboardFeatureProRequirement(feature);
  if (proFeature) {
    const denied = await requireProFeature(proFeature);
    if (denied) return denied;
  }
  if (!isDashboardFeatureKey(feature) || feature === "pages") {
    return jsonError("Not found", 404);
  }

  return Response.json({
    records:
      feature === "affiliates"
        ? await listAffiliateDashboardRecords(
            user.id,
            user.activeStoreId,
            user.environment
          )
        : await listFeatureRecords(user.id, feature, user.environment),
  });
}

export async function POST(
  req: Request,
  { params }: FeatureRouteContext
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { feature } = await params;
  const proFeature = getDashboardFeatureProRequirement(feature);
  if (proFeature) {
    const denied = await requireProFeature(proFeature);
    if (denied) return denied;
  }
  if (!isDashboardFeatureKey(feature) || feature === "pages") {
    return jsonError("Not found", 404);
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid input");
  }

  let input: FeatureRecordInput =
    feature === "affiliates"
      ? {
          ...parsed.data,
          data: {
            ...parsed.data.data,
            storeId: user.activeStoreId,
            trackingPath: `/r/${user.storeSlug}/${String(parsed.data.data?.code || "")}`,
          },
        }
      : {
          ...parsed.data,
          data: {
            ...parsed.data.data,
            storeId: user.activeStoreId,
          },
        };
  input.environment = user.environment;
  if (feature === "discounts") {
    try {
      input = await applyDiscountProductScope(
        user.id,
        user.activeStoreId,
        input
      );
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "Invalid product",
        400
      );
    }
  }
  if (feature === "subscriptions") {
    try {
      input = {
        ...input,
        data: {
          ...input.data,
          trialDays: parseSubscriptionTrialDays(input.data?.trialDays),
        },
      };
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "Invalid free trial",
        400
      );
    }
  }
  const validationError = await validateNewFeatureRecord(
    user.id,
    feature,
    input
  );
  if (validationError) return jsonError(validationError, 409);
  let record = await createFeatureRecord(user.id, feature, input);

  if (feature === "subscriptions") {
    try {
      const { normalizeLegacySubscriptionInterval } = await import(
        "@/lib/product-billing"
      );
      const cadence = normalizeLegacySubscriptionInterval(
        record.data.intervalUnit
          ? `${record.data.intervalUnit}:${record.data.intervalCount || 1}`
          : record.data.interval
      );
      const provisioned = await provisionPayPalSubscription({
        userId: user.id,
        storeId: user.activeStoreId,
        mode: user.environment,
        recordId: record.id,
        planName: record.title,
        customerEmail: record.subtitle || "",
        amount: Number(record.data.amount || 0),
        currency: String(record.data.currency || "USD"),
        intervalUnit: cadence.unit,
        intervalCount: cadence.count,
        trialDays: Number(record.data.trialDays || 0),
        requestUrl: req.url,
      });
      record =
        (await updateFeatureRecord(record.id, user.id, {
          status: "approval_pending",
          data: {
            ...record.data,
            ...provisioned,
            environment: user.environment,
          },
        })) || record;
    } catch (error) {
      await deleteFeatureRecord(record.id, user.id);
      return jsonError(
        error instanceof Error
          ? error.message
          : "Could not create PayPal subscription",
        400
      );
    }
  }

  if (feature === "affiliate-payouts") {
    try {
      const payout = await createPayPalPayout({
        userId: user.id,
        storeId: user.activeStoreId,
        mode: user.environment,
        recordId: record.id,
        recipientEmail: String(record.data.recipientEmail || ""),
        amount: Number(record.data.amount || 0),
        note: record.subtitle,
      });
      record =
        (await updateFeatureRecord(record.id, user.id, {
          status: payout.payoutStatus.toLowerCase(),
          data: {
            ...record.data,
            ...payout,
            environment: user.environment,
            createdAt: new Date().toISOString(),
          },
        })) || record;
      await settleAffiliateReferrals({
        userId: user.id,
        affiliateName: record.title,
        payoutId: record.id,
        amount: Number(record.data.amount || 0),
        environment: user.environment,
      });
    } catch (error) {
      await deleteFeatureRecord(record.id, user.id);
      return jsonError(
        error instanceof Error ? error.message : "Could not create payout",
        400
      );
    }
  }

  if (feature === "affiliates") {
    await notifyAffiliateApplied(user.id, record);
  }
  if (feature === "subscriptions") {
    await notifySubscriptionUpdated(
      user.id,
      record,
      `subscription-created:${record.id}`
    );
    await sendSubscriptionApprovalEmail({
      subscription: record,
      requestUrl: req.url,
    });
  }

  return Response.json({ record }, { status: 201 });
}
