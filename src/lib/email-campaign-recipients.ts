import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { listFeatureRecords } from "./feature-records";
import {
  filterRecipientsByEmailPreferences,
  normalizeCustomerEmailPreferenceCategory,
} from "./customer-email-preferences";
import type {
  CampaignRecipient,
  CampaignRecipientContext,
  CampaignRecipientPreview,
} from "./email-campaign-recipients.types";

async function getCustomSubscriberRecipients(
  context: CampaignRecipientContext,
): Promise<CampaignRecipient[]> {
  const subscribers = await listFeatureRecords(
    context.userId,
    "subscribers",
    context.environment,
  );
  const recipients = new Map<string, CampaignRecipient>();
  for (const subscriber of subscribers) {
    if (
      subscriber.status !== "subscribed" ||
      (subscriber.data.storeId &&
        String(subscriber.data.storeId) !== context.storeId)
    ) {
      continue;
    }
    const email = subscriber.title.trim().toLowerCase();
    if (!email || recipients.has(email)) continue;
    recipients.set(email, {
      email,
      name: subscriber.subtitle,
      subscriberId: subscriber.id,
    });
  }
  return [...recipients.values()];
}

async function getPaidCustomerRows(
  context: CampaignRecipientContext,
  productId?: string,
) {
  const db = await getDb();
  return db.query.orders.findMany({
    columns: {
      customerEmail: true,
      customerName: true,
      productId: true,
    },
    where: and(
      eq(orders.userId, context.userId),
      eq(orders.storeId, context.storeId),
      eq(orders.environment, context.environment),
      eq(orders.status, "paid"),
      ...(productId ? [eq(orders.productId, productId)] : []),
    ),
  });
}

function mapCustomerRecipients(
  rows: Awaited<ReturnType<typeof getPaidCustomerRows>>,
  productId?: string,
): CampaignRecipient[] {
  const recipients = new Map<string, CampaignRecipient>();
  for (const row of rows) {
    if (productId && row.productId !== productId) continue;
    const email = row.customerEmail.trim().toLowerCase();
    if (!email || recipients.has(email)) continue;
    recipients.set(email, {
      email,
      name: row.customerName || undefined,
    });
  }
  return [...recipients.values()];
}

export async function getEmailCampaignRecipients(
  context: CampaignRecipientContext,
): Promise<CampaignRecipient[]> {
  const recipientType = String(
    context.campaign.data.recipientType || "all_customers",
  );
  if (recipientType === "custom") {
    return filterRecipientsByEmailPreferences(
      await getCustomSubscriberRecipients(context),
      context.storeId,
      normalizeCustomerEmailPreferenceCategory(context.campaign.data.emailType),
    );
  }

  const productId = recipientType.startsWith("product:")
    ? recipientType.slice("product:".length)
    : undefined;
  const rows = await getPaidCustomerRows(context, productId);
  return filterRecipientsByEmailPreferences(
    mapCustomerRecipients(rows, productId),
    context.storeId,
    normalizeCustomerEmailPreferenceCategory(context.campaign.data.emailType),
  );
}

export async function getEmailCampaignRecipientPreview(
  context: CampaignRecipientContext,
): Promise<CampaignRecipientPreview> {
  const [customerRows, customRecipients] = await Promise.all([
    getPaidCustomerRows(context),
    getCustomSubscriberRecipients(context),
  ]);
  const allCustomers = mapCustomerRecipients(customerRows);
  const productRecipients = new Map<string, Map<string, CampaignRecipient>>();
  for (const row of customerRows) {
    const email = row.customerEmail.trim().toLowerCase();
    if (!email || !row.productId) continue;
    const recipients = productRecipients.get(row.productId) || new Map();
    if (!recipients.has(email)) {
      recipients.set(email, {
        email,
        name: row.customerName || undefined,
      });
    }
    productRecipients.set(row.productId, recipients);
  }
  const allowedRecipients = await filterRecipientsByEmailPreferences(
    [...allCustomers, ...customRecipients],
    context.storeId,
    normalizeCustomerEmailPreferenceCategory(context.campaign.data.emailType),
  );
  const allowedEmails = new Set(
    allowedRecipients.map((recipient) => recipient.email),
  );
  const filteredAllCustomers = allCustomers.filter((recipient) =>
    allowedEmails.has(recipient.email),
  );
  const filteredCustomRecipients = customRecipients.filter((recipient) =>
    allowedEmails.has(recipient.email),
  );
  const counts: Record<string, number> = {
    all_customers: filteredAllCustomers.length,
    custom: filteredCustomRecipients.length,
  };
  for (const [productId, recipients] of productRecipients) {
    counts[`product:${productId}`] = [...recipients.values()].filter(
      (recipient) => allowedEmails.has(recipient.email),
    ).length;
  }

  const recipientType = String(
    context.campaign.data.recipientType || "all_customers",
  );
  const productId = recipientType.startsWith("product:")
    ? recipientType.slice("product:".length)
    : undefined;
  const recipients =
    recipientType === "custom"
      ? filteredCustomRecipients
      : productId
        ? [...(productRecipients.get(productId)?.values() || [])].filter(
            (recipient) => allowedEmails.has(recipient.email),
          )
        : filteredAllCustomers;

  return { recipients, counts };
}
