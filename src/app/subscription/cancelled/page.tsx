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
import { sendSubscriptionStatusEmail } from "@/lib/transactional-emails";
import type { SubscriptionCancelledPageProps } from "./page.types";

export default async function SubscriptionCancelledPage({
  searchParams,
}: SubscriptionCancelledPageProps) {
  const { recordId } = await searchParams;
  const subscription = recordId
    ? await findFeatureRecord(recordId)
    : undefined;
  if (
    subscription?.feature === "subscriptions" &&
    subscription.status !== "approval_cancelled"
  ) {
    const updated = await updateFeatureRecord(
      subscription.id,
      subscription.userId,
      { status: "approval_cancelled" }
    );
    if (updated) {
      await sendSubscriptionStatusEmail({
        subscription: updated,
        status: "cancelled",
      });
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-14 text-center">
      <Logo />
      <div className={`${cardClass} mt-10 w-full max-w-lg p-8`}>
        <h1 className="text-2xl font-bold">Subscription cancelled</h1>
        <p className="mt-3 text-sm text-muted">
          PayPal did not start the recurring subscription.
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
