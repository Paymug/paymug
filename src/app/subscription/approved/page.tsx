import Link from "next/link";
import { Logo } from "@/components/Logo";
import {
  buttonBaseClass,
  buttonVariantClasses,
  cardClass,
} from "@/components/ui.styles";
import {
  findFeatureRecord,
  updateFeatureRecord,
} from "@/lib/feature-records";
import { getPayPalSubscriptionStatus } from "@/lib/paypal-subscriptions";
import {
  getSubscriptionTrialEndDate,
  parseSubscriptionTrialDays,
} from "@/lib/subscription-trial.utils";
import { reconcilePayPalSubscription } from "@/lib/paypal-subscription-reconciliation";
import {
  activateSubscriptionTrialOrder,
  ensurePendingSubscriptionOrder,
} from "@/lib/subscription-orders";
import { sendSubscriptionStatusEmail } from "@/lib/transactional-emails";
import type { PayPalMode } from "@/lib/types";
import type { SubscriptionApprovedPageProps } from "./page.types";

export default async function SubscriptionApprovedPage({
  searchParams,
}: SubscriptionApprovedPageProps) {
  const { recordId } = await searchParams;
  const subscription = recordId
    ? await findFeatureRecord(recordId)
    : undefined;
  let active = false;
  let trialing = false;
  let trialEndsAt: string | undefined;

  if (subscription?.feature === "subscriptions") {
    const paypalSubscriptionId = String(
      subscription.data.paypalSubscriptionId || ""
    );
    const environment = subscription.environment;
    if (paypalSubscriptionId) {
      await ensurePendingSubscriptionOrder(subscription);
      const status = await getPayPalSubscriptionStatus({
        userId: subscription.userId,
        storeId:
          String(subscription.data.storeId || "") || undefined,
        mode: environment as PayPalMode,
        subscriptionId: paypalSubscriptionId,
      });
      active = status === "ACTIVE";
      let reconciledBenefitsProvisionedAt: string | undefined;
      let reconciledOrderId: string | undefined;
      if (active) {
        try {
          const reconciliation = await reconcilePayPalSubscription({
            subscription,
          });
          reconciledBenefitsProvisionedAt =
            reconciliation.benefitsProvisionedAt;
          reconciledOrderId = reconciliation.orderId;
        } catch (error) {
          console.error("PayPal approval reconciliation failed", {
            recordId: subscription.id,
            environment,
            message:
              error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
      const approvedAt = new Date().toISOString();
      const trialDays = parseSubscriptionTrialDays(
        subscription.data.trialDays
      );
      const trialStartedAt =
        typeof subscription.data.trialStartedAt === "string"
          ? subscription.data.trialStartedAt
          : approvedAt;
      trialEndsAt =
        typeof subscription.data.trialEndsAt === "string"
          ? subscription.data.trialEndsAt
          : getSubscriptionTrialEndDate(trialStartedAt, trialDays);
      trialing = Boolean(
        active &&
          trialDays > 0 &&
          Number(subscription.data.paymentsReceived || 0) === 0 &&
          trialEndsAt &&
          trialEndsAt > approvedAt
      );
      const nextStatus = trialing ? "trialing" : status.toLowerCase();
      let benefitsProvisionedAt =
        typeof subscription.data.benefitsProvisionedAt === "string"
          ? subscription.data.benefitsProvisionedAt
          : reconciledBenefitsProvisionedAt;
      if (trialing && !benefitsProvisionedAt) {
        const trialOrder = await activateSubscriptionTrialOrder({
          subscription,
          activatedAt: approvedAt,
        });
        if (trialOrder) benefitsProvisionedAt = approvedAt;
      }
      const updated = await updateFeatureRecord(
        subscription.id,
        subscription.userId,
        {
          status: nextStatus,
          data: {
            ...subscription.data,
            ...(reconciledOrderId ? { orderId: reconciledOrderId } : {}),
            approvedAt: subscription.data.approvedAt || approvedAt,
            ...(trialDays > 0
              ? { trialStartedAt, trialEndsAt: trialEndsAt || null }
              : {}),
            ...(benefitsProvisionedAt
              ? { benefitsProvisionedAt }
              : {}),
            paypalStatus: status,
          },
        }
      );
      if (active && subscription.status !== nextStatus && updated) {
        await sendSubscriptionStatusEmail({
          subscription: updated,
          status: nextStatus,
        });
      }
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-14 text-center">
      <Logo />
      <div className={`${cardClass} mt-10 w-full max-w-lg p-8`}>
        <h1 className="text-2xl font-bold">
          {trialing
            ? "Free trial started"
            : active
              ? "Subscription active"
              : "Subscription received"}
        </h1>
        <p className="mt-3 text-sm text-muted">
          {trialing
            ? `PayPal confirmed your subscription. Your free trial ends ${new Date(trialEndsAt || "").toLocaleDateString()}, then recurring billing begins.`
            : active
              ? "PayPal confirmed your recurring subscription."
              : "PayPal is still finalizing the subscription. The seller can see its current status."}
        </p>
        <Link
          href="/"
          className={`${buttonBaseClass} ${buttonVariantClasses.primary} mt-6`}
        >
          Continue
        </Link>
      </div>
    </main>
  );
}
