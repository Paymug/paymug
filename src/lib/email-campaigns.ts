import "server-only";

import {
  findFeatureRecord,
  listFeatureRecords,
  updateFeatureRecord,
} from "./feature-records";
import { sendCloudflareEmailStrict } from "./cloudflare-email";
import { escapeEmailHtml } from "./transactional-email.utils";
import {
  renderPoweredByFooter,
  renderStoreHeader,
} from "./transactional-email-templates";
import { getRuntimeAbsoluteUrl } from "./runtime-env";
import { getStoreById } from "./stores";
import type { CampaignSendResult } from "./email-campaigns.types";
import type { PayPalMode } from "./types";

export async function sendEmailCampaign(
  userId: string,
  campaignId: string,
  requestUrl: string,
  activeStoreId?: string,
  environment?: PayPalMode
): Promise<CampaignSendResult> {
  const campaign = await findFeatureRecord(campaignId, userId);
  if (
    !campaign ||
    campaign.feature !== "campaigns" ||
    (environment && campaign.environment !== environment)
  ) {
    throw new Error("Campaign not found");
  }
  if (campaign.status === "sent") {
    throw new Error("This campaign has already been sent");
  }

  const storeId = String(campaign.data.storeId || activeStoreId || "");
  const store = storeId
    ? await getStoreById(storeId, userId)
    : undefined;
  if (store && !store.emailCampaignsEnabled) {
    throw new Error("Email campaigns are disabled for this store");
  }

  const subscribers = (await listFeatureRecords(
    userId,
    "subscribers",
    environment
  ))
    .filter((subscriber) => subscriber.status === "subscribed");
  if (subscribers.length === 0) {
    throw new Error("Add at least one active subscriber before sending");
  }

  const content = String(campaign.data.content || "");
  const unsubscribeBaseUrl = await getRuntimeAbsoluteUrl(
    "/unsubscribe",
    requestUrl
  );
  for (const subscriber of subscribers) {
    const unsubscribeUrl = `${unsubscribeBaseUrl}/${userId}/${subscriber.id}`;
    const storeName = store?.name;
    await sendCloudflareEmailStrict(
      {
        to: subscriber.title,
        subject: campaign.title,
        text: `${content}\n\nUnsubscribe: ${unsubscribeUrl}`,
        html: `<!doctype html>
      <html>
        <body style="margin:0;background:#f6f6f8;font-family:Arial,sans-serif;color:#27272f">
          <div style="padding:32px 16px">
            <div style="max-width:560px;margin:0 auto;padding:32px;border:1px solid #e8e8ee;border-radius:16px;background:#ffffff">
              ${storeName ? renderStoreHeader(storeName, store?.logoImageUrl) : ""}
              <div style="font-family:Arial,sans-serif;line-height:1.7;color:#27272f">${escapeEmailHtml(content).replaceAll("\n", "<br>")}</div>
              ${renderPoweredByFooter(`<a href="${escapeEmailHtml(unsubscribeUrl)}" style="color:#9292a3;text-decoration:underline">Unsubscribe</a>`)}
            </div>
          </div>
        </body>
      </html>`,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      },
      {
        name: store?.name,
        replyTo: store?.emailReplyTo || store?.emailFrom,
      }
    );
  }

  const sentAt = new Date().toISOString();
  await updateFeatureRecord(campaign.id, userId, {
    status: "sent",
    data: {
      ...campaign.data,
      recipientCount: subscribers.length,
      sentAt,
    },
  });
  return { recipientCount: subscribers.length, sentAt };
}
