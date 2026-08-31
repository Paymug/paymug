import "server-only";

import { getDb } from "@/db";
import { checkoutReminders } from "@/db/schema";
import { hasProFeature } from "./app-license";
import { getRuntimeAbsoluteUrl } from "./runtime-env";
import { getStoreById } from "./stores";
import { uid } from "./utils";
import { getProductPublicPath } from "./product-paths";
import type { ScheduleCheckoutReminderInput } from "./checkout-reminders.types";
import { appendCheckoutCustomData } from "./checkout-custom-data";

const reminderDelayMs = 60 * 60 * 1000;

export async function scheduleCheckoutReminder(
  input: ScheduleCheckoutReminderInput,
): Promise<void> {
  const [store, proEnabled] = await Promise.all([
    getStoreById(input.storeId, input.userId),
    hasProFeature("automations"),
  ]);
  if (!store?.abandonedCheckoutRemindersEnabled || !proEnabled) return;
  const db = await getDb();
  const now = new Date();
  const checkoutPath = getProductPublicPath({
    id: input.productId,
    slug: input.productSlug,
  });
  const checkoutParams = new URLSearchParams();
  if (input.customAmount) checkoutParams.set("amount", input.customAmount);
  appendCheckoutCustomData(checkoutParams, input.custom);
  const checkoutQuery = checkoutParams.toString();
  const checkoutUrl = checkoutQuery
    ? `${checkoutPath}?${checkoutQuery}`
    : checkoutPath;
  const values = {
    id: uid(),
    userId: input.userId,
    storeId: input.storeId,
    productId: input.productId,
    environment: input.environment,
    customerEmail: input.customerEmail.trim().toLowerCase(),
    customerName: input.customerName?.trim() || null,
    productName: input.productName,
    checkoutUrl: await getRuntimeAbsoluteUrl(
      checkoutUrl,
      input.requestUrl,
    ),
    dueAt: new Date(now.getTime() + reminderDelayMs).toISOString(),
    sentAt: null,
    cancelledAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  } as const;
  await db
    .insert(checkoutReminders)
    .values(values)
    .onConflictDoUpdate({
      target: [
        checkoutReminders.storeId,
        checkoutReminders.productId,
        checkoutReminders.environment,
        checkoutReminders.customerEmail,
      ],
      set: {
        customerName: values.customerName,
        productName: values.productName,
        checkoutUrl: values.checkoutUrl,
        dueAt: values.dueAt,
        updatedAt: values.updatedAt,
      },
    });
}
