import { renderEmailLayout } from "./transactional-email-templates";
import type { AffiliateDecisionEmailInput } from "./affiliate-decision-email.types";
import type { TransactionalEmailContent } from "./transactional-email.types";

export function buildAffiliateDecisionEmail(
  input: AffiliateDecisionEmailInput,
): TransactionalEmailContent {
  const approved = input.decision === "approved";
  const layout = renderEmailLayout({
    storeName: input.store.name,
    storeLogo: input.store.logoImageUrl,
    eyebrow: approved ? "Application approved" : "Application update",
    title: approved
      ? `You are now a ${input.store.name} affiliate`
      : `Your ${input.store.name} affiliate application was not approved`,
    intro: approved
      ? "Your referral account is active. Sign in to your customer portal to choose a referral username and get product links."
      : "The store reviewed your application and decided not to approve it at this time. You can update your application and submit it again from your customer portal.",
    rows: [
      { label: "Applicant", value: input.affiliate.title },
      { label: "Status", value: approved ? "Approved" : "Rejected" },
    ],
    ...(input.message
      ? { detailTitle: "Message from the store", detail: input.message }
      : {}),
    ...(input.portalUrl
      ? {
          actionLabel: approved
            ? "Open affiliate portal"
            : "Update and resubmit",
          actionUrl: input.portalUrl,
        }
      : {}),
    footer: `This affiliate update was sent by ${input.store.name}.`,
  });
  return {
    to: input.affiliate.subtitle || "",
    subject: approved
      ? `${input.store.name}: Affiliate application approved`
      : `${input.store.name}: Affiliate application update`,
    ...layout,
  };
}
