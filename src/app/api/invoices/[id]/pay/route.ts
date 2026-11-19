import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { findOrderById } from "@/lib/db";
import { getInvoicePayPath, isInvoicePayable } from "@/lib/invoices";
import { getStripeCredentials } from "@/lib/payment-credentials";
import { getRuntimeAbsoluteUrl } from "@/lib/runtime-env";
import { retrieveStripeCheckoutSession } from "@/lib/stripe";

/** Sends the customer to the gateway page that settles an unpaid invoice. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const invoiceUrl = await getRuntimeAbsoluteUrl(`/invoices/${encodeURIComponent(id)}`, request.url);
  const customer = await getCustomerSession();
  const order = await findOrderById(id);
  if (
    !customer ||
    !order ||
    customer.email.trim().toLowerCase() !== order.customerEmail.trim().toLowerCase() ||
    !isInvoicePayable(order.status)
  ) {
    return NextResponse.redirect(invoiceUrl);
  }

  // Reuse the still-open Stripe Checkout session so the same order is paid.
  if (order.gateway === "stripe" && order.stripeCheckoutSessionId) {
    try {
      const credentials = await getStripeCredentials(
        order.userId,
        order.environment,
        order.storeId,
      );
      if (credentials) {
        const session = await retrieveStripeCheckoutSession(
          credentials.secretKey,
          order.stripeCheckoutSessionId,
        );
        if (session.url && session.payment_status !== "paid") {
          return NextResponse.redirect(session.url);
        }
      }
    } catch (error) {
      console.error("invoice pay: stripe session lookup failed", error);
    }
  }

  // Otherwise (expired session, PayPal, SePay…) start a fresh checkout.
  const path = await getInvoicePayPath(order);
  if (!path) return NextResponse.redirect(invoiceUrl);
  const checkoutUrl = new URL(await getRuntimeAbsoluteUrl(path, request.url));
  checkoutUrl.searchParams.set("email", order.customerEmail);
  return NextResponse.redirect(checkoutUrl);
}
