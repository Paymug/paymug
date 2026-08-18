import { z } from "zod";
import { cookies } from "next/headers";
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
import { getPayPalCredentials } from "@/lib/payment-credentials";
import { notifyInvoiceCreated } from "@/lib/notification-events";
import { createPayPalOrder } from "@/lib/paypal";
import { calculateCheckoutPricing } from "@/lib/product-pricing";
import { getRuntimeAbsoluteUrl } from "@/lib/runtime-env";
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "Invalid input");
    }

    const product = await findProductById(parsed.data.productId);
    if (!product || product.status !== "published") {
      return jsonError("Product not available", 404);
    }
    if (product.billingType === "subscription") {
      return jsonError(
        "This product is a subscription. Use subscription checkout instead.",
        400
      );
    }
    const store = await getStoreById(product.storeId, product.userId);
    if (store?.paymentGateway !== "paypal") {
      return jsonError("PayPal is not enabled for this store", 409);
    }

    const conn = await getPayPalCredentials(
      product.userId,
      product.environment,
      product.storeId
    );
    if (!conn) {
      return jsonError("Seller has not configured PayPal yet", 400);
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
    const affiliateCookie = cookieJar
      .get("paymug_affiliate")
      ?.value.split(":");
    const cookieAffiliateCode =
      affiliateCookieMatchesStore(
        affiliateCookie?.[0],
        product.userId,
        product.storeId
      )
        ? affiliateCookie?.[1]
        : undefined;
    const affiliate = await findAffiliateByCode(
      product.userId,
      parsed.data.affiliateCode || cookieAffiliateCode,
      product.storeId,
      product.environment
    );
    const pricing = calculateCheckoutPricing(product, discount?.amount);
    if (pricing.total === 0) {
      return jsonError("This purchase is free and does not require payment", 400);
    }

    if (parsed.data.marketingOptIn) {
      await subscribeCheckoutCustomer(
        product.userId,
        parsed.data.customerEmail,
        parsed.data.customerName,
        product.environment
      );
    }

    const orderId = uid();
    const order = await createOrder({
      id: orderId,
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
      environment: conn.mode,
      gateway: "paypal",
      createdAt: new Date().toISOString(),
      githubAccessStatus:
        product.githubRepoOwner && product.githubRepoName
          ? "pending"
          : "not_required",
      githubAccessManaged: false,
    });

    const returnUrl = await getRuntimeAbsoluteUrl(
      `/checkout/success?orderId=${order.id}`,
      req.url
    );
    const cancelUrl = await getRuntimeAbsoluteUrl(
      `/buy/${product.id}?cancelled=1`,
      req.url
    );
    const paypalOrder = await createPayPalOrder({
      clientId: conn.clientId,
      clientSecret: conn.clientSecret,
      mode: conn.mode,
      amountCents: pricing.total,
      currency: product.currency,
      productName: product.name,
      customId: order.id,
      returnUrl,
      cancelUrl,
    });

    await updateOrder(order.id, { paypalOrderId: paypalOrder.id });
    await notifyInvoiceCreated({
      ...order,
      paypalOrderId: paypalOrder.id,
    });

    return Response.json({
      orderId: order.id,
      paypalOrderId: paypalOrder.id,
      clientId: conn.clientId,
      mode: conn.mode,
      amount: pricing.total,
      discountAmount: pricing.discountAmount,
      transactionFeeAmount: pricing.transactionFeeAmount,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create order";
    console.error("create-order error:", message);
    return jsonError(message, 500);
  }
}
