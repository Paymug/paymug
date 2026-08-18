import { z } from "zod";
import { sendAffiliateDecisionEmail } from "@/lib/affiliate-decision-email";
import { settleAffiliatePayoutReport } from "@/lib/affiliate-payouts";
import { getSessionUser } from "@/lib/auth";
import { applyDiscountProductScope } from "@/lib/discount-products";
import { isDashboardFeatureKey } from "@/lib/feature-records.config";
import {
  deleteFeatureRecord,
  findFeatureRecord,
  updateFeatureRecord,
} from "@/lib/feature-records";
import { notifySubscriptionUpdated } from "@/lib/notification-events";
import { parseSubscriptionTrialDays } from "@/lib/subscription-trial.utils";
import { jsonError } from "@/lib/utils";
import { changePayPalSubscriptionState } from "@/lib/paypal-subscriptions";
import { sendSubscriptionStatusEmail } from "@/lib/transactional-emails";
import { getStoreById } from "@/lib/stores";
import { syncGitHubAccessForLicense } from "@/lib/github-access";
import {
  getLicenseEntitlementSummary,
  hasActiveLicenseUpdates,
} from "@/lib/license-entitlements";
import type { FeatureRecordRouteContext } from "./route.types";
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

const updateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  subtitle: z.string().trim().max(240).optional(),
  status: z.string().trim().min(1).max(40).optional(),
  data: z.record(z.string(), featureValueSchema).optional(),
});

export async function PATCH(
  req: Request,
  { params }: FeatureRecordRouteContext
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { feature, id } = await params;
  const proFeature = getDashboardFeatureProRequirement(feature);
  if (proFeature) {
    const denied = await requireProFeature(proFeature);
    if (denied) return denied;
  }
  if (!isDashboardFeatureKey(feature) || feature === "pages") {
    return jsonError("Not found", 404);
  }

  const existing = await findFeatureRecord(id, user.id);
  if (
    !existing ||
    existing.feature !== feature ||
    existing.environment !== user.environment
  ) {
    return jsonError("Record not found", 404);
  }

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid input");
  }

  const mergedInput = {
    title: parsed.data.title || existing.title,
    subtitle: parsed.data.subtitle ?? existing.subtitle,
    status: parsed.data.status || existing.status,
    data: {
      ...existing.data,
      ...parsed.data.data,
    },
  };
  if (
    feature === "affiliates" &&
    existing.data.usernameSetAt &&
    parsed.data.data?.code !== undefined &&
    String(parsed.data.data.code).toLowerCase() !==
      String(existing.data.code || "").toLowerCase()
  ) {
    return jsonError("This referral username is permanent", 409);
  }
  let input: FeatureRecordInput =
    feature === "affiliates" && mergedInput.data
      ? {
          ...mergedInput,
          data: {
            ...mergedInput.data,
            trackingPath: `/r/${user.storeSlug}/${String(mergedInput.data.code || "")}`,
          },
        }
      : mergedInput;
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
      const trialDays = parseSubscriptionTrialDays(input.data?.trialDays);
      if (
        existing.data.paypalPlanId &&
        trialDays !== parseSubscriptionTrialDays(existing.data.trialDays)
      ) {
        return jsonError(
          "The free trial cannot be changed after the PayPal plan is created",
          409
        );
      }
      input = {
        ...input,
        data: {
          ...input.data,
          trialDays,
        },
      };
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "Invalid free trial",
        400
      );
    }
  }
  const licenseAccessChanged =
    feature === "licenses" &&
    (input.status !== existing.status ||
      parsed.data.data?.expiresAt !== undefined ||
      parsed.data.data?.updatesExpireAt !== undefined ||
      parsed.data.data?.licenseType !== undefined);
  if (licenseAccessChanged) {
    const license = {
      ...existing,
      status: input.status || existing.status,
      data: {
        ...existing.data,
        ...input.data,
      },
    };
    const updatesActive = hasActiveLicenseUpdates(license);
    try {
      await syncGitHubAccessForLicense(license, updatesActive);
      if (getLicenseEntitlementSummary(license).perpetual) {
        input = {
          ...input,
          data: {
            ...input.data,
            updatesStatus: updatesActive ? "active" : "expired",
            updatesExpiredAt: updatesActive ? null : new Date().toISOString(),
          },
        };
      }
    } catch (error) {
      return jsonError(
        error instanceof Error
          ? error.message
          : "Could not update GitHub repository access",
        400
      );
    }
  }
  const managedByPayPal =
    feature === "subscriptions" &&
    Boolean(existing.data.paypalSubscriptionId);

  if (
    feature === "subscriptions" &&
    input.status &&
    input.status !== existing.status
  ) {
    const paypalSubscriptionId = String(
      existing.data.paypalSubscriptionId || ""
    );
    const environment =
      existing.data.environment === "live" ? "live" : "sandbox";
    const action =
      input.status === "cancelled"
        ? "cancel"
        : input.status === "suspended" || input.status === "paused"
          ? "suspend"
          : input.status === "active"
            ? "activate"
            : undefined;
    if (paypalSubscriptionId && action) {
      try {
        await changePayPalSubscriptionState({
          userId: user.id,
          storeId:
            String(existing.data.storeId || "") || user.activeStoreId,
          mode: environment,
          subscriptionId: paypalSubscriptionId,
          action,
        });
      } catch (error) {
        return jsonError(
          error instanceof Error
            ? error.message
            : "Could not update PayPal subscription",
          400
        );
      }
    }
  }

  let updated = await updateFeatureRecord(id, user.id, input);
  if (
    feature === "affiliate-payouts" &&
    updated?.status === "paid" &&
    existing.status !== "paid"
  ) {
    await settleAffiliatePayoutReport({
      userId: user.id,
      payoutId: id,
      environment: user.environment,
    });
    updated = await updateFeatureRecord(id, user.id, {
      data: {
        ...updated.data,
        paidAt: new Date().toISOString(),
      },
    });
  }
  if (feature === "subscriptions" && updated) {
    await notifySubscriptionUpdated(
      user.id,
      updated,
      `subscription-update:${updated.id}:${updated.updatedAt}`
    );
    if (
      input.status &&
      input.status !== existing.status &&
      !managedByPayPal &&
      ["active", "cancelled", "suspended", "paused", "expired"].includes(
        input.status
      )
    ) {
      await sendSubscriptionStatusEmail({
        subscription: updated,
        status: input.status,
        requestUrl: req.url,
      });
    }
  }
  if (
    feature === "affiliates" &&
    updated &&
    updated.status !== existing.status &&
    ["active", "rejected"].includes(updated.status)
  ) {
    const storeId = String(updated.data.storeId || user.activeStoreId);
    const store = await getStoreById(storeId, user.id);
    if (store) {
      await sendAffiliateDecisionEmail({
        store,
        affiliate: updated,
        decision: updated.status === "active" ? "approved" : "rejected",
        message: String(updated.data.rejectionMessage || "") || undefined,
        portalUrl: new URL("/customer/affiliate", req.url).toString(),
      });
    }
  }

  return Response.json({ record: updated });
}

