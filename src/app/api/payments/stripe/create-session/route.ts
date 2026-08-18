import { cookies } from "next/headers";
import { z } from "zod";
import {
  findAffiliateByCode,
  resolveDiscount,
  subscribeCheckoutCustomer,
} from "@/lib/commerce-features";
import {
  createOrder,
  findProductById,
  updateOrder,
} from "@/lib/db";
import { getStripeCredentials } from "@/lib/payment-credentials";
import { notifyInvoiceCreated } from "@/lib/notification-events";
import {
  getProductBillingCadence,
  isSubscriptionProduct,
  toStripeIntervalUnit,
} from "@/lib/product-billing";
import { calculateCheckoutPricing } from "@/lib/product-pricing";
import { getRuntimeAbsoluteUrl } from "@/lib/runtime-env";
import { createStripeCheckoutSession } from "@/lib/stripe";
import { jsonError, uid } from "@/lib/utils";
import { getStoreById } from "@/lib/stores";
import { affiliateCookieMatchesStore } from "@/lib/affiliate-settings.utils";

const schema = z.object({
  productId: z.string().min(1),
  customerEmail: z.string().email(),
  customerName: z.string().max(120).optional(),
  discountCode: z.string().max(60).optional(),
  affiliateCode: z.string().max(80).optional(),
  marketingOptIn: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "Invalid input");
    }
    const product = await findProductById(parsed.data.productId);
    if (!product || product.status !== "published") {
      return jsonError("Product not available", 404);
    }
    const store = await getStoreById(product.storeId, product.userId);
    if (store?.paymentGateway !== "stripe") {
      return jsonError("Stripe is not enabled for this store", 409);
    }
    const connection = await getStripeCredentials(
      product.userId,
      product.environment,
      product.storeId
    );
    if (!connection) {
      return jsonError("Seller has not configured Stripe yet", 400);
    }
    const discount = await resolveDiscount(
      product.userId,
      parsed.data.discountCode,
      product.price,
      product.id,
      product.storeId,
      product.environment
    );
    const cookieJar = await cookies();
    const affiliateCookie = cookieJar.get("paymug_affiliate")?.value.split(":");
    const affiliateCode =
      affiliateCookieMatchesStore(
        affiliateCookie?.[0],
        product.userId,
        product.storeId
      )
        ? affiliateCookie?.[1]
        : undefined;
    const affiliate = await findAffiliateByCode(
      product.userId,
      parsed.data.affiliateCode || affiliateCode,
      product.storeId,
      product.environment
    );
    const pricing = calculateCheckoutPricing(product, discount?.amount);
    const fullPricing = calculateCheckoutPricing(product);
    const subscription = isSubscriptionProduct(product);
    const cadence = getProductBillingCadence(product);
    if (subscription && !cadence) {
      return jsonError("Subscription billing interval is not configured", 400);
    }
    const discountPeriods = subscription
      ? discount?.subscriptionPeriods
      : undefined;
    if (discountPeriods && pricing.total <= 0) {
      return jsonError(
        "A limited-period subscription discount must leave a payable amount",
        400
      );
    }
    if (pricing.total === 0 && !(subscription && product.trialDays > 0)) {
      return jsonError("This purchase is free and does not require payment", 400);
    }
    if (
      discountPeriods &&
      discountPeriods > 1 &&
      cadence?.unit === "week"
    ) {
      return jsonError(
        "Stripe supports a one-period discount for weekly subscriptions. Use monthly billing for multi-period discounts.",
        400
      );
    }
    const limitedSubscriptionDiscount =
      subscription &&
      cadence &&
      discountPeriods &&
      pricing.discountAmount > 0
        ? {
            amountOffCents: fullPricing.total - pricing.total,
            duration: discountPeriods === 1 ? ("once" as const) : ("repeating" as const),
            durationInMonths:
              discountPeriods === 1
                ? undefined
                : cadence.unit === "year"
                  ? cadence.count * 12 * discountPeriods
                  : cadence.count * discountPeriods,
          }
        : undefined;
    if (parsed.data.marketingOptIn) {
      await subscribeCheckoutCustomer(
        product.userId,
        parsed.data.customerEmail,
        parsed.data.customerName,
        product.environment
      );
    }
    const order = await createOrder({
      id: uid(),
      userId: product.userId,
      storeId: product.storeId,
      productId: product.id,
      productName: product.name,
      productDescription: product.description,
      productPrice: product.price,
      deliveryContent: product.deliveryContent,
      productFiles: product.productFiles,
      githubRepoOwner: product.githubRepoOwner,
      githubRepoName: product.githubRepoName,
      amount: pricing.total,
      currency: product.currency,
      status: "pending",
      customerEmail: parsed.data.customerEmail,
      customerName: parsed.data.customerName,
      discountCode: discount?.code,
      discountAmount: pricing.discountAmount,
      transactionFeeAmount: pricing.transactionFeeAmount,
      affiliateId: affiliate?.id,
      environment: connection.mode,
      gateway: "stripe",
      createdAt: new Date().toISOString(),
      githubAccessStatus:
        product.githubRepoOwner && product.githubRepoName
          ? "pending"
          : "not_required",
      githubAccessManaged: false,
    });
    const successUrl = await getRuntimeAbsoluteUrl(
      `/api/payments/stripe/complete?orderId=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`,
      request.url
    );
    const cancelUrl = await getRuntimeAbsoluteUrl(
      `/buy/${product.id}?cancelled=1`,
      request.url
    );
    const recurringAmountCents = limitedSubscriptionDiscount
      ? fullPricing.total
      : pricing.total > 0
        ? pricing.total
        : fullPricing.total;
    if (recurringAmountCents <= 0) {
      return jsonError("Subscription price must be greater than zero", 400);
    }
    const session = await createStripeCheckoutSession({
      secretKey: connection.secretKey,
      mode: connection.mode,
      orderId: order.id,
      productName: product.name,
      amountCents: recurringAmountCents,
      currency: product.currency,
      customerEmail: parsed.data.customerEmail,
      successUrl,
      cancelUrl,
      subscription:
        subscription && cadence
          ? {
              interval: toStripeIntervalUnit(cadence.unit),
              intervalCount: cadence.count,
              trialDays: product.trialDays,
              discount: limitedSubscriptionDiscount,
            }
          : undefined,
      metadata: {
        productId: product.id,
        billingType: product.billingType,
        ...(discountPeriods
          ? { discountPeriods: String(discountPeriods) }
          : {}),
      },
    });
    if (!session.url) throw new Error("Stripe did not return a Checkout URL");
    await updateOrder(order.id, { stripeCheckoutSessionId: session.id });
    await notifyInvoiceCreated({
      ...order,
      stripeCheckoutSessionId: session.id,
    });
    return Response.json({ orderId: order.id, checkoutUrl: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start Stripe Checkout";
    console.error("stripe create-session error:", message);
    return jsonError(message, 500);
  }
}
