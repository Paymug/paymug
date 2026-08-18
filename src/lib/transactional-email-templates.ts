import { formatMoney } from "./format";
import { getProductDescriptionPlainText } from "@/components/product-description.utils";
import {
  escapeEmailHtml,
  formatEmailDate,
  humanizeSubscriptionStatus,
} from "./transactional-email.utils";
import type {
  EmailLayoutInput,
  OrderPaymentFailedEmailInput,
  PurchaseConfirmationEmailInput,
  SubscriptionApprovalEmailInput,
  SubscriptionStatusEmailInput,
  TransactionalEmailContent,
} from "./transactional-email.types";
import { getLicenseEntitlementSummary } from "./license-entitlements";

const paymugMark =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSI+CiAgPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzE0MTIwYiIvPgogIDxjaXJjbGUgY3g9IjE2IiBjeT0iMTYiIHI9IjkiIGZpbGw9IiNmNWM1MTgiLz4KICA8cGF0aCBkPSJNMTYgOGMuOCAxLjYgMi40IDIuNSA0LjIgMy4xQzE5LjIgMTQgMTcuOCAxNi40IDE2IDE5LjIgMTQuMiAxNi40IDEyLjggMTQgMTEuOCAxMS4xIDEzLjYgMTAuNSAxNS4yIDkuNiAxNiA4eiIgZmlsbD0iIzE0MTIwYiIgb3BhY2l0eT0iLjE1Ii8+Cjwvc3ZnPgo=";

export function renderStoreHeader(storeName: string, storeLogo?: string) {
  const logo = storeLogo
    ? `<img src="${escapeEmailHtml(storeLogo)}" alt="" width="28" height="28" style="display:block;width:28px;height:28px;border-radius:8px;object-fit:cover">`
    : "";
  return `
    <table role="presentation" style="width:100%;margin:0 0 22px;border-collapse:collapse">
      <tr>
        ${logo ? `<td style="width:28px;padding:0;vertical-align:middle">${logo}</td>` : ""}
        <td style="padding:0;vertical-align:middle;${logo ? "padding-left:10px" : ""}">
          <p style="margin:0;font-size:18px;font-weight:800">${escapeEmailHtml(storeName)}</p>
        </td>
      </tr>
    </table>`;
}