export async function DELETE(
  _req: Request,
  { params }: FeatureRecordRouteContext
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { feature, id } = await params;
  const proFeature = getDashboardFeatureProRequirement(feature);
  if (proFeature) {
    const denied = await requireProFeature(proFeature);
    if (denied) return denied;
  }
  if (!isDashboardFeatureKey(feature) || feature === "pages") {
    return jsonError("Not found", 404);
  }

  const existing = await findFeatureRecord(id, user.id);
  if (
    !existing ||
    existing.feature !== feature ||
    existing.environment !== user.environment
  ) {
    return jsonError("Record not found", 404);
  }

  if (
    feature === "subscriptions" &&
    existing.status !== "cancelled" &&
    existing.status !== "approval_cancelled"
  ) {
    const paypalSubscriptionId = String(
      existing.data.paypalSubscriptionId || ""
    );
    if (paypalSubscriptionId) {
      try {
        await changePayPalSubscriptionState({
          userId: user.id,
          storeId:
            String(existing.data.storeId || "") || user.activeStoreId,
          mode: existing.data.environment === "live" ? "live" : "sandbox",
          subscriptionId: paypalSubscriptionId,
          action: "cancel",
        });
      } catch (error) {
        return jsonError(
          error instanceof Error
            ? error.message
            : "Cancel the PayPal subscription before deleting it",
          400
        );
      }
    }
  }

  if (feature === "licenses") {
    try {
      await syncGitHubAccessForLicense(existing, false);
    } catch (error) {
      return jsonError(
        error instanceof Error
          ? error.message
          : "Could not revoke GitHub repository access",
        400
      );
    }
  }
  await deleteFeatureRecord(id, user.id);
  return Response.json({ deleted: true });
}
