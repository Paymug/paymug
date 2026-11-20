import "server-only";

import { renderProductDescriptionHtml } from "@/components/product-description-renderer.utils";
import { getCustomerSession } from "./customer-auth";
import { getSessionUser } from "./auth";
import { findOrderById, findProductById } from "./db";
import { formatMoney } from "./format";
import { getStoreById } from "./stores";
import type { Order } from "./types";
import type {
  Invoice,
  InvoiceAccess,
  InvoiceViewerRole,
} from "./invoices.types";

export function formatInvoiceNumber(order: Pick<Order, "id" | "createdAt">) {
  const date = order.createdAt.slice(0, 10).replaceAll("-", "");
  return `INV-${date}-${order.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}`;
}

export function isInvoicePayable(status: Order["status"]) {
  return status === "pending" || status === "failed";
}

async function buildInvoice(order: Order): Promise<Invoice> {
  const store = order.storeId
    ? await getStoreById(order.storeId).catch(() => undefined)
    : undefined;
  const subtotal =
    order.productPrice ??
    order.amount + order.discountAmount - order.transactionFeeAmount;
  return {
    id: order.id,
    number: formatInvoiceNumber(order),
    status: order.status,
    issuedAt: order.createdAt,
    paidAt: order.paidAt,
    storeName: store?.name || "Store",
    storeLogoImageUrl: store?.logoImageUrl || undefined,
    customerName: order.customerName || order.customerEmail,
    customerEmail: order.customerEmail,
    productName: order.productName,
    variantName: order.variantName ?? undefined,
    description: order.productDescription || undefined,
    currency: order.currency,
    subtotal,
    discountCode: order.discountCode,
    discountAmount: order.discountAmount,
    transactionFeeAmount: order.transactionFeeAmount,
    total: order.amount,
    gateway: order.gateway,
    environment: order.environment,
    paymentReference:
      order.paypalCaptureId ||
      order.stripePaymentIntentId ||
      order.paypalOrderId ||
      undefined,
  };
}

/**
 * Loads an invoice for the signed-in merchant who owns the order, or the
 * signed-in customer whose email matches it. Returns null otherwise.
 */
export async function getInvoiceAccess(
  orderId: string,
): Promise<InvoiceAccess | null> {
  const order = await findOrderById(orderId);
  if (!order) return null;
  let role: InvoiceViewerRole | undefined;
  const user = await getSessionUser();
  if (user && user.id === order.userId) role = "merchant";
  if (!role) {
    const customer = await getCustomerSession();
    if (
      customer &&
      customer.email.trim().toLowerCase() ===
        order.customerEmail.trim().toLowerCase()
    ) {
      role = "customer";
    }
  }
  if (!role) return null;
  return {
    invoice: await buildInvoice(order),
    role,
    payable: role === "customer" && isInvoicePayable(order.status),
  };
}

/** Where the customer should go to pay an unpaid invoice. */
export async function getInvoicePayPath(order: Order): Promise<string | null> {
  const product = await findProductById(order.productId);
  if (!product) return null;
  const { getProductPublicPath } = await import("./product-paths");
  return getProductPublicPath(product);
}

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** Self-contained HTML document used for the downloadable invoice. */
export function renderInvoiceHtml(invoice: Invoice): string {
  const money = (cents: number) => formatMoney(cents, invoice.currency);
  const date = (value: string) =>
    new Date(value).toLocaleDateString("en-US", { dateStyle: "long" });
  const rows: [string, string][] = [
    ["Subtotal", money(invoice.subtotal)],
    ...(invoice.discountAmount
      ? ([
          [
            `Discount${invoice.discountCode ? ` (${invoice.discountCode})` : ""}`,
            `-${money(invoice.discountAmount)}`,
          ],
        ] as [string, string][])
      : []),
    ...(invoice.transactionFeeAmount
      ? ([["Fees", money(invoice.transactionFeeAmount)]] as [string, string][])
      : []),
  ];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${escapeHtml(invoice.number)}</title>
<style>
body{font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#22222b;max-width:720px;margin:40px auto;padding:0 20px}
h1{font-size:28px;margin:0}.muted{color:#7a7a8c}.top{display:flex;justify-content:space-between;gap:24px;align-items:flex-start}
.badge{display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:600;text-transform:capitalize;background:#fef3c7;color:#92400e}
.badge.paid{background:#d1fae5;color:#065f46}.badge.failed,.badge.refunded{background:#fee2e2;color:#991b1b}
table{width:100%;border-collapse:collapse;margin-top:28px}th,td{text-align:left;padding:10px 0;border-bottom:1px solid #e8e8ee}
td.r,th.r{text-align:right}.total td{font-weight:700;font-size:16px;border-bottom:0}
.desc p{margin:4px 0}.desc h2,.desc h3,.desc h4,.desc h5{font-size:14px;margin:8px 0 2px}.desc ul,.desc ol{margin:4px 0;padding-left:20px}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:32px}
</style></head><body>
<div class="top"><div><h1>Invoice</h1><div class="muted">${escapeHtml(invoice.number)}</div></div>
<div style="text-align:right"><strong>${escapeHtml(invoice.storeName)}</strong><br><span class="badge ${escapeHtml(invoice.status)}">${escapeHtml(invoice.status)}</span></div></div>
<div class="meta"><div><div class="muted">Billed to</div>${escapeHtml(invoice.customerName)}<br>${escapeHtml(invoice.customerEmail)}</div>
<div><div class="muted">Issued</div>${date(invoice.issuedAt)}${invoice.paidAt ? `<div class="muted" style="margin-top:8px">Paid</div>${date(invoice.paidAt)}` : ""}</div></div>
<table><thead><tr><th>Description</th><th class="r">Amount</th></tr></thead><tbody>
<tr><td>${escapeHtml(invoice.productName)}${invoice.variantName ? ` — ${escapeHtml(invoice.variantName)}` : ""}${invoice.description ? `<div class="muted desc">${renderProductDescriptionHtml(invoice.description)}</div>` : ""}</td><td class="r">${money(invoice.subtotal)}</td></tr>
${rows.slice(1).map(([label, value]) => `<tr><td class="muted">${escapeHtml(label)}</td><td class="r">${escapeHtml(value)}</td></tr>`).join("\n")}
<tr class="total"><td>${invoice.status === "paid" ? "Total paid" : "Amount due"}</td><td class="r">${money(invoice.total)}</td></tr>
</tbody></table>
${invoice.paymentReference ? `<p class="muted">Payment reference: ${escapeHtml(invoice.paymentReference)} (${escapeHtml(invoice.gateway)})</p>` : ""}
</body></html>`;
}