export function renderPoweredByFooter(footer: string) {
  return `
    <table role="presentation" style="width:100%;margin:28px 0 0;border-collapse:collapse;border-top:1px solid #eeeeF2">
      <tr>
        <td style="padding:18px 0 0;color:#9292a3;font-size:12px;line-height:1.6">
          <p style="margin:0 0 14px">${footer}</p>
          <table role="presentation" style="border-collapse:collapse">
            <tr>
              <td style="padding:0;vertical-align:middle">
                <img src="${paymugMark}" alt="" width="16" height="16" style="display:block;width:16px;height:16px;border-radius:4px">
              </td>
              <td style="padding:0 0 0 6px;vertical-align:middle">
                <span style="font-size:11px;font-weight:700;color:#27272f">Powered by Paymug</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

export function renderEmailLayout(input: EmailLayoutInput) {
  const rows = (input.rows || [])
    .map(
      (row) => `
        <tr>
          <td style="padding:8px 0;color:#74748f;font-size:14px">${escapeEmailHtml(row.label)}</td>
          <td style="padding:8px 0;color:#27272f;font-size:14px;font-weight:600;text-align:right">${escapeEmailHtml(row.value)}</td>
        </tr>`
    )
    .join("");
  const textRows = (input.rows || [])
    .map((row) => `${row.label}: ${row.value}`)
    .join("\n");
  const detail = input.detail
    ? `
      <div style="margin:24px 0;padding:18px;border:1px solid #f2d991;border-radius:12px;background:#fff6d1">
        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#27272f">${escapeEmailHtml(input.detailTitle || "Details")}</p>
        <p style="margin:0;white-space:pre-wrap;font-size:14px;line-height:1.6;color:#454552">${escapeEmailHtml(input.detail)}</p>
      </div>`
    : "";
  const action =
    input.actionLabel && input.actionUrl
      ? `
        <p style="margin:28px 0">
          <a href="${escapeEmailHtml(input.actionUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#f5c518;color:#14120b;font-size:14px;font-weight:700;text-decoration:none">${escapeEmailHtml(input.actionLabel)}</a>
        </p>`
      : "";
  const footerText = escapeEmailHtml(
    input.footer || `This transactional email was sent by ${input.storeName}.`
  );

  return {
    html: `<!doctype html>
      <html>
        <body style="margin:0;background:#f6f6f8;font-family:Arial,sans-serif;color:#27272f">
          <div style="display:none;max-height:0;overflow:hidden">${escapeEmailHtml(input.intro)}</div>
          <div style="padding:32px 16px">
            <div style="max-width:560px;margin:0 auto;padding:32px;border:1px solid #e8e8ee;border-radius:16px;background:#ffffff">
              ${renderStoreHeader(input.storeName, input.storeLogo)}
              ${input.eyebrow ? `<p style="margin:0 0 8px;color:#e0b200;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">${escapeEmailHtml(input.eyebrow)}</p>` : ""}
              <h1 style="margin:0;font-size:26px;line-height:1.25">${escapeEmailHtml(input.title)}</h1>
              <p style="margin:14px 0 0;color:#5f5f72;font-size:15px;line-height:1.7">${escapeEmailHtml(input.intro)}</p>
              ${rows ? `<table style="width:100%;margin-top:22px;border-collapse:collapse">${rows}</table>` : ""}
              ${detail}
              ${action}
              ${renderPoweredByFooter(footerText)}
            </div>
          </div>
        </body>
      </html>`,
    text: `${input.storeName}\n\n${input.title}\n\n${input.intro}${textRows ? `\n\n${textRows}` : ""}${input.detail ? `\n\n${input.detailTitle || "Details"}:\n${input.detail}` : ""}${input.actionUrl ? `\n\n${input.actionLabel}: ${input.actionUrl}` : ""}\n\n${input.footer || `This transactional email was sent by ${input.storeName}.`}`,
  };
}

export function buildPurchaseConfirmationEmail(
  input: PurchaseConfirmationEmailInput,
  storeName: string,
  receiptUrl: string
): TransactionalEmailContent {
  const free = input.order.gateway === "free";
  const licenseKey = input.license?.title || input.licenseKey;
  const licenseEntitlement = input.license
    ? getLicenseEntitlementSummary(input.license)
    : undefined;
  const delivery = [
    input.deliveryContent
      ? getProductDescriptionPlainText(input.deliveryContent)
      : undefined,
    licenseKey ? `License key: ${licenseKey}` : undefined,
    licenseEntitlement?.perpetual
      ? `Perpetual license: lifetime use. Updates included${licenseEntitlement.updatesExpireAt ? ` through ${formatEmailDate(licenseEntitlement.updatesExpireAt)}` : ""}.`
      : undefined,
  ]
    .filter(Boolean)
    .join("\n\n");
  const layout = renderEmailLayout({
    storeName,
    storeLogo: input.storeLogo,
    eyebrow: free ? "Access activated" : "Purchase complete",
    title: free
      ? `${input.order.productName} is ready`
      : `Thanks for purchasing ${input.order.productName}`,
    intro:
      free
        ? "Your access is active and no payment was required. Use the delivery details below to access your product."
        : "Your payment is complete. Keep this email as your receipt and use the delivery details below to access your purchase.",
    rows: [
      {
        label: "Amount",
        value: free
          ? "Free"
          : formatMoney(input.order.amount, input.order.currency),
      },
      { label: "Order ID", value: input.order.id },
      {
        label: free ? "Activated" : "Paid",
        value: formatEmailDate(input.order.paidAt),
      },
    ],
    ...(delivery
      ? {
          detailTitle: "Your delivery",
          detail: delivery,
        }
      : {}),
    actionLabel: "View purchase",
    actionUrl: receiptUrl,
  });
  return {
    to: input.order.customerEmail,
    subject: `Your ${storeName} purchase is complete`,
    ...layout,
  };
}

export function buildOrderPaymentFailedEmail(
  input: OrderPaymentFailedEmailInput,
  storeName: string,
  retryUrl: string
): TransactionalEmailContent {
  const layout = renderEmailLayout({
    storeName,
    storeLogo: input.storeLogo,
    eyebrow: "Payment issue",
    title: "Your payment did not complete",
    intro: `We could not complete your payment for ${input.order.productName}. You have not received a purchase confirmation. Please try again or use another PayPal payment method.`,
    rows: [
      {
        label: "Attempted amount",
        value: formatMoney(input.order.amount, input.order.currency),
      },
      { label: "Order ID", value: input.order.id },
    ],
    actionLabel: "Try payment again",
    actionUrl: retryUrl,
  });
  return {
    to: input.order.customerEmail,
    subject: `Payment issue for ${input.order.productName}`,
    ...layout,
  };
}

export function buildSubscriptionApprovalEmail(
  input: SubscriptionApprovalEmailInput,
  storeName: string
): TransactionalEmailContent {
  const amount = Math.round(Number(input.subscription.data.amount || 0) * 100);
  const introductoryAmount = Math.round(
    Number(input.subscription.data.introductoryAmount || 0) * 100
  );
  const discountPeriods = Number(input.subscription.data.discountPeriods || 0);
  const currency = String(input.subscription.data.currency || "USD");
  const interval =
    input.subscription.data.interval === "yearly" ? "year" : "month";
  const trialDays = Number(input.subscription.data.trialDays || 0);
  const layout = renderEmailLayout({
    storeName,
    storeLogo: input.storeLogo,
    eyebrow: "Subscription invitation",
    title: `Complete your ${input.subscription.title} subscription`,
    intro:
      trialDays > 0
        ? `Your subscription includes a ${trialDays}-day free trial. Review the details and approve it securely with PayPal.`
        : "Your recurring subscription is ready. Review the details and approve it securely with PayPal.",
    rows: [
      { label: "Plan", value: input.subscription.title },
      ...(discountPeriods > 0
        ? [
            {
              label: "Introductory price",
              value: `${formatMoney(introductoryAmount, currency)} / ${interval} for the first ${discountPeriods} ${discountPeriods === 1 ? "period" : "periods"}`,
            },
            {
              label: "Then",
              value: `${formatMoney(amount, currency)} / ${interval}`,
            },
          ]
        : [
            {
              label: "Price",
              value: `${formatMoney(amount, currency)} / ${interval}`,
            },
          ]),
      ...(trialDays > 0
        ? [
            {
              label: "Free trial",
              value: `${trialDays} day${trialDays === 1 ? "" : "s"}`,
            },
          ]
        : []),
    ],
    actionLabel: "Approve with PayPal",
    actionUrl: String(input.subscription.data.approvalUrl || ""),
    footer:
      trialDays > 0
        ? "You will not be charged until the free trial ends. PayPal will then begin the recurring billing schedule you approve."
        : "You will not be charged by this subscription until you approve it with PayPal.",
  });
  return {
    to: input.subscription.subtitle || "",
    subject: `Approve your ${storeName} subscription`,
    ...layout,
  };
}

export function buildSubscriptionStatusEmail(
  input: SubscriptionStatusEmailInput,
  storeName: string
): TransactionalEmailContent {
  const status = humanizeSubscriptionStatus(input.status);
  const content: Record<
    string,
    { eyebrow: string; title: string; intro: string }
  > = {
    trialing: {
      eyebrow: "Free trial started",
      title: `${input.subscription.title} trial is active`,
      intro:
        "PayPal confirmed your subscription. Recurring billing will begin after your free trial ends.",
    },
    active: {
      eyebrow: "Subscription active",
      title: `${input.subscription.title} is active`,
      intro:
        "PayPal confirmed your subscription. Future payments will follow the billing schedule you approved.",
    },
    cancelled: {
      eyebrow: "Subscription cancelled",
      title: `${input.subscription.title} was cancelled`,
      intro:
        "Your subscription has been cancelled and no future renewal payments will be collected.",
    },
    suspended: {
      eyebrow: "Subscription suspended",
      title: `${input.subscription.title} is suspended`,
      intro:
        "Recurring billing has been suspended. Contact the seller if you want to restore the subscription.",
    },
    expired: {
      eyebrow: "Subscription ended",
      title: `${input.subscription.title} has expired`,
      intro:
        "This subscription has ended and will not renew again.",
    },
  };
  const copy = content[status] || {
    eyebrow: "Subscription update",
    title: `${input.subscription.title} was updated`,
    intro: `Your subscription status is now ${status}.`,
  };
  const trialEndsAt =
    typeof input.subscription.data.trialEndsAt === "string"
      ? input.subscription.data.trialEndsAt
      : undefined;
  const layout = renderEmailLayout({
    storeName,
    storeLogo: input.storeLogo,
    ...copy,
    rows: [
      { label: "Plan", value: input.subscription.title },
      { label: "Status", value: status },
      ...(input.status === "trialing" && trialEndsAt
        ? [
            {
              label: "Trial ends",
              value: new Date(trialEndsAt).toLocaleDateString(),
            },
          ]
        : []),
    ],
  });
  return {
    to: input.subscription.subtitle || "",
    subject: `${input.subscription.title}: ${status}`,
    ...layout,
  };
}

export function buildSubscriptionRenewalEmail(
  subscription: SubscriptionStatusEmailInput["subscription"],
  storeName: string,
  amount: number,
  currency: string,
  renewedAt?: string,
  storeLogo?: string,
): TransactionalEmailContent {
  const layout = renderEmailLayout({
    storeName,
    storeLogo,
    eyebrow: "Subscription renewed",
    title: `${subscription.title} renewed successfully`,
    intro:
      "PayPal completed your scheduled renewal payment. Keep this email as your receipt.",
    rows: [
      { label: "Plan", value: subscription.title },
      {
        label: "Amount",
        value: formatMoney(Math.round(amount * 100), currency),
      },
      { label: "Renewed", value: formatEmailDate(renewedAt) },
    ],
  });
  return {
    to: subscription.subtitle || "",
    subject: `${subscription.title} renewal receipt`,
    ...layout,
  };
}

export function buildSubscriptionPaymentIssueEmail(
  subscription: SubscriptionStatusEmailInput["subscription"],
  storeName: string,
  kind: "failed" | "refunded" | "reversed",
  storeLogo?: string,
): TransactionalEmailContent {
  const content = {
    failed: {
      eyebrow: "Renewal payment failed",
      title: `We could not renew ${subscription.title}`,
      intro:
        "PayPal could not complete the scheduled payment. Update your payment method in PayPal or contact the seller to prevent interruption.",
    },
    refunded: {
      eyebrow: "Payment refunded",
      title: `${subscription.title} payment refunded`,
      intro:
        "A subscription payment was refunded. Contact the seller if you have questions about access or future billing.",
    },
    reversed: {
      eyebrow: "Payment reversed",
      title: `${subscription.title} payment reversed`,
      intro:
        "PayPal reversed a subscription payment. Contact the seller if you have questions about your subscription.",
    },
  }[kind];
  const layout = renderEmailLayout({
    storeName,
    storeLogo,
    ...content,
    rows: [{ label: "Plan", value: subscription.title }],
  });
  return {
    to: subscription.subtitle || "",
    subject: content.title,
    ...layout,
  };
}
