import type {
  CheckoutReminderProcessingResult,
  WorkerCheckoutReminderRow,
} from "./checkout-reminders.types";
import { workerHasProFeature } from "./app-license";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseSender(value: string) {
  const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return match
    ? { name: match[1].trim(), email: match[2].trim() }
    : value.trim();
}

export async function processCheckoutReminders(
  env: CloudflareEnv,
  now = new Date(),
): Promise<CheckoutReminderProcessingResult> {
  const result = { sent: 0, cancelled: 0, failed: 0 };
  if (!(await workerHasProFeature(env.DB, "automations", now))) return result;
  const reminders = await env.DB.prepare(
    "SELECT cr.id, cr.store_id, cr.product_id, cr.customer_email, cr.customer_name, cr.product_name, cr.checkout_url, cr.created_at, s.name AS store_name, s.email_from AS store_email_from, s.email_reply_to AS store_email_reply_to, EXISTS (SELECT 1 FROM orders o WHERE o.store_id = cr.store_id AND o.product_id = cr.product_id AND lower(o.customer_email) = lower(cr.customer_email) AND o.status = 'paid' AND o.created_at >= cr.created_at) AS has_paid_order FROM checkout_reminders cr JOIN stores s ON s.id = cr.store_id WHERE cr.due_at <= ? AND cr.sent_at IS NULL AND cr.cancelled_at IS NULL AND s.abandoned_checkout_reminders_enabled = 1 ORDER BY cr.due_at ASC LIMIT 100",
  )
    .bind(now.toISOString())
    .all<WorkerCheckoutReminderRow>();
  const configuredFrom = env.EMAIL_FROM;
  if (!configuredFrom) return { ...result, failed: reminders.results.length };

  for (const reminder of reminders.results) {
    if (reminder.has_paid_order) {
      await env.DB.prepare(
        "UPDATE checkout_reminders SET cancelled_at = ?, updated_at = ? WHERE id = ?",
      )
        .bind(now.toISOString(), now.toISOString(), reminder.id)
        .run();
      result.cancelled += 1;
      continue;
    }
    const customerName = reminder.customer_name?.trim() || "there";
    const subject = `Still interested in ${reminder.product_name}?`;
    const text = `Hi ${customerName},\n\nYou recently viewed ${reminder.product_name} from ${reminder.store_name}. You can continue your checkout here:\n\n${reminder.checkout_url}\n\nIf you already purchased it, you can ignore this message.`;
    const html = `<p>Hi ${escapeHtml(customerName)},</p><p>You recently viewed <strong>${escapeHtml(reminder.product_name)}</strong> from ${escapeHtml(reminder.store_name)}.</p><p><a href="${escapeHtml(reminder.checkout_url)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#f5c518;color:#14120b;font-weight:700;text-decoration:none">Continue checkout</a></p><p style="color:#6b6560">If you already purchased it, you can ignore this message.</p>`;
    try {
      await env.EMAIL.send({
        to: reminder.customer_email,
        from: parseSender(configuredFrom),
        ...(reminder.store_email_reply_to || reminder.store_email_from
          ? {
              replyTo:
                reminder.store_email_reply_to || reminder.store_email_from!,
            }
          : {}),
        subject,
        html,
        text,
      });
      await env.DB.prepare(
        "UPDATE checkout_reminders SET sent_at = ?, updated_at = ? WHERE id = ?",
      )
        .bind(now.toISOString(), now.toISOString(), reminder.id)
        .run();
      result.sent += 1;
    } catch (error) {
      console.error("Abandoned checkout reminder failed", reminder.id, error);
      result.failed += 1;
    }
  }
  return result;
}
