import "server-only";

import { sendCloudflareEmail } from "./cloudflare-email";
import { buildAffiliateDecisionEmail } from "./affiliate-decision-email-template";
import type { AffiliateDecisionEmailInput } from "./affiliate-decision-email.types";

export async function sendAffiliateDecisionEmail(
  input: AffiliateDecisionEmailInput,
) {
  if (!input.affiliate.subtitle) return false;
  return sendCloudflareEmail(buildAffiliateDecisionEmail(input), {
    name: input.store.name,
    replyTo: input.store.emailReplyTo || input.store.emailFrom,
  });
}
