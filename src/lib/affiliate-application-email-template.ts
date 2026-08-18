import { renderEmailLayout } from "./transactional-email-templates";
import { formatEmailDate } from "./transactional-email.utils";
import type { AffiliateApplicationEmailInput } from "./affiliate-application-email.types";
import type { TransactionalEmailContent } from "./transactional-email.types";

export function buildAffiliateApplicationConfirmationEmail(
  input: AffiliateApplicationEmailInput,
): TransactionalEmailContent {
  const layout = renderEmailLayout({
    storeName: input.store.name,
    storeLogo: input.store.logoImageUrl,
    eyebrow: "Application received",
    title: "Your affiliate application is under review",
    intro: `Thanks for applying to the ${input.store.name} affiliate program. The store team will review your application and contact you when its status changes.`,
    rows: [
      { label: "Applicant", value: input.affiliate.title },
      { label: "Status", value: "Pending review" },
      {
        label: "Submitted",
        value: formatEmailDate(input.affiliate.createdAt),
      },
    ],
    footer: `This confirmation was sent by ${input.store.name}.`,
  });
  return {
    to: input.affiliate.subtitle || "",
    subject: `${input.store.name}: Affiliate application received`,
    ...layout,
  };
}
