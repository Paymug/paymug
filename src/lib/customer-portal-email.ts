import "server-only";

import { sendCloudflareEmailStrict } from "./cloudflare-email";
import { renderEmailLayout } from "./transactional-email-templates";

export async function sendCustomerPortalLoginEmail(
  email: string,
  loginUrl: string
): Promise<void> {
  const layout = renderEmailLayout({
    storeName: "Paymug",
    title: "Sign in to your customer portal",
    intro:
      "Use the secure link below to view your purchases, licenses, subscriptions, and delivery details.",
    actionLabel: "Open customer portal",
    actionUrl: loginUrl,
    footer:
      "This link expires in 15 minutes and can only be used once.",
  });
  await sendCloudflareEmailStrict({
    to: email,
    subject: "Your Paymug customer portal sign-in link",
    text: `Use this secure link to sign in to your customer portal:\n\n${loginUrl}\n\nThis link expires in 15 minutes and can only be used once.`,
    html: layout.html,
  });
}
