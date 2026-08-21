import "server-only";

import {
  findFeatureRecord,
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
import type {
  CampaignSendResult,
  CampaignTestInput,
} from "./email-campaigns.types";
import type { PayPalMode } from "./types";
import { getEmailCampaignRecipients } from "./email-campaign-recipients";
import {
  addEmailClickTracking,
  replaceEmailCampaignPlaceholders,
  renderEmailCampaignContent,
} from "./email-campaign-content";
import { getDb } from "@/db";
import { campaignDeliveries } from "@/db/schema";
import { uid } from "./utils";

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

  const recipients = await getEmailCampaignRecipients({
    userId,
    storeId,
    environment: environment || campaign.environment,
    campaign,
  });
  if (recipients.length === 0) {
    throw new Error("The selected recipient list is empty");
  }

  const content = String(campaign.data.content || "");
  const subject = String(campaign.data.subject || "").trim();
  const previewText = String(
    campaign.data.previewText || campaign.subtitle || "",
  );
  if (!subject) throw new Error("Add a campaign subject before sending");
  if (!content) throw new Error("Add campaign content before sending");
  const unsubscribeBaseUrl = await getRuntimeAbsoluteUrl(
    "/email-preferences/unsubscribe",
    requestUrl
  );
  const trackingBaseUrl = await getRuntimeAbsoluteUrl(
    "/api/email-campaigns/track",
    requestUrl,
  );
  const db = await getDb();
  for (const recipient of recipients) {
    const receiverName = recipient.name?.trim() || "there";
    const deliveryId = uid();
    const unsubscribeUrl = `${unsubscribeBaseUrl}/${campaign.id}/${deliveryId}`;
    const clickBaseUrl = `${trackingBaseUrl}/click/${deliveryId}`;
    const renderedContent = addEmailClickTracking(
      replaceEmailCampaignPlaceholders(
        renderEmailCampaignContent(content),
        escapeEmailHtml(receiverName),
      ),
      clickBaseUrl,
    );
    const personalizedSubject = replaceEmailCampaignPlaceholders(
      subject,
      receiverName,
    );
    const personalizedPreviewText = replaceEmailCampaignPlaceholders(
      previewText,
      receiverName,
    );
    const personalizedTextContent = replaceEmailCampaignPlaceholders(
      content,
      receiverName,
    );
    const storeName = store?.name;
    const campaignDisclaimer = `You are receiving this email because you subscribed to ${escapeEmailHtml(storeName || "this store")}.<br><a href="${escapeEmailHtml(unsubscribeUrl)}" style="color:#9292a3;text-decoration:underline">Unsubscribe</a>`;
    await db.insert(campaignDeliveries).values({
      id: deliveryId,
      campaignId: campaign.id,
      subscriberId: recipient.subscriberId || null,
      email: recipient.email,
      openedAt: null,
      clickedAt: null,
      createdAt: new Date().toISOString(),
    });
    await sendCloudflareEmailStrict(
      {
        to: recipient.email,
        subject: personalizedSubject,
        text: `${personalizedPreviewText}\n\n${personalizedTextContent}\n\nYou are receiving this email because you subscribed to ${storeName || "this store"}.\nUnsubscribe: ${unsubscribeUrl}`,
        html: `<!doctype html>
      <html>
        <body style="margin:0;background:#f6f6f8;font-family:Arial,sans-serif;color:#27272f">
          <div style="padding:32px 16px">
            <div style="max-width:560px;margin:0 auto;padding:32px;border:1px solid #e8e8ee;border-radius:16px;background:#ffffff">
              ${storeName ? renderStoreHeader(storeName, store?.logoImageUrl) : ""}
              <div style="font-family:Arial,sans-serif;line-height:1.7;color:#27272f">${renderedContent}</div>
              ${renderPoweredByFooter(campaignDisclaimer)}
              <img src="${trackingBaseUrl}/open/${deliveryId}" width="24" height="24" alt="Paymug" style="display:block;margin:16px auto 0;width:24px;height:24px">
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
      recipientCount: recipients.length,
      sentAt,
    },
  });
  return { recipientCount: recipients.length, sentAt };
}

export async function sendEmailCampaignTest(
  userId: string,
  campaignId: string,
  requestUrl: string,
  input: CampaignTestInput,
): Promise<void> {
  const campaign = await findFeatureRecord(campaignId, userId);
  if (!campaign || campaign.feature !== "campaigns") {
    throw new Error("Campaign not found");
  }
  const storeId = String(campaign.data.storeId || "");
  const store = storeId ? await getStoreById(storeId, userId) : undefined;
  const preferencesUrl = await getRuntimeAbsoluteUrl(
    "/customer/account/email-preferences",
    requestUrl,
  );
  const receiverName = "Test recipient";
  const subject = replaceEmailCampaignPlaceholders(
    String(campaign.data.subject || "").trim(),
    receiverName,
  );
  const content = replaceEmailCampaignPlaceholders(
    renderEmailCampaignContent(String(campaign.data.content || "")),
    receiverName,
  );
  const previewText = replaceEmailCampaignPlaceholders(
    String(campaign.data.previewText || campaign.subtitle || subject),
    receiverName,
  );
  if (!subject || !content) throw new Error("Add a subject and content first");
  await sendCloudflareEmailStrict(
    {
      to: input.email,
      subject: `[Test] ${subject}`,
      text: previewText,
      html: `<!doctype html><html><body style="font-family:Arial,sans-serif"><div style="max-width:560px;margin:32px auto">${store ? renderStoreHeader(store.name, store.logoImageUrl) : ""}${content}${renderPoweredByFooter(`You are receiving this test email for ${escapeEmailHtml(store?.name || "this store")}.<br><a href="${escapeEmailHtml(preferencesUrl)}" style="color:#9292a3;text-decoration:underline">Manage Preferences</a>`)}</div></body></html>`,
    },
    { name: store?.name, replyTo: store?.emailReplyTo || store?.emailFrom },
  );
  void requestUrl;
}
