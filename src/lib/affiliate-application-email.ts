import "server-only";

import { buildAffiliateApplicationConfirmationEmail } from "./affiliate-application-email-template";
import type { AffiliateApplicationEmailInput } from "./affiliate-application-email.types";
import { sendCloudflareEmail } from "./cloudflare-email";

export async function sendAffiliateApplicationConfirmationEmail(
  input: AffiliateApplicationEmailInput,
) {
  if (!input.affiliate.subtitle) return false;
  return sendCloudflareEmail(
    buildAffiliateApplicationConfirmationEmail(input),
    {
      name: input.store.name,
      replyTo: input.store.emailReplyTo || input.store.emailFrom,
    },
  );
}
