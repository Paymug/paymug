import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getCustomerSession } from "@/lib/customer-auth";
import { formatMoney } from "@/lib/format";
import {
  getInvoiceAccess,
  getInvoiceSummary,
  isInvoicePayable,
} from "@/lib/invoices";
import { PrintButton } from "../PrintButton";
import { CopyPayLinkButton } from "../CopyPayLinkButton";

export const metadata: Metadata = {
  title: "Invoice",
  robots: { index: false, follow: false },
};

const statusClass: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
  refunded: "bg-red-50 text-red-700",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  });
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await getInvoiceAccess(id);
  if (!access) {
    const [user, customer] = await Promise.all([
      getSessionUser(),
      getCustomerSession(),
    ]);
    if (!user && !customer) redirect("/customer/login");
    notFound();
  }
  const { invoice, role, payable } = access;
  const money = (cents: number) => formatMoney(cents, invoice.currency);
  const optionalMoney = (cents?: number) =>
    cents === undefined ? "—" : money(cents);
  const summary = getInvoiceSummary(invoice);
  const backHref = role === "merchant" ? "/dashboard/orders" : "/customer#invoices";

  return (
    <main className="min-h-dvh bg-[#f7f7f8] px-4 py-8 text-[#27272f] print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <a href={backHref} className="text-sm font-medium text-[#696978] hover:underline">
            ← Back to {role === "merchant" ? "orders" : "portal"}
          </a>
          <div className="flex flex-wrap items-center gap-2">
            {payable && (
              <a
                href={`/api/invoices/${encodeURIComponent(invoice.id)}/pay`}
                className="rounded-lg bg-[#ffd84d] px-4 py-2 text-sm font-semibold text-[#2a2a33] transition hover:bg-[#ffcf1f]"
              >
                Pay {money(invoice.total)}
              </a>
            )}
            {role === "merchant" && isInvoicePayable(invoice.status) && (
              <CopyPayLinkButton />
            )}
            <a
              href={`/api/invoices/${encodeURIComponent(invoice.id)}/download`}
              className="rounded-lg border border-[#e0e0e8] bg-white px-4 py-2 text-sm font-semibold text-[#34343e] transition hover:bg-[#f7f7f8]"
            >
              Download
            </a>
            <PrintButton />
          </div>
        </div>

        <article className="rounded-2xl border border-[#e8e8ee] bg-white p-6 sm:p-10 print:rounded-none print:border-0 print:p-0">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.03em]">Invoice</h1>
              <p className="mt-1 text-sm text-[#85859d]">{invoice.number}</p>
            </div>
            <div className="text-right">
              {invoice.storeLogoImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={invoice.storeLogoImageUrl}
                  alt=""
                  className="mb-2 ml-auto h-10 w-auto object-contain"
                />
              )}
              <p className="font-semibold">{invoice.storeName}</p>
              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass[invoice.status] || statusClass.pending}`}
              >
                {invoice.status === "pending" ? "Unpaid" : invoice.status}
              </span>
              {invoice.environment === "sandbox" && (
                <p className="mt-1 text-xs text-[#85859d]">Test mode</p>
              )}
            </div>
          </header>

          <section className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[#9999aa]">Billed to</h2>
              <p className="mt-1 text-sm font-medium">{invoice.customerName}</p>
              <p className="text-sm text-[#696978]">{invoice.customerEmail}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[#9999aa]">Dates</h2>
              <p className="mt-1 text-sm">Issued {formatDate(invoice.issuedAt)}</p>
              {invoice.paidAt && (
                <p className="text-sm text-[#696978]">Paid {formatDate(invoice.paidAt)}</p>
              )}
            </div>
          </section>

          <table className="mt-8 w-full text-sm">
            <thead>
              <tr className="border-b border-[#e8e8ee] text-left text-xs uppercase tracking-wide text-[#9999aa]">
                <th className="py-2 font-semibold">Description</th>
                <th className="py-2 pl-3 text-right font-semibold">Qty</th>
                <th className="py-2 pl-3 text-right font-semibold">Unit price</th>
                <th className="py-2 pl-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index} className="border-b border-[#eeeef2] align-top">
                  <td className="py-3 font-medium">{item.description}</td>
                  <td className="py-3 pl-3 text-right">{item.quantity}</td>
                  <td className="py-3 pl-3 text-right">{optionalMoney(item.unitAmount)}</td>
                  <td className="py-3 pl-3 text-right">{optionalMoney(item.amount)}</td>
                </tr>
              ))}
              {summary.map(([label, value]) => (
                <tr key={label} className="border-b border-[#eeeef2]">
                  <td colSpan={3} className="py-3 text-[#696978]">{label}</td>
                  <td className="py-3 pl-3 text-right">{value}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} className="py-4 text-base font-semibold">
                  {invoice.status === "paid" ? "Total paid" : "Amount due"}
                </td>
                <td className="py-4 pl-3 text-right text-base font-semibold">{money(invoice.total)}</td>
              </tr>
            </tbody>
          </table>

          {invoice.paymentReference && (
            <p className="mt-4 text-xs text-[#85859d]">
              Payment reference: {invoice.paymentReference} ({invoice.gateway})
            </p>
          )}
        </article>
      </div>
    </main>
  );
}
