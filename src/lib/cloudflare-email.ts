import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  getEmailDisplayName,
  stripEmailDisplayName,
} from "./transactional-email.utils";
import type {
  EmailSenderOptions,
  TransactionalEmailContent,
} from "./transactional-email.types";

export async function sendCloudflareEmailStrict(
  content: TransactionalEmailContent,
  sender?: EmailSenderOptions
) {
  const { env } = await getCloudflareContext({ async: true });
  const configuredFrom = env.EMAIL_FROM || process.env.EMAIL_FROM;
  if (!env.EMAIL || !configuredFrom) {
    throw new Error(
      "Cloudflare email is not configured. Add EMAIL and EMAIL_FROM."
    );
  }

  const fromEmail = stripEmailDisplayName(configuredFrom);
  const fromName = getEmailDisplayName(configuredFrom);
  const senderName = sender?.name || fromName;
  const replyTo =
    sender?.replyTo ||
    env.EMAIL_REPLY_TO ||
    process.env.EMAIL_REPLY_TO ||
    configuredFrom;
  await env.EMAIL.send({
    to: content.to,
    from: senderName
      ? { name: senderName, email: fromEmail }
      : fromEmail,
    ...(replyTo ? { replyTo } : {}),
    ...(content.headers ? { headers: content.headers } : {}),
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
  return true;
}

export async function sendCloudflareEmail(
  content: TransactionalEmailContent,
  sender?: EmailSenderOptions
) {
  try {
    await sendCloudflareEmailStrict(content, sender);
    return true;
  } catch (error) {
    console.error("Cloudflare transactional email failed", error);
    return false;
  }
}
