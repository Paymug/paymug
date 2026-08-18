import { formatMoney } from "./format";
import { renderEmailLayout } from "./transactional-email-templates";
import { formatEmailDate } from "./transactional-email.utils";
import type {
  StoreAffiliateRegisteredEmailInput,
  StoreOrderPaymentEmailInput,
  StoreSubscriptionPaymentEmailInput,
} from "./store-notification-emails.types";
import type { TransactionalEmailContent } from "./transactional-email.types";

export function buildStoreOrderPaymentEmail(
  input: StoreOrderPaymentEmailInput,
  storeName: string,
  recipient: string,
  storeLogo?: string,
): TransactionalEmailContent {
  const { order } = input;
  const free = order.gateway === "free";
  const layout = renderEmailLayout({
    storeName,
    storeLogo,
    eyebrow: free ? "Order completed" : "Payment received",
    title: free ? "New free order completed" : "New order payment received",
    intro: free
      ? `${order.customerName || order.customerEmail} completed a free checkout for ${order.productName}. No payment was required.`
      : `${order.customerName || order.customerEmail} completed a payment for ${order.productName}.`,
    rows: [
      { label: "Amount", value: formatMoney(order.amount, order.currency) },
      { label: "Product", value: order.productName },
      {
        label: "Customer",
        value: order.customerName || order.customerEmail,
      },
      { label: "Order ID", value: order.id },
      {
        label: free ? "Completed" : "Paid",
        value: formatEmailDate(order.paidAt),
      },
    ],
    footer: `This store notification was sent by ${storeName}.`,
  });
  return {
    to: recipient,
    subject: free
      ? `${storeName}: New free order completed`
      : `${storeName}: New order payment received`,
    ...layout,
  };
}

export function buildStoreSubscriptionPaymentEmail(
  input: StoreSubscriptionPaymentEmailInput,
  storeName: string,
  recipient: string,
  storeLogo?: string,
): TransactionalEmailContent {
  const amount = Math.round(
    Number(input.event.resource?.amount?.total || 0) * 100,
  );
  const currency = input.event.resource?.amount?.currency || "USD";
  const title = input.isRenewal
    ? "Subscription renewal payment received"
    : "New subscription payment received";
  const layout = renderEmailLayout({
    storeName,
    storeLogo,
    eyebrow: input.isRenewal ? "Subscription renewed" : "New subscription",
    title,
    intro: `${input.subscription.subtitle || "A customer"} paid for ${input.subscription.title}.`,
    rows: [
      { label: "Amount", value: formatMoney(amount, currency) },
      { label: "Subscription", value: input.subscription.title },
      {
        label: "Customer",
        value: input.subscription.subtitle || "Not provided",
      },
      { label: "Received", value: formatEmailDate(input.event.create_time) },
    ],
    footer: `This store notification was sent by ${storeName}.`,
  });
  return {
    to: recipient,
    subject: `${storeName}: ${title}`,
    ...layout,
  };
}

export function buildStoreAffiliateRegisteredEmail(
  input: StoreAffiliateRegisteredEmailInput,
  storeName: string,
  recipient: string,
  storeLogo?: string,
): TransactionalEmailContent {
  const layout = renderEmailLayout({
    storeName,
    storeLogo,
    eyebrow: "Affiliate application",
    title: "New affiliate application received",
    intro: `${input.affiliate.title} applied to your affiliate program.`,
    rows: [
      { label: "Name", value: input.affiliate.title },
      {
        label: "Email",
        value: input.affiliate.subtitle || "Not provided",
      },
      { label: "Status", value: input.affiliate.status },
      {
        label: "Registered",
        value: formatEmailDate(input.affiliate.createdAt),
      },
    ],
    footer: `This store notification was sent by ${storeName}.`,
  });
  return {
    to: recipient,
    subject: `${storeName}: New affiliate application`,
    ...layout,
  };
}
